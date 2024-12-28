<template>
  <q-dialog v-model="popupVisible">
    <quiz-runner
      style="width: 80%; min-width: 350px; max-width: 1000px"
      :questions="questions"
      :max="max"
      @finished="popupVisible = false"
    />
  </q-dialog>
</template>

<script setup>

defineProps({
  questions: { type: Array, required: true },
  max: { type: Number, default: 3 },
  adaptative: { type: Boolean, default: false },
  examMode: { type: Boolean, default: false },
});

const popupVisible = defineModel({ type: Boolean, default: false });
</script>
