<template>
  <div>
    <q-linear-progress
      v-if="conceptAction"
      :value="progress / success"
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

  const { theory, examples, usedFlashCards, answeredQuestions } =
    props.conceptAction;
  let progress = 0;

  if (theory) progress += 12.5;
  if (examples) progress += 12.5;
  if (usedFlashCards) {
    progress += usedFlashCards
      .map((f) => (f.isOk ? 10 : 5))
      .reduce((a, b) => a + b, 0);
  }
  if (answeredQuestions) {
    progress += answeredQuestions.filter((q) => q.isValid).length * 5;
  }
  return progress;
});

const nbFlashCards = computed(() => props.concept.flashCards.length || 0 );
const nbQuestion = computed(() => Math.min(props.concept.questions.length || 0, 10));
// A sucess, means, all the theory and examples are read
// the flashcards have been used and the 10 questions have been answered with at leat 80% of success
const success = ref(Math.max(12.5 + 12.5 + 5 * nbFlashCards.value + 5 * nbQuestion.value * 0.8, progress.value));

const finished = computed(() => progress.value >= success.value);
const color = computed(() => (finished.value ? "primary" : "secondary"));
const progressPercent = computed(() => ((progress.value / success.value) * 100).toFixed(0));

const emit = defineEmits(["finished"]);

watch(finished, (finished) => {
  if (finished) {
    console.log("finished");
    emit("finished", progressPercent);
  }
}, { immediate: true });
</script>

<style scoped>

</style>
