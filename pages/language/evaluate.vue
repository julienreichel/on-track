<template>
  <q-page class="q-pa-md">
    <q-card>
      <q-card-section>
        <div class="text-h6">Language Level Full Evaluation</div>
      </q-card-section>

      <q-separator />

      <q-card-section>
        <q-linear-progress :value="step / 6" color="primary" class="q-mb-md" />

        <div v-if="step === 0">
          <q-select
            v-model="initialLevel"
            :options="progression"
            label="Select Initial Level"
            filled
          />
          <q-select
            v-model="language"
            :options="['English', 'Spanish', 'French', 'German', 'Italian']"
            label="Select Language"
            filled
            />
          <q-btn class="q-mt-md" label="Start Test" color="primary" @click="startTest" />
        </div>

        <div v-else-if="step > 0 && step <= 5">
          <div class="text-subtitle1">Step {{ step }}: Answer the Questions</div>
          <div v-for="(question, index) in currentQuestions" :key="index" class="q-mt-md">
            <q-input v-model="userAnswers[index]" :label="question.question" filled type="textarea"/>
          </div>
          <q-btn class="q-mt-md" label="Submit Answers" color="primary" @click="submitAnswers" />
        </div>

        <div v-else-if="step === 6">
          <div class="text-subtitle1">Final Evaluation</div>
          <div>Final Level: {{ result.final_level }}</div>
          <pre>{{ result.details }}</pre>
        </div>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
const openAI = useOpenAI();
const { loading } = useQuasar();

const progression = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const initialLevel = ref('A2');
const currentLevel = ref('A2');
const step = ref(0);
const userAnswers = ref(['', '', '']);
const currentQuestions = ref([]);
const result = ref(null);

const previousQuestions = ref([]);
const language = ref('English');
const evaluations = ref([]);

const startTest = async () => {
  step.value = 1;
  currentLevel.value = initialLevel.value;
  generateQuestions();
}

const generateQuestions = async () => {
  loading.show();
  const response = await openAI.queryLanguageQuiz(
    currentLevel.value,
    previousQuestions.value,
    language.value,
  );
  loading.hide();
  if (!response) {
    console.error('Error fetching questions');
    return;
  }
  console.log('Response:', response);
  currentLevel.value = response.level;
  previousQuestions.value.push(...response.questions);
  currentQuestions.value = response.questions;
  userAnswers.value = ['', '', ''];

  evaluations.value = response.evaluations || [];
}

const submitAnswers = async () => {
  const questionIdx = previousQuestions.value.length - 3;
  previousQuestions.value[questionIdx].userAnswer = userAnswers.value[0];
  previousQuestions.value[questionIdx + 1].userAnswer = userAnswers.value[1];
  previousQuestions.value[questionIdx + 2].userAnswer = userAnswers.value[2];

  if (step.value < 5) {
    step.value++;
    await generateQuestions();
  } else {
    await generateQuestions();
    finalEvaluation();
  }
}

function finalEvaluation() {
  const scores = { fail: 0, basic: 1, normal: 2, good: 3, advanced: 4 };
  const levelStats = {};

  evaluations.value.forEach(e => {
    if (!levelStats[e.level]) {
      levelStats[e.level] = { totalScore: 0, count: 0 };
    }
    levelStats[e.level].totalScore += scores[e.quality] || 0;
    levelStats[e.level].count += 1;
  });

  let bestLevel = null;

  for (const level in levelStats) {
    const stat = levelStats[level];
    const avg = stat.totalScore / stat.count;

    if (avg > 2) {
      bestLevel = level;
    }
  }

  result.value = {
    final_level: bestLevel,
    details: {
      initial_level: initialLevel.value,
      final_level: currentLevel.value,
      level_scores: levelStats
    }
  };

  step.value = 6;
}
</script>

<style scoped>
pre {
  background: #f0f0f0;
  padding: 12px;
  border-radius: 6px;
}
</style>
