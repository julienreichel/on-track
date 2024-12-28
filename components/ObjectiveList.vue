<template>
  <q-list>
    <q-item v-for="(objective, idx) in objectives" :key="idx" class="q-pa-none">
      <q-item-section side>
        <q-checkbox v-model="check[idx]" />
      </q-item-section>
      <q-item-section>{{ objective }}</q-item-section>
    </q-item>
  </q-list>
</template>

<script setup>
const props = defineProps({
  objectives: { type: Array, required: true },
  defaultCheck: { type: Array, default: () => [] },
});

const check = ref([]);
watch(
  () => props.objectives,
  (objectives) => {
    if (props.defaultCheck.length) {
      check.value = [...props.defaultCheck];
      return;
    }
    check.value = Array(objectives.length).fill(false);
  },
  { immediate: true }
);
watch(
  () => props.defaultCheck,
  (defaultCheck) => {
    if (defaultCheck.length) {
      check.value = [...defaultCheck];
    }
  }
);

watch(
  check,
  (newValues) => {
    emit("check-objective", newValues);
  },
  { deep: true }
);

const emit = defineEmits(["check-objective"]);
</script>
