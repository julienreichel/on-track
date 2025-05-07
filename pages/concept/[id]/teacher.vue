<template>
  <div v-if="conceptActions && conceptActions.length">
    <StatisticsCard :concept-actions="conceptActions" />
    <LevelStatisticsCard :concept-actions="conceptActions" />
    <ActionTimeline :concept-actions="conceptActions" />
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

onMounted(async () => {
  try {
    const conceptId = route.params.id;
    const actions = await conceptActionService.listFormated({ conceptId });
    conceptActions.value = actions;
  } catch (error) {
    console.error("Failed to fetch concept action:", error);
  }
});


</script>
