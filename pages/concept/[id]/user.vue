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
            <p class="text-h4 text-center">{{ stat.value }}</p>
          </q-card-section>
        </q-card>
      </div>
    </div>
    <div class="text-h3 text-center q-mt-md">
      Test Reviews
    </div>
    <div class="row q-pa-sm q-col-gutter-md">
      <div
        v-for="(review, index) in testReviews"
        :key="index"
        class="col-12 col-sm-6 col-md-3"
      >
        <q-card class="full-height">
          <q-card-section>
            <p class="text-h4 text-center">
              {{ testType[review.type] }}
            </p>
            <p class="text-left">
              <span v-if="review.type !== 'dropped'">
                <p>{{ toHumanDuration(review.duration) }}</p>
                <p>{{ review.success }}/{{ review.questions }} questions</p>
                <p>{{ review.time.toLocaleDateString(undefined, { month: "short", day: "numeric" }) }}</p>
              </span>
              <span v-else>{{ review.questions }} questions</span>
            </p>
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
  const minutes = Math.floor(duration / 60000);
  const seconds = Math.floor((duration % 60000) / 1000);
  if (minutes > 0) {
    return `${minutes}min ${seconds}s`;
  }
  if (seconds > 0) {
    return `${seconds}s`;
  }
  return "N/A";
};
onMounted(async () => {
  try {
    const conceptId = route.params.id;

    const { userId, username } = await getCurrentUser();
    const actions = await conceptActionService.list({
      conceptId,
      userId,
      username,
    });

    if (!actions) {
      console.error("No concept action found for the given ID.");
      return;
    }
    const action = actions[0];
    if (!action.actionTimestamps) {
      action.actionTimestamps = [];
    }
    action.actionTimestamps.forEach((a) => {
      a.createdAt = new Date(a.createdAt);
    });
    action.actionTimestamps.sort((a, b) => a.createdAt - b.createdAt);

    if (!action.answeredQuestions) {
      action.answeredQuestions = [];
    }
    action.answeredQuestions.forEach((q) => {
      q.createdAt = new Date(q.createdAt);
    });
    action.answeredQuestions.sort((a, b) => a.createdAt - b.createdAt);

    conceptAction.value = action;
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

const maxConceptDuration = 60 * 60 * 1000; // 10 minutes
const maxQuizDuration = 10 * 60 * 1000; // 10 minutes

const isSingleRun = computed(() => {
  const startAction = conceptAction.value?.actionTimestamps.find(
    (a) => a.actionType === "started",
  );
  const finishAction = conceptAction.value?.actionTimestamps.find(
    (a) => a.actionType === "finished",
  );
  return (
    startAction &&
    finishAction &&
    finishAction.createdAt - startAction.createdAt < maxConceptDuration
  );
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
    if (testReviewActions[i].actionType === "loaded") {
      startTime = testReviewActions[i].createdAt;
      continue;
    }

    const endTime = testReviewActions[i].createdAt;
    const questions =
      conceptAction.value?.answeredQuestions.filter(
        (q) => q.createdAt > startTime && q.createdAt <= endTime,
      ) || [];
    if (endTime - startTime < maxQuizDuration) {
      const duration = endTime - startTime;
      durations.push({
        type: testReviewActions[i].actionType,
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
          type: testReviewActions[i].actionType,
          time: testReviewActions[i].createdAt,
          duration,
          questions: questions.length - j,
          success: questions.filter((q, idx) => idx >= j && q.isValid).length,
        });
        break;
      } else {
        if (durations.length > 0 && durations[durations.length - 1].type === "dropped") {
          durations[durations.length - 1].questions++;
        } else {
          durations.push({
            type: "dropped",
            time: startTime,
            questions: 1,
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
    });
  }
  return durations;
});

const statistics = computed(() => [
  { label: "Started", value: startedAt.value },
  { label: "Finished", value: isFinished.value ? "Yes" : "No" },
  { label: "Single run", value: isSingleRun.value ? "Yes" : "No" },
  { label: "Total duration", value: toHumanDuration(totalDuration.value) },
  { label: "Reviewed", value: isReviewed.value ? "Yes" : "No" },
  { label: "Tests", value: testReviewCount.value },
]);

const testType = {
  quiz: "Quiz",
  review: "Review",
  dropped: "(Dropped)",
};
</script>
