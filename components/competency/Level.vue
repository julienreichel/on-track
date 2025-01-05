<template>
  <q-chip v-if="computedLevel" :color="chipColor" text-color="white" icon="signal_cellular_alt" square>
    {{ computedLevel }}
  </q-chip>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  action: { type: Object, required: true },
});

const levels = ["novice", "beginner", "intermediate", "advanced", "expert"];

const getLastQuizTime = (action, lastQuizTime = 0) => {
  return action.actionTimestamps?.reduce((acc, a) => {
    const time = new Date(a.createdAt).getTime();
    if (lastQuizTime && time >= lastQuizTime) {
      return acc;
    }
    return time > acc.time ? {time, type: a.actionType} : acc;
  }, {time: 0}) || {time: 0};
};

const lastQuizeType = computed(() => getLastQuizTime(props.action).type);

const computeLevel = (action) => {
  const lastQuizTime = getLastQuizTime(action).time;
  const prevQuizTime = getLastQuizTime(action, lastQuizTime).time;

  const questions = action.answeredQuestions?.filter(
    (q) => {
        const date = new Date(q.createdAt).getTime();
        return date > prevQuizTime && date <= lastQuizTime;
    }
  );

  const levelCount = levels.reduce((acc, level) => {
    acc[level] = { total: 0, correct: 0 };
    return acc;
  }, {});

  questions?.forEach((q) => {
    const level = q.level;
    levelCount[level].total++;
    if (q.isValid) {
      levelCount[level].correct++;
      for (let i = levels.indexOf(level) - 1; i >= 0; i--) {
        levelCount[levels[i]].correct++;
        levelCount[levels[i]].total++;
      }
    } else {
      for (let i = levels.indexOf(level) + 1; i < levels.length; i++) {
        levelCount[levels[i]].total++;
      }
    }
  });

  return levels.reduce((currentLevel, level) => {
    const successRate = levelCount[level].correct / levelCount[level].total;
    return successRate >= 0.8 && levelCount[level].total >= 3 ? level : currentLevel;
  }, null);
};

const computedLevel = computed(() => computeLevel(props.action));

const chipColor = computed(() => {
  if (lastQuizeType.value === "final-quiz") {
    return "primary";
  }
  return 'secondary';
});
</script>

<style scoped>
.q-chip {
  text-transform: capitalize;
}
</style>
