<template>
  <div v-if="concept" class="q-px-none q-py-sm q-gutter-sm">
    <q-breadcrumbs class="q-px-sm q-pt-sm text-primary">
      <q-breadcrumbs-el
        label="Subjects"
        to="/subjects"
        class="gt-sm"
      />
      <q-breadcrumbs-el
        :label="concept.competency?.subject?.name"
        :to="`/subject/${concept.competency?.subject?.id}`"
        class="gt-sm"
      />
      <q-breadcrumbs-el
        :label="concept.competency?.name"
        :to="`/competency/${concept.competency?.id}`"
      />
    </q-breadcrumbs>

    <editable-text
      :value="concept.name"
      :enable-editing="teacherMode"
      class="text-h3 q-px-sm"
      @update="(text) => updateConcept('name', text)"
    />
    <editable-text
      v-if="showIntro || teacherMode"
      :value="concept.description"
      :enable-editing="teacherMode"
      type="textarea"
      class="q-px-md"
      use-rich-text
      @update="(text) => updateConcept('description', text)"
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
        <li><q-icon name="article" class="text-primary"/> Theory – Understand the core ideas</li>
        <li><q-icon name="ballot" class="text-primary"/> Examples – See it in action</li>
        <li><q-icon name="check_box" class="text-primary"/> Flashcards – Practice key points</li>
        <li><q-icon name="help_center" class="text-primary"/> Quiz – Test your knowledge</li>
      </ul>
      <p>You can explore them in any order, but complete them all to finish the concept!</p>
    </action-card>

    <!-- Button to toggle notes visibility -->
    <q-page-sticky v-if="$q.screen.gt.sm && !showIntro" position="top-right" style="z-index:1000" :offset="[6, 12]">      
      <q-btn
        dense
        round
        :icon="hiddendSplitter ? 'notes' : 'playlist_remove'"
        class="toggle-notes-btn"
        @click="toggleNotes"
      />
  </q-page-sticky>

    <!-- Splitter for q-stepper and notes -->
    <q-splitter
      v-if="!showIntro"
      v-model="splitterModel"
      :limits="[50, 100]"
      :horizontal="$q.screen.lt.md || !!hiddendSplitter"
      class="notes-splitter"
    >
      <template #before>
        <q-stepper 
          v-model="activeTab" 
          flat 
          header-nav
          active-icon="school" 
          :contracted="$q.screen.lt.md"
          class="concept-runner"
        >
          <q-step
            v-if="teacherMode || concept.theory"
            name="theory"
            title="Theory"
            icon="article"
            :done="hasDoneTheory"
          >
            <div>
              <div v-if="!teacherMode && concept.theory">
                <concept-runner
                  :markdown-content="concept.theory"
                  @finished="markAsRead('theory')"
                />
              </div>
              <editable-text
                v-if="teacherMode && concept.theory"
                :value="concept.theory"
                :enable-editing="teacherMode"
                type="textarea"
                class="q-pa-sm"
                use-rich-text
                @update="(text) => updateConcept('theory', text)"
              />
              <q-btn v-else-if="teacherMode" @click="generateConceptData()">
                Generate
              </q-btn>
            </div>
          </q-step>

          <q-step
            v-if="concept.examples"
            name="examples"
            title="Examples"
            icon="ballot"
            :done="hasDoneExamples"
          >
            <div>
              <div v-if="!teacherMode && concept.examples">
                <concept-runner
                  :markdown-content="concept.examples"
                  @finished="markAsRead('examples')"
                />
              </div>
              <editable-text
                v-if="teacherMode && concept.examples"
                :value="concept.examples"
                :enable-editing="teacherMode"
                type="textarea"
                class="q-pa-sm"
                use-rich-text
                @update="(text) => updateConcept('examples', text)"
              />
            </div>
          </q-step>

          <q-step
            v-if="concept.flashCards?.length"
            name="flashcards"
            title="Flashcards"
            icon="check_box"
            :done="hasDoneFlashcards"
          >
            <flashcard-list
              v-if="teacherMode"
              v-model="concept.flashCards"
              :concept="concept"
            />
            <div v-else>
              <flashcard-runner
                :flash-cards="concept.flashCards"
                @updated="updateFlashCard"
                @finished="activeTab = 'quiz'"
              />
            </div>
          </q-step>

          <q-step
            v-if="teacherMode || concept.questions?.length"
            name="quiz"
            title="Quiz"
            icon="help_center"
            :done="hasDoneQuiz"
          >
            <div >
              <div v-if="concept.questions?.length">
                <question-list
                  v-if="teacherMode"
                  v-model="concept.questions"
                  :concept="concept"
                />
                <quiz-runner
                  v-else
                  :questions="concept.questions"
                  :past-questions="conceptAction?.answeredQuestions"
                  :max="quizSize"
                  adaptative
                  :initial-level="quizLevel"
                  @finished="updateQuestionsFinished"
                  @results="updateQuestionsResults"
                  @progress="updateQuestionsProgress"
                />
                <div v-if="teacherMode" class="q-pa-sm q-gutter-sm">
                  <q-btn @click="generateQuizData()">Generate all</q-btn>
                  <q-btn @click="generateQuizData(1)">Generate novice</q-btn>
                  <q-btn @click="generateQuizData(2)">Generate beginner</q-btn>
                  <q-btn @click="generateQuizData(3)">Generate intermediate</q-btn>
                  <q-btn @click="generateQuizData(4)">Generate advanced</q-btn>
                </div>
              </div>
            </div>
          </q-step>

          <q-step
            name="nextSteps"
            title="Next steps"
            icon="exit_to_app"
          >
            <div class="q-pa-sm">
              <concept-cards v-if="nextConcepts.length" :concepts="nextConcepts" />
              <competency-cards v-else :competencies="otherCompetencies" />
            </div>
          </q-step>
        </q-stepper>
      </template>

      <template #after>
        <div v-if="!hiddendSplitter" class="notes-panel q-pa-xs">
          <div class="text-caption">Click to add or edit notes</div>
          <editable-text
            :value="conceptAction?.notes"
            :enable-editing="true"
            :place-holder="notePlaceholder"
            type="textarea"
            class="q-pa-sm"
            use-rich-text
            @update="updateNotes"
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
const { loading, notify } = useQuasar();

const { getCurrentUser } = useNuxtApp().$Amplify.Auth;

const activeTab = ref("theory");
const concept = ref(null);
const conceptAction = ref(null);
const otherUndoneConcepts = ref([]);
const otherCompetencies = ref([]);
const teacherMode = inject("teacherMode");

const showIntro = ref(true);

const splitterModel = ref(100); // Adjust the percentage for the q-stepper width
const hiddendSplitter = ref(70); // Start with splitter hidden
const notePlaceholder = ref("*Notes...*");
const toggleNotes = () => {
  if (hiddendSplitter.value) {
    splitterModel.value = Math.min(80, hiddendSplitter.value);
    hiddendSplitter.value = false;
  } else {
    hiddendSplitter.value = splitterModel.value; // Hide the notes panel
    splitterModel.value = 100; // Hide the notes panel
  }
};
watch(splitterModel, (newValue) => {
  if (newValue >= 90) {
    hiddendSplitter.value = splitterModel.value; // Hide the notes panel
  } 
});

onMounted(async () => {
  try {
    const conceptId = route.params.id;
    concept.value = await conceptService.get(conceptId);

    if (concept.value.facts?.length) {
      notePlaceholder.value = "*Examples:*\n\n*" + concept.value.facts.join("*\n\n*") + "*";
    }
  
    const { userId, username } = await getCurrentUser();

    if(!concept.value.followUps.length){
      const competency = await competencyService.get(concept.value.competency.id);
      await Promise.all(
        competency.concepts.filter((c) => c.id !== conceptId).map(async (c) => {
          const actions = await conceptActionService.list({
            conceptId: c.id,
            userId,
            username,
          });
          const started = actions[0]?.actionTimestamps?.some(
            (a) => a.actionType === "started"
          );
          if (!started) {
            otherUndoneConcepts.value.push(c);
          }
        })
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
    activeTab.value = nextTab.value;
  } catch (error) {
    console.error("Failed to fetch concept or user action:", error);
  }
});

let loadedTime = null;
watch(activeTab, (newTab) => {
  if (newTab === "quiz" ) {
    loadedTime = new Date();
  }
});

const nextTab = computed(() => {
  if (conceptAction.value?.inProgress) {
    if (!hasDoneTheory.value) {
      return "theory";
    } else if (!hasDoneExamples.value) {
      return "examples";
    } else if (!hasDoneFlashcards.value) {
      return "flashcards";
    } 
  }
  return "quiz";
})
const hasDoneTheory = computed(() => conceptAction.value?.theory);
const hasDoneExamples = computed(() => conceptAction.value?.examples);
const hasDoneFlashcards = computed(
  () =>
    conceptAction.value?.usedFlashCards?.length ===
    concept.value.flashCards?.length
);
const hasDoneQuiz = computed(() => conceptAction.value && !conceptAction.value.inProgress);
const hasDoneSomething = computed(() => hasDoneTheory.value || hasDoneExamples.value || hasDoneFlashcards.value || hasDoneQuiz.value);

const nextConcepts = computed(() => {
  const nextConcepts = [];
  if (concept.value?.followUps) {
    concept.value.followUps.forEach((f) => nextConcepts.push(f.concept));
  }
  if (!nextConcepts.length) {
    otherUndoneConcepts.value.forEach((c) => nextConcepts.push(c));
  }
  return nextConcepts;
});


const generateConceptData = async () => {
  loading.show();

  await conceptService.createWithAI(concept.value);

  loading.hide();
};

const generateQuizData = async (level) => {
  loading.show();
  if (level) {
    await conceptService.addQuizWithAI(concept.value, level);
  } else {
    await Promise.all(
      [1, 2, 3, 4].map((l) => conceptService.addQuizWithAI(concept.value, l))
    );
  }
  loading.hide();
};

const updateStarted = () => {
  if (teacherMode.value || !conceptAction.value) {
    return false;
  }
  return conceptActionService.updateStarted(conceptAction.value);
};

const markAsRead = async (field) => {
  if (teacherMode.value || !conceptAction.value) {
    return;
  }

  let save = updateStarted();
  if (!conceptAction.value[field]) {
    conceptAction.value[field] = true;
    save = true;
  }

  if (hiddendSplitter.value && !conceptAction.value.notes) {
    // Notify the user to take notes and open the notes panel
    notify({
      message: "Great job! Now is a good time to take a few notes.",
    });
    toggleNotes();
  }

  if (save) {
    await conceptActionService.update(conceptAction.value);
  }

  activeTab.value = nextTab.value;
};

const updateFlashCard = async ({ flashCardId, status }) => {
  if (teacherMode.value || !conceptAction.value) {
    return;
  }
  updateStarted();

  if (!conceptAction.value.usedFlashCards) {
    conceptAction.value.usedFlashCards = [];
  }
  let flashCard = conceptAction.value.usedFlashCards.find(
    (f) => f.flashCardId === flashCardId
  );
  if (flashCard && flashCard.status === status) {
    return;
  }
  let triggerOpenQuiz = false;
  if (!flashCard) {
    flashCard = { flashCardId };
    conceptAction.value.usedFlashCards.push(flashCard);
    if (
      conceptAction.value.usedFlashCards.length ===
      concept.value.flashCards.length
    ) {
      triggerOpenQuiz = true;
    }
  }
  flashCard.isOk = status;
  await conceptActionService.update(conceptAction.value);

  if (triggerOpenQuiz) {
    activeTab.value = nextTab.value;
  }
};

const updateQuestionsFinished = () => {
  if (conceptAction.value?.inProgress) {
    return;
  }
  activeTab.value = "nextSteps";
};

const updateQuestionsProgress = async (questions) => {
  if (teacherMode.value || !conceptAction.value) {
    return;
  }
  if (loadedTime){
    conceptAction.value.actionTimestamps.push({
      actionType: "loaded",
      createdAt: loadedTime.toISOString(),
    });
    loadedTime = null;
  }
  return conceptActionService.updateQuestionsProgress(
    questions,
    conceptAction.value
  );
};
const updateQuestionsResults = async () => {
  if (teacherMode.value || !conceptAction.value) {
    return;
  }
  return conceptActionService.updateQuestionsResults(conceptAction.value);
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
const quizSize = computed(() => (conceptAction.value?.inProgress ? 10 : 5));
const quizLevel = computed(() => conceptAction.value?.inProgress ? "beginner" : "intermediate");

const updateConcept = async (field, value) => {
  concept.value[field] = value;
  await conceptService.update(concept.value);
};

const updateNotes = async (text) => {
  if (!conceptAction.value) return;
  conceptAction.value.notes = text;
  await conceptActionService.update(conceptAction.value);
};
</script>

<style>
.concept-runner .q-stepper__step-inner {
  padding: 0px;
  padding-top: 8px;
}

</style>