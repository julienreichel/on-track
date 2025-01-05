<template>
  <div class="summary-response">
    <q-card-section v-if="questions.length" class="q-pa-sm">
      <div class="text-h6 text-center">{{ title }}</div>
    </q-card-section>
    <q-list class="q-px-md q-py-sm q-gutter-sm">
      <q-item
        v-for="q in displayedQuestions"
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
          <div v-html="renderKatex(q.text)" />
        </q-item-section>
        <q-item-section side> {{ q.points }} / 5 </q-item-section>
      </q-item>
      <q-item v-if="questions.length > numberOfItems" clickable dense @click="toggleExpanded">
        <q-item-section class="text-center text-bold">
          {{ expanded ? 'Show Less' : '...' }}
        </q-item-section>
      </q-item>
    </q-list>
  </div>
</template>

<script setup>
const { renderKatex } = useFormatter();

defineEmits(["activate"]);

const props = defineProps({
  questions: { type: Array, default: () => [] },
  color: { type: String, default: "" },
  icon: { type: String, default: "task_alt" },
  title: { type: String, default: "" },
  numberOfItems: { type: Number, default: 3 },
});

const expanded = ref(false);
const toggleExpanded = () => {
  expanded.value = !expanded.value;
};

const displayedQuestions = computed(() => {
  return expanded.value ? props.questions : props.questions.slice(0, props.numberOfItems);
});
</script>
