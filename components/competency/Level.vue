<template>
  <q-chip v-if="computedLevel" :color="chipColor" text-color="white" icon="signal_cellular_alt" square>
    {{ computedLevel }}
  </q-chip>
</template>

<script setup>

const { computeLevel, getLastQuizTime }  = useCompetency();

const props = defineProps({
  competency: { type: Object, required: true },
});

const lastQuizeType = computed(() => getLastQuizTime(props.competency.action).type);
const computedLevel = computed(() => computeLevel(props.competency));

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
