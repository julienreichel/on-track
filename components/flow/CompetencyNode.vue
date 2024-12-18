<template>
  <div>
    <q-card
      class="text-white"
      :class="{ 'bg-secondary': !data.selected, 'bg-primary': data.selected }"
      style="width: 150px"
    >
      <q-menu v-model="showPopup">
        <div class="column" style="max-width: 400px">
          <q-tabs v-model="tab" dense narrow-indicator>
            <q-tab name="description" label="Description" />
            <q-tab name="objectives" label="Objectives" />
            <q-tab name="concepts" label="Concepts" />
          </q-tabs>
          <q-tab-panels v-model="tab" animated>
            <q-tab-panel name="description">
              {{ data.description || "No description" }}
            </q-tab-panel>
            <q-tab-panel name="objectives">
              <objective-list :objectives="data.objectives" />
            </q-tab-panel>
            <q-tab-panel name="concepts">
              <concept-list :concepts="data.concepts"/>
            </q-tab-panel>
          </q-tab-panels>
          <div class="row q-gutter-sm q-pa-sm">
            <q-btn v-if="!data.description" @click="generateNodeDetails(nodeId)"
              >Generate</q-btn
            >
            <q-btn @click="openNodes(nodeId)">Open</q-btn>
            <q-space />
            <q-btn @click="removeNodes([nodeId])">Delete</q-btn>
          </div>
        </div>
      </q-menu>
      <q-card-section v-if="!data.processing" class="q-pa-sm text-center">
        {{ data.label }}
      </q-card-section>
      <q-card-section v-else class="q-pa-sm text-center">
        <q-spinner color="white" />
      </q-card-section>
    </q-card>

    <Handle type="target" :position="targetPosition" />
    <Handle type="source" :position="sourcePosition" />
  </div>
</template>

<script lang="js" setup>
import { Handle, Position, useVueFlow } from '@vue-flow/core'
const { removeNodes } = useVueFlow()

const props = defineProps({
  data: {type: Object, required: true},
  nodeId: {type: String, required: true},
  direction: {type: String, default: 'TB'}
})

const emits = defineEmits(['generateNodeData'])
const tab = ref('description');

const showPopup = ref(false);
watch(() => props.data.selected, (selected) => {
  showPopup.value = selected && !props.data.processing
})

const targetPosition = computed(() => {
  const map = {
    TB: Position.Top,
    BT: Position.Bottom,
    LR: Position.Left,
    RL: Position.Right
  }
  return map[props.direction];
});
const sourcePosition = computed(() => {
  const map = {
    TB: Position.Bottom,
    BT: Position.Top,
    LR: Position.Right,
    RL: Position.Left
  }
  return map[props.direction];
});

const generateNodeDetails = (nodeId) => {
  emits('generateNodeData', nodeId);
}

const openNodes = (nodeId) => navigateTo(`/competency/${nodeId}`);

</script>
