<template>
  <q-list>
  <q-item
    v-for="(competency, idx) in competencies"
    :key="idx"
    class="q-pa-none"
    clickable
    @click="navigateTo(`/competency/${competency.id}`)"
  >
    <q-item-section>{{ competency.name }}</q-item-section>
  </q-item>
</q-list>
</template>

<script setup>

defineProps({
  competencies: { type: Array, required: true },
})

</script>
