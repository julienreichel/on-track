<template>
  <q-list>
    <q-expansion-item
      v-for="(question, index) in questions"
      :key="question.id"
      class="q-pa-none"
      :label="question.text"
      group="questions"
    >
      <q-card>
        <q-card-section>
          <editable-text
            :value="questionsAsText[index]"
            :enable-editing="teacherMode"
            type="textarea"
            class="q-pa-sm"
            use-rich-text
            @update="updateQuestionContent($event, index)"
          />
        </q-card-section>
      </q-card>
    </q-expansion-item>
  </q-list>
</template>

<script setup>
const questionStore = useQuestion();
const teacherMode = inject("teacherMode");

const props = defineProps({
  questions: { type: Array, required: true },
});

// Compute the text representation of each question
const questionsAsText = computed(() =>
  props.questions.map((q) => {
    const answersText = q.answers
      .map((a) => (a.valid ? `- [x] ${a.text}` : `- [ ] ${a.text}`))
      .join("\n");

    return `##### ${q.text}\n[${q.level}]\n${answersText}\n\n${q.explanations}`;
  })
);

const updateQuestionContent = (updatedText, index) => {
  const lines = updatedText.split("\n").map((line) => line.trim()).filter(line => line !== "");

  if (lines.length < 3) return; // Ensure valid format

  const updatedQuestion = { ...props.questions[index] };

  updatedQuestion.text = lines[0].replace("##### ", "").trim();
  updatedQuestion.level = lines[1].replace("[", "").replace("]", "").trim();

  // Extract answers
  const answers = [];
  let explanations = "";
  let inAnswers = true;

  for (let i = 2; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("- [")) {
      const valid = line.startsWith("- [x]");
      const answerText = line.replace(/- \[.\] /, "").trim();
      answers.push({ text: answerText, valid });
    } else {
      inAnswers = false;
    }

    if (!inAnswers) {
      explanations += line + "\n";
    }
  }

  updatedQuestion.answers = answers;
  updatedQuestion.explanations = explanations.trim();

  // Determine question type based on answer validity rules
  const validCount = answers.filter(a => a.valid).length;
  const totalCount = answers.length;

  if (validCount === totalCount) {
    updatedQuestion.type = "word";
  } else if (validCount === 1) {
    updatedQuestion.type = "radio";
  } else {
    updatedQuestion.type = "checkbox";
  }

  questionStore.update(updatedQuestion);
};
</script>
