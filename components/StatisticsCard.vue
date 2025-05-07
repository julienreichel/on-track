<template>
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
</template>

<script setup>
const conceptActionService = useConceptAction();

const props = defineProps({
  conceptActions: {
    type: Array,
    required: true,
  },
});

const maxConceptDuration = 60 * 60 * 1000; // 60 minutes

const numberOfConcept = computed(() => props.conceptActions.length);

const numberOfUsers = computed(() => {
  if (!props.conceptActions || props.conceptActions.length === 0) {
    return 0;
  }
  const uniqueUsers = new Set(props.conceptActions.map((action) => action.owner));
  return uniqueUsers.size;
});

const percentageFinished = computed(() => {
  const finishedCount = props.conceptActions.filter((action) => action.finishAction).length;
  return ((finishedCount / numberOfConcept.value) * 100).toFixed(0);
});

const percentageReviewed = computed(() => {
  const reviewedCount = props.conceptActions.filter((action) => action.reviewed).length;
  return ((reviewedCount / numberOfConcept.value) * 100).toFixed(0);
});

const singleRunPercentage = computed(() => {
  const singleRunCount = conceptActionService.filterActionsByDuration(
    props.conceptActions,
    maxConceptDuration
  ).length;
  return ((singleRunCount / numberOfConcept.value) * 100).toFixed(0);
});

const averageRunsForMultiple = computed(() => {
  return conceptActionService.computeAverageRuns(props.conceptActions, maxConceptDuration);
});

const averageDurationSingleRun = computed(() => {
  return conceptActionService.computeAverageDuration(props.conceptActions, maxConceptDuration);
});

const averageDurationMultipleRuns = computed(() => {
  return conceptActionService.computeAverageDuration(props.conceptActions, maxConceptDuration, false);
});

const statistics = computed(() => [
  { label: "Users", value: numberOfUsers.value },
  { label: "Finished Concepts", value: percentageFinished.value + "%" },
  { label: "Single Run", value: singleRunPercentage.value + "%" },
  { label: "Reviewed", value: percentageReviewed.value + "%" },
  { label: "Runs (Multiple)", value: averageRunsForMultiple.value },
  { label: "Duration (Single Run)", value: averageDurationSingleRun.value },
  { label: "Duration (Multiple Runs)", value: averageDurationMultipleRuns.value },
]);
</script>
