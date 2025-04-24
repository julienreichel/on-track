<template>
  <div v-if="conceptAction">
    <div class="row q-pa-sm q-col-gutter-md">
      <div
        v-for="(stat, index) in statistics"
        :key="index"
        class="col-12 col-sm-6 col-md-3"
      >
        <q-card class="full-height">
          <q-card-section class="text-center">
            <p class="text-h6 text-uppercase text-bold">{{ stat.label }}</p>
            <concept-status
              v-if="stat.status"
              class="q-mt-lg"
              :concept-action="conceptAction"
              :show-progress-only="stat.showProgressOnly"
              :show-review-only="stat.showReviewOnly"/>
            <p v-else class="text-h4 text-center">{{ stat.value }}</p>
          </q-card-section>
        </q-card>
      </div>
    </div>
    <div v-if="mergedLevelStatistics.length" class="text-h3 text-center q-mt-md">
      Level Statistics
    </div>
    <div class="row q-pa-sm q-col-gutter-md">
      <div
        v-for="(level, index) in mergedLevelStatistics"
        :key="index"
        class="col-12 col-sm-6 col-md-3"
      >
        <q-card class="full-height">
          <q-card-section class="text-center">
            <p class="text-h6 text-uppercase text-bold">{{ levelLabels[level.level] }}</p>
            <p class="text-h4">{{ level.successPercentage }}%</p>
            <p class="text-h5">{{ level.averageTime }}</p>
          </q-card-section>
        </q-card>
      </div>
    </div>
    <div v-if="testReviews.length" class="text-h3 text-center q-mt-md">
      Test Reviews
    </div>
    <div class="row q-pa-sm q-col-gutter-md">
      <div
        v-for="(review, index) in testReviews"
        :key="index"
        class="col-12 col-sm-6 col-md-3"
      >
        <q-card class="full-height">
          <q-card-section class="text-center">
            <p class="text-h6 text-uppercase text-bold">
              {{ testType[review.type] }}
            </p>
            <p class="text-h4">{{ toHumanDuration(review.duration) }}</p>
            <p class="text-h6">{{ review.success }}/{{ review.questions }}</p>
            <p class="text-h6">{{ review.time.toLocaleDateString(undefined, { month: "short", day: "numeric" }) }}</p>
          </q-card-section>
        </q-card>
      </div>
    </div>
    
  </div>

  <div v-else>
    <q-card>
      <q-card-section>
        <p class="text-body1 text-center">Loading concept data...</p>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup>
const { getCurrentUser } = useNuxtApp().$Amplify.Auth;

const route = useRoute();
const conceptActionService = useConceptAction();
const conceptAction = ref(null);

const toHumanDuration = (duration) => {
  duration = duration / 1000;
  const hours = Math.floor(duration / 3600 );
  const minutes = Math.floor((duration % 3600)/ 60);
  const seconds = Math.floor((duration % 60) );
  let text = "";
  if (hours > 0) {
    text += `${hours}h `;
  }
  if (minutes > 0) {
    text += `${minutes}min `;
  }
  if (seconds > 0) {
    text += `${seconds}s`;
  }
  if (text.length > 0) {
    return text;
  }
  return "N/A";
};
onMounted(async () => {
  try {
    const conceptId = route.params.id;

    const { userId, username } = await getCurrentUser();
    const actions = await conceptActionService.listFormated({
      conceptId,
      userId,
      username,
    });

    if (!actions || !actions[0]) {
      console.error("No concept action found for the given ID.");
      return;
    }

    conceptAction.value = actions[0];
  } catch (error) {
    console.error("Failed to fetch concept action:", error);
  }
});

const startedAt = computed(() => {
  const startAction = conceptAction.value?.actionTimestamps.find(
    (a) => a.actionType === "started",
  );
  return startAction ? startAction.createdAt.toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "N/A";
});

const isFinished = computed(() => {
  return (
    conceptAction.value?.actionTimestamps.some(
      (a) => a.actionType === "finished",
    ) || false
  );
});

const isReviewed = computed(() => {
  return (
    conceptAction.value?.answeredQuestions.filter(
      (q) => q.isValid,
    ).length >= 20
  );
});

const maxConceptDuration = 60 * 60 * 1000; // 60 minutes
const maxQuizDuration = 10 * 60 * 1000; // 10 minutes

const numberOfRun = computed(() => {
  const startAction = conceptAction.value?.actionTimestamps.find(
    (a) => a.actionType === "started",
  );
  const finishAction = conceptAction.value?.actionTimestamps.find(
    (a) => a.actionType === "finished",
  );
  if (!startAction || !finishAction) {
    return 0;
  }
  const startTime = startAction?.createdAt || 0;
  const finishTime = finishAction?.createdAt || new Date();
  if (finishTime - startTime < maxConceptDuration) {
    return 1;
  }
  // calculate the number of runs
  // find all actionTimestamps between startAction and finishAction of type page
  const pageActions = conceptAction.value?.actionTimestamps.filter(
    (a) =>
      a.actionType === "page" &&
      a.createdAt > startAction.createdAt &&
      a.createdAt < finishAction.createdAt,
  );
  if (pageActions.length) {
    return pageActions.length + 1;
  }
  if (startAction && finishAction) {
    return 2;
  }
  return 0;
});

const totalDuration = computed(() => {
  const startAction = conceptAction.value?.actionTimestamps.find(
    (a) => a.actionType === "started",
  );
  const finishAction = conceptAction.value?.actionTimestamps.find(
    (a) => a.actionType === "finished",
  );
  if (startAction && finishAction) {
    const duration = finishAction.createdAt - startAction.createdAt;
    return duration;
  }
  return "N/A";
});

const testReviewCount = computed(() => {
  return (
    conceptAction.value?.actionTimestamps.filter(
      (a) => a.actionType === "quiz" || a.actionType === "review",
    ).length || 0
  );
});

const testReviews = computed(() => {
  const testReviewActions = conceptAction.value?.actionTimestamps.filter(
    (a) =>
      a.actionType === "quiz" ||
      a.actionType === "review" ||
      a.actionType === "loaded",
  );
  const durations = [];
  let startTime = 0;
  for (let i = 0; i < testReviewActions.length; i++) {
    const type = testReviewActions[i].actionType;

    const endTime = testReviewActions[i].createdAt;
    const questions =
      conceptAction.value?.answeredQuestions.filter(
        (q) => q.createdAt > startTime && q.createdAt <= endTime,
      ) || [];
    if (endTime - startTime < maxQuizDuration && questions.length) {
      const duration = endTime - startTime;
      durations.push({
        type,
        time: testReviewActions[i].createdAt,
        duration,
        questions: questions.length,
        success: questions.filter((q) => q.isValid).length,
      });
      startTime = endTime;
      continue;
    }

    // maybe we are missing the loaded time
    for (let j = 0; j < questions.length; j++) {
      startTime = questions[j].createdAt;
      if (endTime - startTime < maxQuizDuration) {
        const duration = endTime - startTime;
        durations.push({
          type,
          time: testReviewActions[i].createdAt,
          duration,
          questions: questions.length - j,
          success: questions.filter((q, idx) => idx >= j && q.isValid).length,
        });
        break;
      } else {
        if (durations.length > 0 && durations[durations.length - 1].type === "dropped") {
          durations[durations.length - 1].questions++;
          durations[durations.length - 1].success += questions[j].isValid ? 1 : 0;
        } else {
          durations.push({
            type: "dropped",
            time: startTime,
            questions: 1,
            success: questions[j].isValid ? 1: 0,
          });
        }
      }
    }
    startTime = endTime;
  }
  const startedQuestions =
    conceptAction.value?.answeredQuestions.filter(
      (q) => q.createdAt > startTime,
    ) || [];
  if (startedQuestions.length > 0) {
    durations.push({
      type: "dropped",
      time: startedQuestions[0].createdAt,
      questions: startedQuestions.length,
      success: startedQuestions.filter((q) => q.isValid).length,
    });
  }
  return durations;
});

const statistics = computed(() => [
  { label: "Started", value: startedAt.value },
  { label: "Finished", value: isFinished.value ? "Yes" : "No", status: true, showProgressOnly: true },
  { label: "Run", value: numberOfRun.value },
  { label: "Duration", value: toHumanDuration(totalDuration.value) },
  { label: "Reviewed", value: isReviewed.value ? "Yes" : "No", status: true, showReviewOnly: true },
  { label: "Tests", value: testReviewCount.value },
]);

const testType = {
  quiz: "Quiz",
  review: "Review",
  dropped: "(Dropped)",
  loaded: "(Dropped)",
};

const levelLabels = {
  novice: "Novice",
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
  expert: "Expert",
};

const averageQuizTimeByLevel = computed(() => {
  const levels = {
    novice: { totalTime: 0, count: 0 },
    beginner: { totalTime: 0, count: 0 },
    intermediate: { totalTime: 0, count: 0 },
    advanced: { totalTime: 0, count: 0 },
  };

  const questions = conceptAction.value?.answeredQuestions;
  for (let i = 1; i < questions.length; i++) {
    const prevQuestion = questions[i - 1];
    const currentQuestion = questions[i];
    const timeDiff = currentQuestion.createdAt - prevQuestion.createdAt;

    if (timeDiff <= maxQuizDuration && levels[currentQuestion.level]) {
      levels[currentQuestion.level].totalTime += timeDiff;
      levels[currentQuestion.level].count += 1;
    }
  }

  return Object.keys(levels).map((level) => ({
    level,
    averageTime: levels[level].count
      ? toHumanDuration(levels[level].totalTime / levels[level].count)
      : "N/A",
  }));
});

const testReviewSuccessDistribution = computed(() => {
  const levels = {};
  conceptAction.value?.answeredQuestions.forEach((q) => {
    if (!levels[q.level]) {
      levels[q.level] = { success: 0, total: 0 };
    }
    levels[q.level].success += q.isValid ? 1 : 0;
    levels[q.level].total += 1;
  });
  return Object.keys(levels).map((level) => ({
    level,
    successPercentage: ((levels[level].success / levels[level].total) * 100).toFixed(0),
  }));
});

const mergedLevelStatistics = computed(() => {
  return testReviewSuccessDistribution.value.map((successData) => {
    const timeData = averageQuizTimeByLevel.value.find((time) => time.level === successData.level);
    return {
      level: successData.level,
      successPercentage: successData.successPercentage,
      averageTime: timeData ? timeData.averageTime : "N/A",
    };
  });
});
</script>
