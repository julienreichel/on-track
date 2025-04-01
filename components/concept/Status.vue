<template>
  <div>
    <q-linear-progress
      v-if="conceptAction"
      :value="progress / success"
      :color="color"
      size="25px"
    >
      <div class="absolute-full flex flex-center">
        <q-badge
          v-if="progressPercent < 100"
          color="white"
          text-color="primary"
          :label="`${progressPercent} %`"
        />
        <div v-else class="row" >
          <q-icon
              v-for="i in 5"
              :key="i"
              color="white"
              size="xs"
              :name="getBatteryIcon(i)"
            />
        </div>
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

const getBatteryIcon = (index) => {
  const correctAnswers =
  props.conceptAction.answeredQuestions?.filter((q) => q.isValid).length || 0;
  const fullBatteries = Math.floor(correctAnswers / 4);
  if (index <= fullBatteries) return "battery_full";
  const remaining = correctAnswers % 4;
  if (index === fullBatteries + 1) {
    if (remaining >= 3) return "battery_6_bar";
    if (remaining >= 2) return "battery_4_bar";
    if (remaining >= 1) return "battery_2_bar";
  }
  return "battery_0_bar";
};

const progress = computed(() => {
  if (!props.conceptAction) return 0;

  const {
    theory,
    examples,
    usedFlashCards,
    answeredQuestions,
    actionTimestamps,
  } = props.conceptAction;
  let progress = 0;

  if (theory) progress += 20;
  if (examples) progress += 20;
  if (usedFlashCards) {
    progress += Math.min(5, usedFlashCards.length) * 5;
  }
  if (
    answeredQuestions &&
    actionTimestamps &&
    actionTimestamps.some(
      (as) => as.actionType === "quiz" || as.actionType === "pre-quiz"
    )
  ) {
    progress += answeredQuestions.filter((q) => q.isValid).length * 5;
  }
  if (progress > success.value) {
    progress = success.value;
  }
  return progress;
});

const nbFlashCards = computed(() =>
  Math.min(props.concept.flashCards?.length || 5, 5)
);
const nbQuestion = computed(() =>
  Math.min(props.concept.questions?.length || 10, 10)
);
// A sucess, means, all the theory and examples are read
// the flashcards have been used and the 10 questions have been answered with at leat 80% of success
const success = computed(
  () => 20 + 20 + 5 * nbFlashCards.value + 5 * nbQuestion.value * 0.7
);

const finished = computed(() => progress.value >= success.value);
const color = computed(() => (finished.value ? "primary" : "secondary"));
const progressPercent = computed(
  () => Math.floor((progress.value / success.value) * 20) * 5
);

const emit = defineEmits(["finished"]);

watch(
  finished,
  (finished) => {
    if (finished) {
      emit("finished", progressPercent);
    }
  },
  { immediate: true }
);
</script>

<style scoped></style>
