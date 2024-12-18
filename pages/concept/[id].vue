<template>
  <div v-if="concept" class="q-pa-sm">
    <h1>{{ concept.name }}</h1>
    <rich-text-renderer v-if="concept.introduction" :markdown-content="concept.introduction" />

    <div v-if="concept.objectives?.length">
      <h3>Objectives</h3>
      <objective-list :objectives="concept.objectives" />
    </div>

    <div v-if="concept.theory">
      <h3>Theory</h3>
      <rich-text-renderer :markdown-content="concept.theory" />
    </div>

    <div v-if="concept.examples">
      <h3>Examples</h3>
      <rich-text-renderer :markdown-content="concept.examples" />
    </div>

    <h3>Questions</h3>
    <div v-if="concept.questions">
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

    <div v-if="concept.competency.concepts?.length">
      <h3>Other Concepts</h3>
      <concept-list
        :concepts="concept.competency.concepts.filter((s) => s.id !== concept.id)"
      />
    </div>
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

const randomizedQuestions = computed(() => {
  return [...concept.value.questions].sort(() => Math.random() - 0.5);
});

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
