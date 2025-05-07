<template>
  <div>
    <div v-if="computedLevelStatistics.length" class="text-h3 text-center q-mt-md">
      Level Statistics
    </div>
    <div class="row q-pa-sm q-col-gutter-md">
      <div
        v-for="(level, index) in computedLevelStatistics"
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
  </div>
</template>

<script setup>
const conceptActionService = useConceptAction();

const props = defineProps({
  conceptActions: {
    type: Array,
    required: true,
  },
});

const maxAllowedQuizTime = 2 * 60 * 1000; // 2 minutes

const levelLabels = {
  novice: "Novice",
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
  expert: "Expert",
};

const computedLevelStatistics = computed(() => {
  return conceptActionService.computeLevelStatistics(props.conceptActions, maxAllowedQuizTime);
});


</script>
