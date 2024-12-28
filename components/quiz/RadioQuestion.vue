<template>
  <q-card flat class="q-pa-sm q-pl-md">
    <q-card-section horizontal>
      <q-separator vertical color="lightgray" size="5px" />
      <!-- Grey vertical separator -->
      <q-card-section class="q-pa-sm">
        <q-list dense padding>
          <q-item v-for="(answer, idx) in question.answers" :key="idx">
            <q-item-section>
              <q-radio
                v-model="selected"
                :label="answer.text"
                :val="answer"
                :disable="showExplanation"
                :color="getAnswerColor(answer)"
                @update:model-value="onAnswerSelected"
              />
            </q-item-section>
          </q-item>
        </q-list>
        <q-item v-if="showExplanation" class="q-pl-sm">
          <rich-text-renderer :markdown-content="question.explanations" />
        </q-item>
      </q-card-section>
    </q-card-section>
  </q-card>
</template>

<script setup>
const props = defineProps({
  question: { type: Object, required: true },
});

const emit = defineEmits(["answer-selected"]);

const selected = ref(null);
const showExplanation = ref(false);

const onAnswerSelected = () => {
  showExplanation.value = true;
  emit("answer-selected", {
    questionId: props.question.id,
    userResponse: props.question.answers.indexOf(selected.value).toString(),
    isValid:selected.value.valid,
  });
};

const getAnswerColor = (answer) => {
  if (!showExplanation.value) return "primary";
  return answer.valid ? "positive" : "negative";
};
</script>
