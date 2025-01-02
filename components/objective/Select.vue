<template>
  <div>
    <q-list class="q-pa-sm">
      <q-item
        v-for="(objective, idx) in objectivesWithCustom"
        :key="idx"
        class="q-pa-none"
      >
        <q-item-section side>
          <q-checkbox
            v-model="selected[idx]"
            :disable="disabled && !selected[idx]"
            @update:model-value="updateSelection"
          />
        </q-item-section>
        <q-item-section>{{ objective }}</q-item-section>
      </q-item>
    </q-list>

    <q-input
      v-model="newObjective"
      label="Add your own objective"
      dense
      class="q-my-md"
      :disable="disabled"
      @keyup.enter="addObjective"
    >
      <template #append>
        <q-btn
          flat
          dense
          icon="add"
          :disable="!newObjective || disabled"
          @click="addObjective"
        />
      </template>
    </q-input>

    <q-banner
      v-if="selectedObjectives.length < minObjectives"
      class="bg-secondary q-mt-md text-white"
    >
      Please select at least {{ minObjectives }} learning objectives, you can use proposed one, or create your own.
    </q-banner>
  </div>
</template>

<script setup lang="js">

const props = defineProps({
  objectives: {
    type: Array,
    required: true,
  },
  minObjectives: {
    type: Number,
    default: 3,
  },
  maxObjectives: {
    type: Number,
    default: 5,
  }
});

const emit = defineEmits(['selected']);

const selected = ref([]);
const newObjective = ref('');

const updateSelection = () => {
  if (selectedObjectives.value.length >= props.minObjectives) {
    emit('selected', selectedObjectives.value);
  }
};

// Handle adding a new custom objective
const objectivesWithCustom = ref();

const addObjective = () => {
  if (newObjective.value.trim()) {
    objectivesWithCustom.value.push(newObjective.value.trim());
    selected.value.push(true); // Automatically select the new objective
    newObjective.value = '';
    updateSelection();
  }
};

// Watch to ensure objectives are reinitialized properly if props change
watch(
  () => props.objectives,
  (newObjectives) => {
    objectivesWithCustom.value = [...newObjectives];
    selected.value = newObjectives.map(() => false);
  },
  { immediate: true }
);

const disabled = computed(
  () => objectivesWithCustom.value.filter((_, idx) => selected.value[idx]).length >= props.maxObjectives
);

const selectedObjectives = computed(() =>
  objectivesWithCustom.value.filter((_, idx) => selected.value[idx])
);
</script>

<style scoped>

</style>
