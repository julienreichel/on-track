<template>
  <q-card flat class="q-pa-sm q-pl-md">
    <q-card-section horizontal>
      <q-separator vertical color="lightgray" size="5px" />
      <!-- Grey vertical separator -->
      <q-card-section class="q-pa-sm">
        <q-list dense padding>
          <q-item v-for="(answer, idx) in question.answers" :key="idx">
            <q-item-section>
              <q-checkbox
                v-model="selectedAnswers"
                :label="answer.text"
                :val="answer"
                :disable="showExplanation"
                :color="getAnswerColor(answer)"
                @update:model-value="onAnswerSelected"
              />
            </q-item-section>
          </q-item>
        </q-list>
        <q-item v-if="showExplanation">
          <rich-text-renderer
            :markdown-content="question.explanations"
          />
        </q-item>
      </q-card-section>
    </q-card-section>
  </q-card>
</template>

<script setup>
const props = defineProps({
  question: { type: Object, required: true },
});

const selectedAnswers = ref([]);
const showExplanation = ref(false);

const validAnswers = computed(() =>
  props.question.answers.filter((answer) => answer.valid)
);

const onAnswerSelected = () => {
  // Check if all valid answers are selected
  const allValidSelected = validAnswers.value.every((validAnswer) =>
    selectedAnswers.value.includes(validAnswer)
  );

  // Check if any invalid answer is selected
  const anyInvalidSelected = selectedAnswers.value.some(
    (selectedAnswer) => !selectedAnswer.valid
  );

  // Show explanation if either condition is met
  showExplanation.value = allValidSelected || anyInvalidSelected;
};

const getAnswerColor = (answer) => {
  if (!showExplanation.value) return "primary";
  if (selectedAnswers.value.includes(answer)) {
    return answer.valid ? "positive" : "negative";
  }
  return "primary";
};
</script>
