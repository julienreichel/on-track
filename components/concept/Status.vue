<template>
  <div>
    <q-linear-progress
      v-if="conceptAction"
      :value="progress / review"
      :color="color"
      size="25px"
    >
    <div class="absolute-full flex flex-center">
        <q-badge color="white" text-color="primary" :label="`${progressPercent} %`" />
      </div>
    </q-linear-progress>
  </div>
</template>

<script setup>
const props = defineProps({
  conceptAction: {
    type: [Object, null],
    required: true,
  },
  concept: {
    type: Object,
    required: true,
  },
});


const progress = computed(() => {
  if (!props.conceptAction) return 0;

  const { theory, examples, usedFlashCards, answeredQuestions, actionTimestamps, objectives } =
    props.conceptAction;
  let progress = 0;

  if (objectives?.length) progress += 10;
  if (theory) progress += 15;
  if (examples) progress += 15;
  if (usedFlashCards) {
    progress += Math.min(5, usedFlashCards.length) * 5;
  }
  if (answeredQuestions && actionTimestamps && actionTimestamps.some((as) => as.actionType === "quiz" || as.actionType === "pre-quiz")) {
    progress += answeredQuestions.filter((q) => q.isValid).length * 5;
  }
  return progress;
});

const nbFlashCards = computed(() => Math.min(props.concept.flashCards?.length, 5));
const nbQuestion = computed(() => Math.min(props.concept.questions?.length || 0, 10));
// A sucess, means, all the theory and examples are read
// the flashcards have been used and the 10 questions have been answered with at leat 80% of success
const success = computed(() => 10 + 15 + 15 + 5 * nbFlashCards.value + 5 * nbQuestion.value * 0.7);
// A review is a success + all falshcard + 3 quiz of 5 question with at least 4 correct
const review = computed(() => Math.max(10 + 15 + 15 + 5 * nbFlashCards.value + 5 * nbQuestion.value * 2.5 * 0.7, progress.value));

const finished = computed(() => progress.value >= success.value);
const color = computed(() => (finished.value ? "primary" : "secondary"));
const progressPercent = computed(() => (Math.floor(progress.value / success.value * 20) * 5));

const emit = defineEmits(["finished"]);

watch(finished, (finished) => {
  if (finished) {
    emit("finished", progressPercent);
  }
}, { immediate: true });
</script>

<style scoped>

</style>
