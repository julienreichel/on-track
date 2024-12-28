<template>
  <div v-if="concept" class="q-pa-sm">
    <concept-flow
      :concepts="relatedConcepts"
      :prerequisites="relatedLinks"
      direction="LR"
      :style="{ height: `${height}px`, width: '100%' }"
    />
    <h1>{{ concept.name }}</h1>

    <rich-text-renderer
      v-if="concept.description"
      :markdown-content="concept.description"
    />

    <q-list>
      <q-expansion-item
        v-if="concept.objectives?.length"
        label="Objectives"
        header-class="text-h3"
        group="concept"
        :content-inset-level="0.5"
      >
        <objective-list :objectives="concept.objectives" :default-check="conceptAction?.objectives" @check-objective="updateObjective" />
      </q-expansion-item>

      <q-expansion-item
        v-if="teacherMode || concept.theory"
        label="Theory"
        header-class="text-h3"
        group="concept"
        :content-inset-level="0.5"
        @show="markTheoryAsRead"
      >
        <rich-text-renderer
          v-if="concept.theory"
          :markdown-content="concept.theory"
        />
        <q-btn v-else-if="teacherMode" @click="generateConceptData()"
          >Generate</q-btn
        >
      </q-expansion-item>

      <q-expansion-item
        v-if="concept.examples"
        label="Examples"
        header-class="text-h3"
        group="concept"
        :content-inset-level="0.5"
        @show="markExamplesAsRead"
      >
        <rich-text-renderer :markdown-content="concept.examples" />
      </q-expansion-item>

      <q-expansion-item
        v-if="concept.flashCards?.length"
        label="Flashcards"
        header-class="text-h3"
        group="concept"
      >
        <div class="row q-col-gutter-sm">
          <div
            v-for="flashCard in concept.flashCards"
            :key="flashCard.id"
            class="col"
          >
            <flashcard-view :flash-card="flashCard" @success="(status) => updateFlashCard(flashCard.id, status)"/>
          </div>
        </div>
      </q-expansion-item>

      <q-expansion-item
        v-if="teacherMode || concept.theory"
        label="Questions"
        header-class="text-h3"
        group="concept"
        :content-inset-level="0.5"
      >
        <div v-if="concept.questions?.length">
          <q-btn v-if="teacherMode" @click="showQuizDialog = true">Run</q-btn>
          <question-list :questions="randomizedQuestions" @answer-selected= "updateQuestions"/>
          <quiz-runner-dialog-test
            v-model="showQuizDialog"
            :questions="concept.questions"
            :max="3"
          />
        </div>
        <div v-else-if="teacherMode">
          <q-btn @click="generateQuizData()">Generate</q-btn>
        </div>
      </q-expansion-item>
      <q-expansion-item
        label="Compentency"
        header-class="text-h3"
        :content-inset-level="0.5"
      >
        <div class="row q-col-gutter-sm">
          <competency-list :competencies="[concept.competency]" />
        </div>
      </q-expansion-item>
    </q-list>
  </div>
  <div v-else>
    <p>Loading concept data...</p>
  </div>
</template>

<script setup>
const route = useRoute();
const conceptService = useConcept();
const conceptActionService = useConceptAction();
const { loading } = useQuasar();

const { getCurrentUser } = useNuxtApp().$Amplify.Auth;

const concept = ref(null);
const conceptAction = ref(null);
const showQuizDialog = ref(false);

const teacherMode = inject("teacherMode");

onMounted(async () => {
  try {
    const conceptId = route.params.id;
    concept.value = await conceptService.get(conceptId);

    // Check or create ConceptAction
    if (!teacherMode.value){
      const { userId, username } = await getCurrentUser();
      const actions = await conceptActionService.list({conceptId, userId, username});
      if (actions.length) {
        conceptAction.value = actions[0];
      } else {
        conceptAction.value = await conceptActionService.create({
          conceptId,
          inProgress: true,
          objectives: concept.value.objectives?.map(() => false) || [],
        });
      }
    }
  } catch (error) {
    console.error("Failed to fetch concept or user action:", error);
  }
});

const relatedConcepts = computed(() => {
  const relatedConcepts = [concept.value];
  if (concept.value?.prerequisites) {
    concept.value.prerequisites.forEach((p) =>
      relatedConcepts.push(p.prerequisite)
    );
  }
  if (concept.value?.followUps) {
    concept.value.followUps.forEach((f) => relatedConcepts.push(f.concept));
  }
  return relatedConcepts;
});

const relatedLinks = computed(() => {
  const relatedLinks = [];

  if (concept.value?.prerequisites) {
    concept.value.prerequisites.forEach((p) =>
      relatedLinks.push({
        id: p.prerequisite.id,
        prerequisiteId: p.prerequisite.id,
        conceptId: concept.value.id,
      })
    );
  }
  if (concept.value?.followUps) {
    concept.value.followUps.forEach((f) =>
      relatedLinks.push({
        id: f.concept.id,
        prerequisiteId: concept.value.id,
        conceptId: f.concept.id,
      })
    );
  }
  return relatedLinks;
});

const height = computed(() => {
  const c = concept.value;
  if (!c) return 0;
  return Math.max(c.prerequisites?.length || 0, c.followUps?.length || 0) * 100;
});

const randomizedQuestions = computed(() => {
  return [...concept.value.questions].sort(() => Math.random() - 0.5);
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

const markTheoryAsRead = async () => {
  if (teacherMode.value || !conceptAction.value){
    return;
  }
  if (!conceptAction.value.theory) {
    conceptAction.value.theory = true;
    conceptAction.value = await conceptActionService.update(conceptAction.value);
  }
};

const markExamplesAsRead = async () => {
  if (teacherMode.value || !conceptAction.value){
    return;
  }
  if (!conceptAction.value.examples) {
    conceptAction.value.examples = true;
    conceptAction.value = await conceptActionService.update(conceptAction.value);
  }
};

const updateObjective = async (objectives) => {
  if (teacherMode.value || !conceptAction.value){
    return;
  }
  if (!conceptAction.value.objectives.every(function(v, index) { return v === objectives[index]})) {
    conceptAction.value.objectives = objectives;
    conceptAction.value = await conceptActionService.update(conceptAction.value);
  }
};

const updateFlashCard = async (flashCardId, status) => {
  if (teacherMode.value || !conceptAction.value){
    return;
  }
  if (!conceptAction.value.usedFlashCards) {
    conceptAction.value.usedFlashCards = [];
  }
  let flashCard = conceptAction.value.usedFlashCards.find((f) => f.flashCardId === flashCardId);
  if (flashCard && flashCard.status === status) {
    return;
  }
  if (!flashCard) {
    flashCard = { flashCardId };
    conceptAction.value.usedFlashCards.push(flashCard);
  }
  flashCard.isOk = status;
  conceptAction.value = await conceptActionService.update(conceptAction.value);

};

const updateQuestions = async ({questionId, userResponse, isValid}) => {
  if (teacherMode.value || !conceptAction.value){
    return;
  }
  if (!conceptAction.value.answeredQuestions) {
    conceptAction.value.answeredQuestions = [];
  }
  let answeredQuestion = conceptAction.value.answeredQuestions.find((q) => q.questionId === questionId);
  console.log("answeredQuestion", answeredQuestion, userResponse);
  if (answeredQuestion && answeredQuestion.userResponse === userResponse) {
    return;
  }
  if (!answeredQuestion) {
    answeredQuestion = { questionId };
    conceptAction.value.answeredQuestions.push(answeredQuestion);
  }
  answeredQuestion.userResponse = userResponse;
  answeredQuestion.isValid = isValid;
  conceptAction.value = await conceptActionService.update(conceptAction.value);
};
</script>
