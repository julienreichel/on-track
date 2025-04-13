<template>
  <q-list>
    <q-expansion-item
      v-for="(question, index) in sortedQuestions"
      :key="question.id"
      class="q-pa-none"
      :label="question.text"
      :icon="levelIconMap[question.level]"
      group="questions"
    >
      <q-card>
        <q-card-section class="q-py-none">
          <editable-text
            :value="questionsAsText[index]"
            :enable-editing="teacherMode"
            type="textarea"
            class="q-pa-sm"
            use-rich-text
            @update="updateQuestionContent($event, index)"
          />
        </q-card-section>
        <q-card-actions>
          <q-space />
          <q-btn
            v-if="teacherMode"
            icon="delete"
            @click="removeQuestion(question)"
          />
        </q-card-actions>
      </q-card>
    </q-expansion-item>
    <q-item class="q-pa-sm">
      <q-item-section>
        <div>
          <q-btn
            v-if="teacherMode"
            label="Add Question"
            @click="addQuestion"
          />
        </div>
      </q-item-section>
    </q-item>
  </q-list>
</template>

<script setup>
const questionStore = useQuestion();
const teacherMode = inject("teacherMode");

const questions = defineModel({ type: Array, required: true });
const props = defineProps({
  concept: { type: Object, required: true },
});

const sortedQuestions = computed(() =>
  [...questions.value].sort((a, b) => {
    const levelOrder = ["novice", "beginner", "intermediate", "advanced", "expert"];
    return levelOrder.indexOf(a.level) - levelOrder.indexOf(b.level);
  })
);
const questionsAsText = computed(() =>
  sortedQuestions.value.map((q) => {
    const answersText = q.answers
      .map((a) => (a.valid ? `- [x] ${a.text}` : `- [ ] ${a.text}`))
      .join("\n");

    return `##### ${q.text}\n[${q.level}]\n${answersText}\n\n${q.explanations}`;
  })
);

const levelIconMap = {
  novice: "signal_cellular_alt_1_bar",
  beginner: "signal_cellular_alt_2_bar",
  intermediate: "signal_cellular_alt",
  advanced: "signal_cellular_4_bar",
  expert: "signal_cellular_4_bar",
};

const updateQuestionContent = (updatedText, index) => {
  const levels = ["novice", "beginner", "intermediate", "advanced", "expert"];

  const lines = updatedText.split("\n").map((line) => line.trim()).filter(line => line !== "");

  if (lines.length < 3) return; // Ensure valid format

  const updatedQuestion = { ...sortedQuestions.value[index] };

  updatedQuestion.text = lines[0].replace("##### ", "").trim();
  updatedQuestion.level = lines[1].replace("[", "").replace("]", "").trim();

  if (levels.indexOf(updatedQuestion.level) === -1) {
    updatedQuestion.level = "novice";
  }
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

const removeQuestion = (question) => {
  questionStore.delete(question.id);
  questions.value = questions.value.filter((q) => q.id !== question.id);
};

const addQuestion = () => {
  const newQuestion = {
    text: "New Question",
    level: "easy",
    answers: [
      { text: "Answer 1", valid: false },
      { text: "Answer 2", valid: false },
    ],
    explanations: "Explanation goes here.",
    type: "radio",
    conceptId: props.concept.id
  };

  questionStore.create(newQuestion);
  questions.value.push(newQuestion);
};
</script>
