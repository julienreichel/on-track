<template>
  <q-card class="q-pt-xs">
    <q-card-section class="q-pb-none">
      <q-list>
        <q-item
          v-for="(objective, idx) in objectives"
          :key="idx"
          class="q-pa-none"
        >
          <q-item-section side>
            <q-checkbox v-model="check[idx]" :disable="disabled" />
          </q-item-section>
          <q-item-section>{{ objective }}</q-item-section>
        </q-item>
      </q-list>
      <notification-text v-if="!allChecked">
        Have you met your objectives?
      </notification-text>
    </q-card-section>
    <q-card-actions class="q-px-none q-py-lg">
      <q-space />
      <q-btn
        square
        size="md"
        icon="check"
        :color="allChecked ? 'primary': undefined"
        padding="sm 64px"
        @click="finish"
      />
    </q-card-actions>
  </q-card>
</template>

<script setup>
const props = defineProps({
  objectives: { type: Array, required: true },
  defaultCheck: { type: Array, default: () => [] },
  disabled: { type: Boolean, default: false },
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

const allChecked = computed(() => check.value.every((c) => c));

const emit = defineEmits(["check-objective", "finished"]);

const finish = () => {
  emit("finished");
};
</script>
