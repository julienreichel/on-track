<template>
  <div v-if="concept" class="q-pa-sm">

    <concept-flow
      :concepts="relatedConcepts"
      :prerequisites="relatedLinks"
      direction="LR"
      :style="{height: `${height}px`, width: '100%' }"
    />
    <h1>{{ concept.name }}</h1>

    <rich-text-renderer v-if="concept.description" :markdown-content="concept.description" />

    <div v-if="concept.objectives?.length">
      <h3>Objectives</h3>
      <objective-list :objectives="concept.objectives" />
    </div>

    <div >
      <h3>Theory</h3>
      <rich-text-renderer v-if="concept.theory" :markdown-content="concept.theory" />
      <q-btn v-else @click="generateConceptData()">Generate</q-btn>
    </div>

    <div v-if="concept.examples">
      <h3>Examples</h3>
      <rich-text-renderer :markdown-content="concept.examples" />
    </div>
    <div v-if="concept.flashCards?.length">
      <h3>Flashcards</h3>
      <div class="row q-col-gutter-sm">
        <div v-for="flashCard in concept.flashCards" :key="flashCard.id" class="col">
          <flashcard-view :flash-card="flashCard" />
        </div>
      </div>
    </div>
    <h3>Questions</h3>
    <div v-if="concept.questions?.length">
      <q-btn @click="showQuizDialog = true">Run</q-btn>
      <question-list :questions="randomizedQuestions" />
      <quiz-runner-dialog-test
          v-model="showQuizDialog"
          :questions="concept.questions"
          :max="3"
       />
    </div>
    <div v-else>
      <q-btn @click="generateQuizData()">Generate</q-btn>
    </div>

    <h3>Compentency</h3>
    <competency-list :competencies="[concept.competency]" />

  </div>
  <div v-else>
    <p>Loading concept data...</p>
  </div>
</template>

<script setup>
const route = useRoute();
const conceptService = useConcept();
const { loading } = useQuasar();

const concept = ref(null);
const showQuizDialog = ref(false);

onMounted(async () => {
  try {
    const conceptId = route.params.id;
    concept.value = await conceptService.get(conceptId);
  } catch (error) {
    console.error("Failed to fetch concept:", error);
  }
});

const relatedConcepts = computed(() => {
  const relatedConcepts = [concept.value];
  if (concept.value?.prerequisites){
    concept.value.prerequisites.forEach((p) => relatedConcepts.push(p.prerequisite));
  }
  if (concept.value?.followUps){
    concept.value.followUps.forEach((f) => relatedConcepts.push(f.concept));
  }
  return relatedConcepts;
});

const relatedLinks = computed(() => {
  const relatedLinks = [];

  if (concept.value?.prerequisites){
    concept.value.prerequisites.forEach((p) => relatedLinks.push({ id: p.prerequisite.id, prerequisiteId: p.prerequisite.id, conceptId: concept.value.id}));
  }
  if (concept.value?.followUps){
    concept.value.followUps.forEach((f) => relatedLinks.push({ id: f.concept.id, prerequisiteId: concept.value.id, conceptId: f.concept.id}));
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

  await conceptService.createWithAI( concept.value );

  loading.hide();
}

const generateQuizData = async (level) => {
  loading.show();
  if (level) {
    await conceptService.addQuizWithAI(concept.value, level);
  } else {
    await Promise.all([1, 2, 3, 4].map(l => conceptService.addQuizWithAI(concept.value, l)));
  }
  await conceptService.update(concept.value);
  loading.hide();
};
</script>
