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
          <div>Estimated Level: {{ result.final_level }}</div>
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
}

const submitAnswers = async () => {
  const questionIdx = previousQuestions.value.length - 3;
  previousQuestions.value[questionIdx].userAnswer = userAnswers.value[0];
  previousQuestions.value[questionIdx + 1].userAnswer = userAnswers.value[1];
  previousQuestions.value[questionIdx + 2].userAnswer = userAnswers.value[2];

  loading.show();
  const response = await openAI.queryLanguageEval(
    currentLevel.value,
    previousQuestions.value,
    language.value,
  );
  loading.hide();
  console.log('Evaluation Response:', response);
  evaluations.value = response.evaluations || [];

  const lastEvaluations = evaluations.value.slice(-3);
  const failCount = lastEvaluations.filter(e => e.quality === 'fail').length; 
  const basicCount = lastEvaluations.filter(e => e.quality === 'basic').length; 
  const positiveCount = lastEvaluations.filter(e => 
    ['average', 'good', 'advanced'].includes(e.quality)
  ).length;

  console.log('Evaluations:', failCount, basicCount, positiveCount);
  if (failCount > 0 || basicCount > 2) {
    currentLevel.value = progression[Math.max(0, progression.indexOf(currentLevel.value) - 1)];
  } else if (positiveCount >= 2) {
    currentLevel.value = progression[Math.min(5, progression.indexOf(currentLevel.value) + 1)];
  }

  if (step.value < 5) {
    step.value++;
    await generateQuestions();
  } else {
    finalEvaluation();
  }
}

function finalEvaluation() {
  const scores = { fail: 0, basic: 1, average: 2, good: 3, advanced: 4 };
  const levelStats = {
    A1: { totalScore: 0, count: 0 },
    A2: { totalScore: 0, count: 0 },
    B1: { totalScore: 0, count: 0 },
    B2: { totalScore: 0, count: 0 },
    C1: { totalScore: 0, count: 0 },
    C2: { totalScore: 0, count: 0 }
  };

  // accelertor:
  // any level 'average' of more at a level is also counted for in the lower levels
  // any fail level is counted for in the upper levels
  evaluations.value.forEach(e => {
    levelStats[e.level].totalScore += scores[e.quality] || 0;
    levelStats[e.level].count += 1;
    if (e.quality === 'fail') {
      for (let i = progression.indexOf(e.level) + 1; i < progression.length; i++) {
        levelStats[progression[i]].totalScore += scores[e.quality];
        levelStats[progression[i]].count += 1;
      }
    }
    if (e.quality === 'average' || e.quality === 'good' || e.quality === 'advanced') {
      for (let i = progression.indexOf(e.level) - 1; i >= 0; i--) {
        levelStats[progression[i]].totalScore += scores[e.quality];
        levelStats[progression[i]].count += 1;
      }
    }
  });


  let bestLevel = null;

  for (const level in levelStats) {
    const stat = levelStats[level];
    const avg = stat.count ? stat.totalScore / stat.count : 0;

    // all questions must be at least average
    if (avg >= 2) {
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
