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
});

const check = ref([]);
watch(
  () => props.objectives,
  (objectives) => {
    check.value = Array(objectives.length).fill(false);
  },
  { immediate: true }
);
</script>
