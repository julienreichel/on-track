<template>
  <q-card flat class="q-pa-sm q-pl-md">
    <q-card-section horizontal>
      <q-separator vertical color="lightgray" size="5px" />
      <!-- Grey vertical separator -->
      <q-card-section class="q-pa-sm full-width" >
        <q-input
          v-model="userAnswer"
          filled
          :color="getInputColor()"
          :disable="showExplanation"
          @keyup.enter="validateAnswer"
        >
          <template #append>
            <q-btn
              v-if="!showExplanation"
              label="Check"
              @click="validateAnswer"
            />
            <q-icon v-else-if="isCorrect" name="check"  />
            <q-icon v-else name="close" />
          </template>
        </q-input>
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
import { ref } from "vue";

const emit = defineEmits(["answer-selected"]);

const props = defineProps({
  question: { type: Object, required: true },
});

const userAnswer = ref("");
const isCorrect = ref(null);
const showExplanation = ref(false);

const validateAnswer = () => {
  const validAnswer = props.question.answers.some(
    (answer) =>
      answer.text.toLowerCase() ===
        userAnswer.value.toLowerCase() && answer.valid
  );
  isCorrect.value = validAnswer;
  showExplanation.value = true;

  emit("answer-selected", {
    questionId: props.question.id,
    userResponse: userAnswer.value.toLowerCase(),
    isValid: isCorrect.value,
  });
};

const getInputColor = () => {
  if (isCorrect.value === null) return "primary";
  return isCorrect.value ? "positive" : "negative";
};
</script>
