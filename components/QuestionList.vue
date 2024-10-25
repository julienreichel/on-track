<template>
  <q-list>
    <q-expansion-item
      v-for="(question) in questions"
      :key="question.id"
      class="q-pa-none"
      group="quiz"
      :label="question.text[locale]"
    >
      <template #header>
        <q-item-section>{{ question.text[locale] }}</q-item-section>
      </template>

      <template v-if="question.type === 'radio'">
        <quiz-radio-question :question="question" :locale="locale" />
      </template>

      <template v-if="question.type === 'checkbox'">
        <quiz-checkbox-question :question="question" :locale="locale" />
      </template>

      <template v-if="question.type === 'word'">
        <quiz-word-question :question="question" :locale="locale" />
      </template>
    </q-expansion-item>
  </q-list>
</template>

<script setup>

defineProps({
  questions: { type: Array, required: true },
  locale: { type: String, default: "en" },
});
</script>
