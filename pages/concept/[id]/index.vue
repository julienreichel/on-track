<template>
  <div v-if="concept" class="q-px-none q-py-sm q-gutter-sm">
    <concept-header
      :concept="concept"
      :teacher-mode="teacherMode"
      :show-intro="showIntro"
      @update-concept="updateConcept"
    />

    <concept-status
      :concept="concept"
      :concept-action="conceptAction"
      class="q-pb-sm"
      @finished="conceptDone"
    />
    <action-card
      v-if="showIntro"
      title="Ready to learn?"
      label="Start learning"
      @activated="showIntro = false"
    >
      <p>You’ll go through:</p>
      <ul>
        <li>
          <q-icon name="article" class="text-primary" /> Theory – Understand the
          core ideas
        </li>
        <li>
          <q-icon name="ballot" class="text-primary" /> Examples – See it in
          action
        </li>
        <li>
          <q-icon name="check_box" class="text-primary" /> Flashcards – Practice
          key points
        </li>
        <li>
          <q-icon name="help_center" class="text-primary" /> Quiz – Test your
          knowledge
        </li>
      </ul>
      <p>
        You can explore them in any order, but complete them all to finish the
        concept!
      </p>
    </action-card>

    <q-page-sticky
      v-if="$q.screen.gt.sm && !showIntro"
      position="top-right"
      style="z-index: 1000"
      :offset="[6, 12]"
    >
      <q-btn
        dense
        round
        :icon="notesVisible ? 'playlist_remove' : 'notes'"
        class="toggle-notes-btn"
        @click="toggleNotes"
      />
      <q-btn
        dense
        round
        :icon="chatVisible ? 'chat_bubble' : 'chat_bubble_outline'"
        class="toggle-chat-btn q-ml-xs"
        @click="toggleChat"
      />
    </q-page-sticky>

    <q-splitter
      v-if="!showIntro"
      v-model="splitterModel"
      :limits="[50, 100]"
      :horizontal="$q.screen.lt.md || !panelVisible"
      class="notes-splitter"
    >
      <template #before>
        <concept-stepper
          :concept="concept"
          :concept-action="conceptAction"
          :teacher-mode="teacherMode"
          :other-undone-concepts="otherUndoneConcepts"
          :other-competencies="otherCompetencies"
          @read="updateRead"
        />
      </template>

      <template #after>
        <div v-if="panelVisible" class="notes-panel q-pa-xs col column" style="height: 100%;">
          <concept-notes
            v-if="notesVisible"
            :notes="conceptAction?.notes"
            :placeholder="notePlaceholder"
            @update="updateNotes"
          />
          <concept-chat
            v-if="chatVisible"
            v-model="newPost"
            :posts="concept.posts"
            :loading="aiLoading"
            @submit="submitPost"
          />
        </div>
      </template>
    </q-splitter>
  </div>

  <div v-else>
    <p>Loading concept data...</p>
  </div>
</template>

<script setup>
const route = useRoute();
const conceptService = useConcept();
const conceptActionService = useConceptAction();
const competencyService = useCompetency();
const { notify } = useQuasar();
const { getCurrentUser } = useNuxtApp().$Amplify.Auth;

const concept = ref(null);
const conceptAction = ref(null);
const otherUndoneConcepts = ref([]);
const otherCompetencies = ref([]);
const teacherMode = inject("teacherMode");
const showIntro = ref(true);

const splitterModel = ref(100);
const notesVisible = ref(false);
const chatVisible = ref(false);
const notePlaceholder = ref("*Notes...*");
const newPost = ref("");

// Panel is visible if either notes or chat is enabled
const panelVisible = computed(() => notesVisible.value || chatVisible.value);

const toggleNotes = () => {
  notesVisible.value = !notesVisible.value;
  // If both are off, close the panel
  if (!notesVisible.value && !chatVisible.value) splitterModel.value = 100;
  else splitterModel.value = 80;
};

const toggleChat = () => {
  chatVisible.value = !chatVisible.value;
  // If both are off, close the panel
  if (!notesVisible.value && !chatVisible.value) splitterModel.value = 100;
  else splitterModel.value = 80;
};

watch(splitterModel, (newValue) => {
  // Optionally, auto-hide both if splitter is maximized
  if (newValue >= 99) {
    notesVisible.value = false;
    chatVisible.value = false;
  }
});

onMounted(async () => {
  try {
    const conceptId = route.params.id;
    concept.value = await conceptService.get(conceptId);

    if (concept.value.facts?.length) {
      notePlaceholder.value =
        "*Examples:*\n\n*" + concept.value.facts.join("*\n\n*") + "*";
    }

    const { userId, username } = await getCurrentUser();

    if (!concept.value.followUps.length) {
      const competency = await competencyService.get(
        concept.value.competency.id,
      );
      await Promise.all(
        competency.concepts
          .filter((c) => c.id !== conceptId)
          .map(async (c) => {
            const actions = await conceptActionService.list({
              conceptId: c.id,
              userId,
              username,
            });
            const started = actions[0]?.actionTimestamps?.some(
              (a) => a.actionType === "started",
            );
            if (!started) {
              otherUndoneConcepts.value.push(c);
            }
          }),
      );
      if (!otherUndoneConcepts.value.length) {
        otherCompetencies.value = competency.followUps.map((f) => f.competency);
      }
    }
    if (!teacherMode.value) {
      const actions = await conceptActionService.list({
        conceptId,
        userId,
        username,
      });
      if (actions.length) {
        conceptAction.value = actions[0];
        if (hasDoneSomething.value) {
          showIntro.value = false;
        }
        if (!conceptAction.value.actionTimestamps) {
          conceptAction.value.actionTimestamps = [];
        }
        conceptAction.value.actionTimestamps.push({
          actionType: "page",
          createdAt: new Date().toISOString(),
        });
      } else {
        conceptAction.value = await conceptActionService.create({
          conceptId,
          competencyId: concept.value.competency.id,
          subjectId: concept.value.competency.subject.id,
          inProgress: true,
          actionTimestamps: [
            {
              actionType: "page",
              createdAt: new Date().toISOString(),
            },
          ],
        });
      }
      conceptAction.value.notes ??= "";
    } else {
      showIntro.value = false;
    }
  } catch (error) {
    console.error("Failed to fetch concept or user action:", error);
  }
});


const hasDoneTheory = computed(() => conceptAction.value?.theory);
const hasDoneExamples = computed(() => conceptAction.value?.examples);
const hasDoneFlashcards = computed(
  () =>
    conceptAction.value?.usedFlashCards?.length ===
    concept.value.flashCards?.length,
);
const hasDoneQuiz = computed(
  () => conceptAction.value && !conceptAction.value.inProgress,
);
const hasDoneSomething = computed(
  () =>
    hasDoneTheory.value ||
    hasDoneExamples.value ||
    hasDoneFlashcards.value ||
    hasDoneQuiz.value,
);

const updateRead = async () => {
  console.log("Updating read status");
  if (!chatVisible.value && !conceptAction.value.notes) {
    // Notify the user to take notes and open the notes panel
    notify({
      message: "Great job! Now is a good time to take a few notes.",
    });
    toggleNotes();
  }
};

const updateConcept = async (field, value) => {
  concept.value[field] = value;
  await conceptService.update(concept.value);
};

// Only keep the following for notes/chat input
const updateNotes = async (text) => {
  if (!conceptAction.value) return;
  conceptAction.value.notes = text;
  await conceptActionService.update(conceptAction.value);
};

const conceptDone = async () => {
  if (
    teacherMode.value ||
    !conceptAction.value ||
    !conceptAction.value.inProgress
  ) {
    return;
  }
  conceptAction.value.inProgress = false;
  conceptAction.value.actionTimestamps.push({
    actionType: "finished",
    createdAt: new Date().toISOString(),
  });

  await conceptActionService.update(conceptAction.value);
};

const openAI = useOpenAI();
const aiLoading = ref(false);

const postService = usePost();

const submitPost = async () => {
  if (!newPost.value.trim() || !concept.value?.id) return;
  const userPost = await postService.create({
    content: newPost.value,
    conceptId: concept.value.id,
    competencyId: concept.value.competency?.id,
    subjectId: concept.value.competency?.subject?.id,
    createdAt: new Date().toISOString(),
  });
  if (!concept.value.posts) {
    concept.value.posts = [];
  }
  concept.value.posts.push(userPost);
  newPost.value = "";

  aiLoading.value = true;

  try {
    // Get last 4 messages as context (excluding the new userPost)
    const contextMessages = (concept.value.posts || [])
      .slice(-7, -1)
      .map(p => `${!p.isAIGenerated ? "User" : "AI"}: ${p.content}`)
      .join('\n');

    const aiResponse = await openAI.answerConceptChat({
      question: userPost.content,
      context: contextMessages,
      theory: concept.value.theory || "",
      objectives: concept.value.objectives || [],
      locale: concept.value.locale || "en"
    });

    const postAnswer = await postService.create({
      content: String(aiResponse).trim(),
      conceptId: concept.value.id,
      competencyId: concept.value.competency?.id,
      subjectId: concept.value.competency?.subject?.id,
      createdAt: new Date().toISOString(),
      isAIGenerated: true,
      responseToId: userPost.id,
    });
    concept.value.posts.push(postAnswer);
  } catch (e) {
    console.error("AI response error:", e);
  } finally {
    aiLoading.value = false;
  }
};
</script>

<style>
.concept-runner .q-stepper__step-inner {
  padding: 0px;
  padding-top: 8px;
}
</style>
