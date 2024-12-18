
<template>
  <div class="summary-response">
  <q-card-section v-if="questions.length">
    <div class="text-h6 text-center">{{ title }}</div>
  </q-card-section>
  <q-list class="q-pa-md q-gutter-sm">
    <q-item
      v-for="q in questions"
      :key="q.id"
      :class="color"
      clickable
      @click="$emit('activate', q)"
    >
      <q-item-section avatar>
        <q-icon :name="icon" />
      </q-item-section>
      <!-- eslint-disable vue/no-v-html -->
      <q-item-section class="text-ellipsis">
        <div v-html="renderKatex(q.text)"/>
      </q-item-section>
      <q-item-section side> {{ q.points }} / 5 </q-item-section>
    </q-item>
  </q-list>
</div>
</template>

<script setup>
const { renderKatex } = useFormatter();

defineEmits(["activate"]);

defineProps({
  questions: { type: Array, default: () => [] },
  color: { type: String, default: "" },
  icon: { type: String, default: "task_alt" },
  title: { type: String, default: "" }
});
</script>
