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
    <div v-if="levelStatistics.length" class="text-h3 text-center q-mt-md">
      Level Statistics
    </div>
    <div class="row q-pa-sm q-col-gutter-md">
      <div
        v-for="(level, index) in levelStatistics"
        :key="index"
        class="col-12 col-sm-6 col-md-3"
      >
        <q-card class="full-height">
          <q-card-section class="text-center">
            <p class="text-h6 text-uppercase text-bold">{{ levelLabels[level.level] }}</p>
            <p class="text-h4">{{ level.successPercentage }}%</p>
            <p class="text-h5">{{ level.medianTime }}</p>
            <p class="text-h6">[{{ level.p15Time }} - {{ level.p85Time }}]</p>
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
            <p class="text-h4">{{ conceptActionService.toHumanDuration(review.duration) }}</p>
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

onMounted(async () => {
  try {
    const conceptId = route.params.id;
    const { userId, username } = await getCurrentUser();
    const actions = await conceptActionService.listFormated({ conceptId, userId, username });

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
  const startAction = conceptAction.value?.startAction;
  return startAction ? startAction.createdAt.toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "N/A";
});

const isFinished = computed(() => {
  return Boolean(conceptAction.value?.finishAction);
});

const isReviewed = computed(() => {
  return conceptAction.value?.reviewed;
});

const maxConceptDuration = 60 * 60 * 1000; // 60 minutes
const maxQuizDuration = 10 * 60 * 1000; // 10 minutes

const numberOfRun = computed(() => {
  const startAction = conceptAction.value?.startAction;
  const finishAction = conceptAction.value?.finishAction;
  if (!startAction || !finishAction) return 0;
  return conceptActionService.filterActionsByDuration([conceptAction.value], maxConceptDuration).length
    ? 1
    : 2;
});

const totalDuration = computed(() => {
  const startAction = conceptAction.value?.startAction;
  const finishAction = conceptAction.value?.finishAction;
  return startAction && finishAction
    ? conceptActionService.calculateDuration(startAction, finishAction)
    : "N/A";
});

const testReviewCount = computed(() => {
  return (
    conceptAction.value?.actionTimestamps.filter(
      (a) => a.actionType === "quiz" || a.actionType === "review"
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

const levelStatistics = computed(() => {
  return conceptActionService.computeLevelStatistics([conceptAction.value], maxQuizDuration);
});

const statistics = computed(() => [
  { label: "Started", value: startedAt.value },
  { label: "Finished", value: isFinished.value ? "Yes" : "No", status: true, showProgressOnly: true },
  { label: "Run", value: numberOfRun.value },
  { label: "Duration", value: conceptActionService.toHumanDuration(totalDuration.value) },
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
</script>
