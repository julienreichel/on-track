<template>
  <div v-if="conceptActions && conceptActions.length">
    <div class="row q-pa-sm q-col-gutter-md">
      <div
        v-for="(stat, index) in statistics"
        :key="index"
        class="col-12 col-sm-6 col-md-3"
      >
        <q-card class="full-height">
          <q-card-section class="text-center">
            <p class="text-h6 text-uppercase text-bold">{{ stat.label }}</p>
            <p class="text-h4">{{ stat.value }}</p>
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

const route = useRoute();
const conceptActionService = useConceptAction();
const conceptActions = ref(null);

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

const calculateDuration = (startAction, finishAction) => {
  if (!startAction || !finishAction) {
    return 0;
  }
  const startTime = startAction?.createdAt || 0;
  const finishTime = finishAction?.createdAt || new Date();
  return finishTime - startTime;
};

const filterActionsByDuration = (actions, maxDuration, isLessThan = true) => {
  return actions.filter((action) => {
    const duration = calculateDuration(action.startAction, action.finishAction);
    return duration !==0 && (isLessThan ? duration < maxDuration : duration >= maxDuration);
  });
};

const computeAverageDuration = (actions, maxDuration, isLessThan = true) => {
  const filteredActions = filterActionsByDuration(actions, maxDuration, isLessThan);
  const durations = filteredActions.map((action) => {
    return calculateDuration(action.startAction, action.finishAction);
  });
  const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length || 0;
  return toHumanDuration(avg);
};

const computeAverageRuns = (actions, maxDuration) => {
  const multipleRunActions = filterActionsByDuration(actions, maxDuration, false);
  const totalRuns = multipleRunActions.reduce((sum, action) => {
    if (!action.startAction || !action.finishAction) {
      return 0;
    }
    const pageActions = action.actionTimestamps.filter(
      (a) =>
        a.actionType === "page" &&
        a.createdAt > action.startAction.createdAt &&
        a.createdAt < action.finishAction?.createdAt
    );
    return sum + (pageActions.length ? pageActions.length + 1 : 2);
  }, 0);
  return (totalRuns / multipleRunActions.length).toFixed(1);
};

onMounted(async () => {
  try {
    const conceptId = route.params.id;

    const actions = await conceptActionService.list({
      conceptId
    });
    actions.forEach((action) => {
      if (!action.actionTimestamps) {
        action.actionTimestamps = [];
      }
      action.actionTimestamps.forEach((a) => {
        a.createdAt = new Date(a.createdAt);
      });
      action.actionTimestamps.sort((a, b) => a.createdAt - b.createdAt);

      action.startAction = action.actionTimestamps.find((a) => a.actionType === "started");
      action.finishAction = action.actionTimestamps.find((a) => a.actionType === "finished");

      if (!action.answeredQuestions) {
        action.answeredQuestions = [];
      }
      action.answeredQuestions.forEach((q) => {
        q.createdAt = new Date(q.createdAt);
      });
      action.answeredQuestions.sort((a, b) => a.createdAt - b.createdAt);
    });

    conceptActions.value = actions;
  } catch (error) {
    console.error("Failed to fetch concept action:", error);
  }
});

const maxConceptDuration = 60 * 60 * 1000; // 60 minutes
const maxAllowedQuizTime = 2 * 60 * 1000; // 2 minutes

const numberOfUsers = computed(() => conceptActions.value.length);

const percentageFinished = computed(() => {
  const finishedCount = conceptActions.value.filter((action) =>
    action.actionTimestamps.some((a) => a.actionType === "finished")
  ).length;
  return ((finishedCount / numberOfUsers.value) * 100).toFixed(0) ;
});

const percentageReviewed = computed(() => {
  const reviewedCount = conceptActions.value.filter((action) =>
    action.answeredQuestions.filter((q) => q.isValid).length >= 20
  ).length;
  return ((reviewedCount / numberOfUsers.value) * 100).toFixed(0) ;
});

const testReviewSuccessDistribution = computed(() => {
  const levels = {};
  conceptActions.value.forEach((action) => {
    action.answeredQuestions.forEach((q) => {
      if (!levels[q.level]) {
        levels[q.level] = { success: 0, total: 0 };
      }
      levels[q.level].success += q.isValid ? 1 : 0;
      levels[q.level].total += 1;
    });
  });
  return Object.keys(levels).map((level) => ({
    level,
    successPercentage: ((levels[level].success / levels[level].total) * 100).toFixed(0),
  }));
});

const singleRunPercentage = computed(() => {
  const singleRunCount = filterActionsByDuration(conceptActions.value, maxConceptDuration).length;
  return ((singleRunCount / numberOfUsers.value) * 100).toFixed(0);
});

const averageRunsForMultiple = computed(() => {
  return computeAverageRuns(conceptActions.value, maxConceptDuration);
});

const averageDurationSingleRun = computed(() => {
  return computeAverageDuration(conceptActions.value, maxConceptDuration);
});

const averageDurationMultipleRuns = computed(() => {
  return computeAverageDuration(conceptActions.value, maxConceptDuration, false);
});

const averageTestsForReviewed = computed(() => {
  const reviewedActions = conceptActions.value.filter((action) =>
    action.answeredQuestions.filter((q) => q.isValid).length >= 20
  );
  const totalTests = reviewedActions.reduce((sum, action) => {
    return (
      sum +
      action.actionTimestamps.filter((a) => a.actionType === "quiz" || a.actionType === "review")
        .length
    );
  }, 0);
  return (totalTests / reviewedActions.length).toFixed(1);
});

const averageQuizTimeByLevel = computed(() => {
  const levels = {
    novice: { totalTime: 0, count: 0 },
    beginner: { totalTime: 0, count: 0 },
    intermediate: { totalTime: 0, count: 0 },
    advanced: { totalTime: 0, count: 0 },
  };

  conceptActions.value.forEach((action) => {
    const questions = action.answeredQuestions.sort((a, b) => a.createdAt - b.createdAt);
    for (let i = 1; i < questions.length; i++) {
      const prevQuestion = questions[i - 1];
      const currentQuestion = questions[i];
      const timeDiff = currentQuestion.createdAt - prevQuestion.createdAt;

      if (timeDiff <= maxAllowedQuizTime && levels[currentQuestion.level]) {
        levels[currentQuestion.level].totalTime += timeDiff;
        levels[currentQuestion.level].count += 1;
      }
    }
  });

  return Object.keys(levels).map((level) => ({
    level,
    averageTime: levels[level].count
      ? toHumanDuration(levels[level].totalTime / levels[level].count)
      : "N/A",
  }));
});

const statistics = computed(() => [
  { label: "Users", value: numberOfUsers.value },
  { label: "Finished", value: percentageFinished.value + "%" },
  { label: "Single Run", value: singleRunPercentage.value + "%" },
  { label: "Reviewed", value: percentageReviewed.value + "%" },
  { label: "Runs (Multiple)", value: averageRunsForMultiple.value },
  { label: "Duration (Single Run)", value: averageDurationSingleRun.value },
  { label: "Duration (Multiple Runs)", value: averageDurationMultipleRuns.value },
  { label: "Tests (Reviewed)", value: averageTestsForReviewed.value },
]);

const levelLabels = {
  novice: "Novice",
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
  expert: "Expert",
}

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
