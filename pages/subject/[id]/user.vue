<template>
  <div v-if="conceptActions && conceptActions.length">
    <div class="row q-pa-sm q-col-gutter-md">
      <div
        v-for="(stat, index) in statistics"
        :key="index"
        class="col-12 col-sm-6 col-md-3"
      >
        <q-card class="full-height">
          <q-card-section class="text-center">
            <p class="text-h6 text-uppercase text-bold">{{ stat.label }}</p>
            <p class="text-h4">{{ stat.value }}</p>
          </q-card-section>
        </q-card>
      </div>
    </div>
    <div v-if="levelStatistics.length" class="text-h3 text-center q-mt-md">
      Level Statistics
    </div>
    <div class="row q-pa-sm q-col-gutter-md">
      <div
        v-for="(level, index) in levelStatistics"
        :key="index"
        class="col-12 col-sm-6 col-md-3"
      >
        <q-card class="full-height">
          <q-card-section class="text-center">
            <p class="text-h6 text-uppercase text-bold">{{ levelLabels[level.level] }}</p>
            <p class="text-h4">{{ level.successPercentage }}%</p>
            <p class="text-h5">{{ level.medianTime }}</p>
            <p class="text-h6">[{{ level.p15Time }} - {{ level.p85Time }}]</p>
          </q-card-section>
        </q-card>
      </div>
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
const { getCurrentUser } = useNuxtApp().$Amplify.Auth;

const route = useRoute();
const conceptActionService = useConceptAction();
const conceptActions = ref(null);

onMounted(async () => {
  try {
    const subjectId = route.params.id;
    const { userId, username } = await getCurrentUser();
    const actions = await conceptActionService.listFormated({ subjectId, userId, username });
    conceptActions.value = actions;
  } catch (error) {
    console.error("Failed to fetch concept action:", error);
  }
});

const maxConceptDuration = 60 * 60 * 1000; // 60 minutes
const maxAllowedQuizTime = 2 * 60 * 1000; // 2 minutes

const numberOfConcept = computed(() => conceptActions.value.length);

const percentageFinished = computed(() => {
  const finishedCount = conceptActions.value.filter((action) => action.finishAction).length;
  return ((finishedCount / numberOfConcept.value) * 100).toFixed(0);
});

const percentageReviewed = computed(() => {
  const reviewedCount = conceptActions.value.filter((action) => action.reviewed).length;
  return ((reviewedCount / numberOfConcept.value) * 100).toFixed(0);
});

const singleRunPercentage = computed(() => {
  const singleRunCount = conceptActionService.filterActionsByDuration(
    conceptActions.value,
    maxConceptDuration
  ).length;
  return ((singleRunCount / numberOfConcept.value) * 100).toFixed(0);
});

const averageRunsForMultiple = computed(() => {
  return conceptActionService.computeAverageRuns(conceptActions.value, maxConceptDuration);
});

const averageDurationSingleRun = computed(() => {
  return conceptActionService.computeAverageDuration(conceptActions.value, maxConceptDuration);
});

const averageDurationMultipleRuns = computed(() => {
  return conceptActionService.computeAverageDuration(conceptActions.value, maxConceptDuration, false);
});

const levelStatistics = computed(() => {
  return conceptActionService.computeLevelStatistics(conceptActions.value, maxAllowedQuizTime);
});

const statistics = computed(() => [
  { label: "Finished Concepts", value: percentageFinished.value + "%" },
  { label: "Single Run", value: singleRunPercentage.value + "%" },
  { label: "Reviewed", value: percentageReviewed.value + "%" },
  { label: "Runs (Multiple)", value: averageRunsForMultiple.value },
  { label: "Duration (Single Run)", value: averageDurationSingleRun.value },
  { label: "Duration (Multiple Runs)", value: averageDurationMultipleRuns.value },
]);

const levelLabels = {
  novice: "Novice",
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
  expert: "Expert",
};
</script>
