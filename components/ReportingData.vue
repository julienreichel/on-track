<template>
  <div v-if="conceptActions && conceptActions.length">
    <StatisticsCard :concept-actions="conceptActions" />
    <level-statistics-card title="Pre Quiz" :concept-actions="preQuiz" />
    <level-statistics-card title="Training" :concept-actions="conceptActions" />    
    <level-statistics-card title="Final Quiz" :concept-actions="finalQuiz" />
    <div class="row q-pa-md q-col-gutter-md">
      <ActionTimeline class="col" :concept-actions="conceptActions" />
      <ActionSummary class="col" :concept-actions="conceptActions" />
    </div>
  </div>

  <div v-else>
    <q-card>
      <q-card-section>
        <p class="text-body1 text-center">Loading concept data...</p>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup>

const conceptActionService = useConceptAction();
const competencyActionService = useCompetencyAction();
const conceptActions = ref(null);
const competencyActions = ref(null);

const props = defineProps({
  subjectId: {
    type: String,
    default: undefined,
  },
  competencyId: {
    type: String,
    default: undefined,
  },
  userId: {
    type: String,
    default: undefined,
  },
  username: {
    type: String,
    default: undefined,
  },
});

onMounted(async () => {
  try {
    conceptActions.value = await conceptActionService.listFormated(props);
    competencyActions.value = await competencyActionService.listFormated(props);
  } catch (error) {
    console.error("Failed to fetch concept action:", error);
  }
});


const quizes = computed(() => {
  return competencyActions.value?.map((a) => competencyActionService.getQuizzes(a)).flat() || [];
});

const preQuiz = computed(() => {
  return quizes.value.filter((quiz) => quiz.type === "pre-quiz");
});
const finalQuiz = computed(() => {
  return quizes.value.filter((quiz) => quiz.type === "final-quiz");
});
</script>
