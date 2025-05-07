<template>
  <div>
    <div v-if="dailyActions.length" class="text-h3 text-center">
      Timeline
    </div>
    <div
        v-for="(day, index) in dailyActions"
        :key="index"
        :subtitle="day.date"
        class="row"
      >
        <div class="col-2">{{ day.date }}</div>
        <div class="col-3">
          <span v-if="day.quizCount">{{ day.quizCount }} Quizzes</span> 
          <span v-if="day.quizCount && day.reviewCount"> | </span>
          <span v-if="day.reviewCount">{{ day.reviewCount }} Reviews</span> 
        </div>
        
        <q-linear-progress
          :value="day.percentage"
          size="lg"
          color="primary"
          track-color="grey-3"
          class="col"
        />
        </div>
  </div>
</template>

<script setup>
import { computed } from "vue";


const props = defineProps({
  conceptActions: {
    type: Array,
    required: true,
  },
});

const dailyActions = computed(() => {
  const actionCounts = {};

  props.conceptActions.forEach((action) => {
    action.actionTimestamps.forEach((actionTimestamp) => {
      const actionType = actionTimestamp.actionType;
      if (actionType === "quiz" || actionType === "review") {
        const date = new Date(actionTimestamp.createdAt).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
        if (!actionCounts[date]) {
          actionCounts[date] = [];
        }
        actionCounts[date].push(actionType);
      }
    });
  });

  const maxActions = Math.max(...Object.values(actionCounts).map(c => c.length), 0);

  return Object.entries(actionCounts)
    .map(([date, data]) => ({
      date,
      count: data.length,
      quizCount: data.filter(action => action === "quiz").length,
      reviewCount: data.filter(action => action === "review").length,
      percentage: data.length / maxActions,
    }))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
});
</script>
