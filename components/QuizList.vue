<template>
  <q-list>
    <q-item
      v-for="(question, idx) in questions"
      :key="idx"
      class="q-pa-none"
    >
      <q-item-section>{{ question.text[locale] }}</q-item-section>
    </q-item>
  </q-list>
</template>

<script setup>
defineProps({
  questions: { type: Array, required: true },
  locale: { type: String, default: "en" },
});

defineEmits(["delete"]);
</script>
