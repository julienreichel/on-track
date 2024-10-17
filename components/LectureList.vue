<template>
  <q-list>
  <q-item
    v-for="(lecture, idx) in lectures"
    :key="idx"
    class="q-pa-none"
    clickable
    @click="navigateTo(`/lecture/${lecture.id}`)"
  >
    <q-item-section>{{ lecture.name[locale] }}</q-item-section>
  </q-item>
</q-list>
</template>

<script setup>

defineProps({
  lectures: { type: Array, required: true },
  locale: { type: String, default: 'en' },
})

</script>
