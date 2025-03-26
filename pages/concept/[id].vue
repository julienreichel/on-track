<template>
  <div v-if="concept" class="q-px-none q-py-sm q-gutter-sm">
    <!-- Existing concept header/flow/etc. -->
    <competency-list
      class="bg-primary q-px-sm text-white"
      :competencies="[concept.competency]"
    />

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
      class="q-px-sm"
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
      <p>Learning is composed of several steps: theory, examples, flashcards, quiz. </p>
      <p>You can run them in any order, but you need to complete them all to finish the concept.</p>
    </action-card>

    <!-- STEPPER -->
    <q-stepper 
      v-if="!showIntro"
      v-model="activeTab" 
      flat 
      header-nav
      active-icon="school" 
      :contracted="$q.screen.lt.md"
      >
      <!-- 2. THEORY -->
      <q-step
        v-if="teacherMode || concept.theory"
        name="theory"
        title="Theory"
        icon="article"
        :done="hasDoneTheory"
      >
        <div class="q-py-sm q-px-none">
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

      <!-- 3. EXAMPLES -->
      <q-step
        v-if="concept.examples"
        name="examples"
        title="Examples"
        icon="ballot"
        :done="hasDoneExamples"
      >
        <div class="q-py-sm q-px-none">
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

      <!-- 4. FLASHCARDS -->
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

      <!-- 5. QUIZ -->
      <q-step
        v-if="teacherMode || concept.questions?.length"
        name="quiz"
        title="Quiz"
        icon="help_center"
        :done="hasDoneQuiz"
      >
        <div class="q-py-sm q-px-none">
          <div v-if="concept.questions?.length">
            <question-list
              v-if="teacherMode"
              v-model="concept.questions"
              :concept="concept"
            />
            <quiz-runner
              v-else
              :questions="concept.questions"
              :max="quizSize"
              adaptative
              :initial-level="quizLevel"
              @finished="updateQuestionsFinished"
              @results="updateQuestionsResults"
              @progress="updateQuestionsProgress"
            />
          </div>
          <div v-else-if="teacherMode">
            <q-btn @click="generateQuizData()">Generate</q-btn>
          </div>
        </div>
      </q-step>

      <!-- 7. NEXT STEPS -->
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
const { loading } = useQuasar();

const { getCurrentUser } = useNuxtApp().$Amplify.Auth;

const activeTab = ref("objectives");
const concept = ref(null);
const conceptAction = ref(null);
const otherUndoneConcepts = ref([]);
const otherCompetencies = ref([]);
const teacherMode = inject("teacherMode");

const showIntro = ref(true);

onMounted(async () => {
  try {
    const conceptId = route.params.id;
    concept.value = await conceptService.get(conceptId);
    
    const { userId, username } = await getCurrentUser();

    if(!concept.value.followUps.length){
      // let's check if there are some other concept in the competency that have not been done yet
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
        // nothing left to be done in this competency, so lets propose followups
        otherCompetencies.value = competency.followUps.map((f) => f.competency);
      }
    }
    // Check or create ConceptAction
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
      } else {
        conceptAction.value = await conceptActionService.create({
          conceptId,
          inProgress: true,
        });
      }
    } else {
      showIntro.value = false;
    }
    activeTab.value = nextTab.value;
  } catch (error) {
    console.error("Failed to fetch concept or user action:", error);
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
  return"quiz";
})
const hasDoneTheory = computed(() => conceptAction.value?.theory);
const hasDoneExamples = computed(() => conceptAction.value?.examples);
const hasDoneFlashcards = computed(
  () =>
    conceptAction.value?.usedFlashCards?.length ===
    concept.value.flashCards?.length
);
const hasDoneQuiz = computed(() => !conceptAction.value?.inProgress);
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
</script>
