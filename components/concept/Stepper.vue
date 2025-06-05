<template>
  <q-stepper
    v-model="localActiveTab"
    flat
    header-nav
    active-icon="school"
    :contracted="$q.screen.lt.md"
    class="concept-runner"
  >
    <!-- THEORY -->
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
            @finished="() => markAsRead('theory')"
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

    <!-- EXAMPLES -->
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
            @finished="() => markAsRead('examples')"
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

    <!-- FLASHCARDS -->
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
          @finished="() => localActiveTab = 'quiz'"
        />
      </div>
    </q-step>

    <!-- QUIZ -->
    <q-step
      v-if="teacherMode || concept.questions?.length"
      name="quiz"
      title="Quiz"
      icon="help_center"
      :done="hasDoneQuiz"
    >
      <div>
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

    <!-- NEXT STEPS -->
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

<script setup>
const concept = defineModel('concept', { type: Object, default: () => ({}) });
const conceptAction = defineModel('conceptAction', { type: Object, default: () => ({}) });

const props = defineProps({
  activeTab: { type: String, default: 'theory' },
  teacherMode: { type: Boolean, default: false },
  otherUndoneConcepts: { type: Array, default: () => [] },
  otherCompetencies: { type: Array, default: () => [] },
});

const emit = defineEmits(['read']);


const localActiveTab = ref(props.activeTab);

const hasDoneTheory = computed(() => conceptAction.value?.theory);
const hasDoneExamples = computed(() => conceptAction.value?.examples);
const hasDoneFlashcards = computed(
  () =>
    conceptAction.value?.usedFlashCards?.length ===
    concept.value?.flashCards?.length
);
const hasDoneQuiz = computed(() => conceptAction.value && !conceptAction.value.inProgress);

const nextConcepts = computed(() => {
  const nextConcepts = [];
  if (concept.value?.followUps) {
    concept.value.followUps.forEach((f) => nextConcepts.push(f.concept));
  }
  if (!nextConcepts.length && props.otherUndoneConcepts) {
    props.otherUndoneConcepts.forEach((c) => nextConcepts.push(c));
  }
  return nextConcepts;
});

const quizSize = computed(() => (conceptAction.value?.inProgress ? 10 : 5));
const quizLevel = computed(() => conceptAction.value?.inProgress ? "beginner" : "intermediate");

// --- Stepper-specific logic and methods ---
const conceptService = useConcept();
const conceptActionService = useConceptAction();
const { loading } = useQuasar();

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
});

const updateConcept = async (field, value) => {
  concept.value[field] = value;
  await conceptService.update(concept.value);
};

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

const updateFlashCard = async ({ flashCardId, status }) => {
  if (!conceptAction.value) return;
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
    localActiveTab.value = 'quiz';
  }
};

const updateQuestionsFinished = () => {
  if (conceptAction.value?.inProgress) {
    return;
  }
  localActiveTab.value = "nextSteps";
};

const loadedTime = ref(null);

watch(localActiveTab, (newTab) => {
  if (newTab === "quiz") {
    loadedTime.value = new Date();
  }
});

const updateQuestionsProgress = async (questions) => {
  if (!conceptAction.value) {
    return;
  }
  if (loadedTime.value) {
    conceptAction.value.actionTimestamps.push({
      actionType: "loaded",
      createdAt: loadedTime.value.toISOString(),
    });
    loadedTime.value = null;
  }
  return conceptActionService.updateQuestionsProgress(
    questions,
    conceptAction.value
  );
};

const updateQuestionsResults = async () => {
  if (!conceptAction.value) {
    return;
  }
  return conceptActionService.updateQuestionsResults(conceptAction.value);
};

const markAsRead = async (field) => {
  if (!conceptAction.value) {
    return;
  }
  if (!conceptAction.value[field]) {
    conceptAction.value[field] = true;
    await conceptActionService.update(conceptAction.value);
  }
  emit('read', field);
  // Move to next tab
  localActiveTab.value = nextTab.value;
};
</script>
