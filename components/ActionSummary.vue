<template>
  <div>
    <div class="text-h3 text-center">Progress Summary</div>
    <div class="row">
      <div class="col-1">Quiz</div>
      <div class="col">Histogram</div>
      <div class="col">Finished</div>
      </div>
    <div v-for="(data, sum) in progressSummary" :key="sum" class="row">
      <div class="col-1">{{ data.sum }} </div>
      <q-linear-progress
        :value="data.max / sumOfMax"
        size="lg"
        color="primary"
        class="col"
        track-color="grey-3"
      />
      <q-linear-progress
        :value="data.count / data.max"
        size="lg"
        color="primary"
        class="col"
        track-color="grey-3"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  conceptActions: {
    type: Array,
    required: true,
  },
});

const actionsSummary = computed(() => {
  return props.conceptActions.map((action) => {
    const quizCount = action.actionTimestamps.filter((t) => t.actionType === "quiz").length;
    const reviewCount = action.actionTimestamps.filter((t) => t.actionType === "review").length;
    const correctAnswers = action.answeredQuestions.filter((q) => q.isValid).length;

    return {
      id: action.id,
      quizCount,
      reviewCount,
      correctAnswers,
    };
  });
});

const progressSummary = computed(() => {
  const summary = {};
  actionsSummary.value.forEach((action) => {
    const sum = action.quizCount + action.reviewCount;
    if (sum < 1) return;
    if (!summary[sum]) {
      summary[sum] = { count: 0, max: 0, sum };
    }
    if (action.correctAnswers > 20) {      
      summary[sum].count += 1;
    }
    summary[sum].max += 1;
  });
  return summary;
});

const sumOfMax = computed(() => {
  return Object.values(progressSummary.value).reduce((acc, data) => acc + data.max, 0);
});
</script>
