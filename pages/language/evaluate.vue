<template>
  <q-page class="q-pa-md">
    <q-card>
      <q-card-section>
        <div class="text-h6">Language Level Full Evaluation</div>
      </q-card-section>

      <q-separator />

      <q-card-section>
        <q-linear-progress :value="(step + currentQuestionIndex / currentQuestions.length) / 6" color="primary" class="q-mb-md" />

        <div v-if="step === 0">
          <q-select
            v-model="testScenario"
            :options="['Spoken', 'Written', 'Both']"
            label="Select Test Scenario"
            filled
          />
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
          <q-input 
            v-if="testScenario !== 'Spoken'" 
            v-model="userAnswers[currentQuestionIndex]" 
            :label="currentQuestions[currentQuestionIndex]?.question" 
            filled 
            type="textarea" 
          />
          <q-btn 
            v-if="testScenario === 'Spoken' || testScenario === 'Both'" 
            class="q-mt-md q-mr-sm" 
            label="Repeat" 
            color="secondary" 
            @click="repeatAudio" 
          />
          <q-btn 
            v-if="testScenario === 'Spoken' || testScenario === 'Both'" 
            class="q-mt-md q-mr-sm" 
            :label="isRecording ? 'Stop Record' : (isPreparing ? 'Preparing...' : 'Start Record')" 
            :disable="isPreparing" 
            color="secondary" 
            @click="toggleMicrophone" 
          />
          <q-btn class="q-mt-md" label="Next Question" color="primary" @click="nextQuestion" />          
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
import { createClient } from "@deepgram/sdk";

const openAI = useOpenAI();
const { loading } = useQuasar();


const progression = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const initialLevel = ref('A2');
const currentLevel = ref('A2');
const step = ref(0);
const userAnswers = ref(['', '', '']);
const currentQuestions = ref([ { question: 'Generating...'}]);
const result = ref(null);

const previousQuestions = ref([]);
const language = ref('English');
const evaluations = ref([]);
const currentQuestionIndex = ref(0);
const testScenario = ref('Both');
const isRecording = ref(false);

const isPreparingCount = ref(0);
const isPreparing = computed(() => isPreparingCount.value > 0);

const incrementPreparing = () => {
  isPreparingCount.value++;
};

const decrementPreparing = () => {
  if (isPreparingCount.value > 0) {
    isPreparingCount.value--;
  }
};

const languageToLocale = {
  English: "en",
  Spanish: "es",
  French: "fr",
  German: "de",
  Italian: "it",
};

let lastAudio = null;
let microphone = null;
let socket = null;

const playAudio = async (text, locale, repeat) => {
  try {
    if (!repeat || !lastAudio) {
      const graphqlQuery = useGraphqlQuery("");
      const base64Audio = await graphqlQuery.query("convertTextToSpeech", { text, locale });
      if (base64Audio) {
        lastAudio = new Blob([Uint8Array.from(atob(base64Audio), c => c.charCodeAt(0))], { type: "audio/mp3" });
      } else {
        console.error("Error generating audio: No audio data returned");
        return;
      }
    }

    const audioUrl = URL.createObjectURL(lastAudio);
    const audio = new Audio(audioUrl);

    audio.play();
  } catch (error) {
    console.error("Error generating audio:", error);
  }
};

const repeatAudio = async () => {
  const questionText = currentQuestions.value[currentQuestionIndex.value]?.question || "No question available";
  const locale = languageToLocale[language.value] || "en";
  await playAudio(questionText, locale, true);
};

const toggleMicrophone = async () => {
  if (!isRecording.value) {
    incrementPreparing();
    if (!socket) {
      await initializeDeepgramSocket();
    }
    microphone = await getMicrophone();
    await openMicrophone(microphone);
    isRecording.value = true;
    decrementPreparing();
  } else {
    incrementPreparing();
    await closeMicrophone(microphone);
    microphone = null;
    isRecording.value = false;
    decrementPreparing();
  }
};

const initializeDeepgramSocket = async () => {
  if (socket) {
    console.log("Socket already initialized");
    return;
  }
  incrementPreparing();

  const locale = languageToLocale[language.value] || "en"; // Convert language to locale
  const graphqlQuery = useGraphqlQuery("");
  const apiKey = await graphqlQuery.query("deepGramAPIKey");
  const deepgramClient = createClient(apiKey);
  socket = deepgramClient.listen.live({ model: "nova-2", language: locale, smart_format: true });

  socket.on("open", () => {
    console.log("Connected to Deepgram WebSocket");
    decrementPreparing();
  });
  socket.on("Results", (data) => {
    const transcript = data.channel.alternatives[0]?.transcript || "";
    if (transcript) {
      userAnswers.value[currentQuestionIndex.value] += transcript.trim() + " ";
    }
  });
  socket.on("error", (e) => {
    console.error("Deepgram Error:", e);
    decrementPreparing();
  });
  socket.on("close", async () => {
    console.log("Deepgram WebSocket closed");
    socket = null;
    decrementPreparing();

    // Stop recording automatically if the WebSocket is closed
    if (isRecording.value) {
      await closeMicrophone(microphone);
      microphone = null;
      isRecording.value = false;
    }
  });
};

const getMicrophone = async () => {
  const userMedia = await navigator.mediaDevices.getUserMedia({ audio: true });
  return new MediaRecorder(userMedia);
};

const openMicrophone = async (microphone) => {
  microphone.start(500);
  microphone.ondataavailable = (e) => socket?.send(e.data);
};

const closeMicrophone = async (microphone) => {
  microphone.stop();
};

const startTest = async () => {
  step.value = 1;
  currentLevel.value = initialLevel.value;
  console.log('Selected Test Scenario:', testScenario.value); // Debugging log
  await generateQuestions();

  if (testScenario.value === "Spoken" || testScenario.value === "Both") {
    const questionText = currentQuestions.value[currentQuestionIndex.value]?.question || "No question available";
    const locale = languageToLocale[language.value] || "en"; // Convert language to locale
    await playAudio(questionText, locale);
    await initializeDeepgramSocket(); // Open socket when the question is shown
  }
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

const nextQuestion = async () => {
  if (microphone) {
    await closeMicrophone(microphone);
    microphone = null;
    isRecording.value = false;
  }
  if (socket) {
    incrementPreparing();
    socket.requestClose(); // Close the socket when moving to the next question
    socket = null;
  }

  const questionIdx = previousQuestions.value.length - currentQuestions.value.length + currentQuestionIndex.value;
  previousQuestions.value[questionIdx].userAnswer = userAnswers.value[currentQuestionIndex.value];

  let enableAudio = testScenario.value === "Spoken" || testScenario.value === "Both";
  if (currentQuestionIndex.value < currentQuestions.value.length - 1) {
    currentQuestionIndex.value++;
  } else {        
    await submitAnswers();
    currentQuestionIndex.value = 0;

    if (step.value < 5) {
      step.value++;
      await generateQuestions();
    } else {
      finalEvaluation();
      enableAudio = false;
    }
  }

  if (enableAudio) {
    const questionText = currentQuestions.value[currentQuestionIndex.value]?.question || "No question available";
    const locale = languageToLocale[language.value] || "en"; // Convert language to locale
    await playAudio(questionText, locale);
  }
};

const submitAnswers = async () => {
  const questionIdx = previousQuestions.value.length - 3;
  previousQuestions.value[questionIdx].userAnswer = userAnswers.value[0];
  previousQuestions.value[questionIdx + 1].userAnswer = userAnswers.value[1];
  previousQuestions.value[questionIdx + 2].userAnswer = userAnswers.value[2];

  loading.show();
  const response = await openAI.queryLanguageEval(
    currentLevel.value,
    previousQuestions.value.slice(-3),
    language.value,
  );
  loading.hide();
  console.log('Evaluation Response:', response);
  if (response?.evaluations){
    evaluations.value.push(...response.evaluations);
  }

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
