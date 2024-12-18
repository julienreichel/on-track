<template>
  <q-list>
    <q-expansion-item
      v-for="(question) in questions"
      :key="question.id"
      class="q-pa-none"
      group="quiz"
      :label="question.text"
    >
      <template #header>
        <q-item-section>{{ question.text }}</q-item-section>
      </template>

      <template v-if="question.type === 'radio'">
        <quiz-radio-question :question="question" />
      </template>

      <template v-if="question.type === 'checkbox'">
        <quiz-checkbox-question :question="question" />
      </template>

      <template v-if="question.type === 'word'">
        <quiz-word-question :question="question" />
      </template>
    </q-expansion-item>
  </q-list>
</template>

<script setup>

defineProps({
  questions: { type: Array, required: true },
});
</script>
