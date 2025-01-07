<template>
  <div>
    <q-card
      class="text-white"
      :class="{ 'bg-secondary': !data.selected, 'bg-primary': data.selected }"
      style="width: 150px"
    >
    <q-card-section class="q-pa-sm text-center">
      {{ data.label }}
    </q-card-section>
    </q-card>

    <Handle type="target" :position="targetPosition" />
    <Handle type="source" :position="sourcePosition" />
  </div>
</template>

<script lang="js" setup>
import { Handle, Position } from '@vue-flow/core'

const props = defineProps({
  data: {type: Object, required: true},
  nodeId: {type: String, required: true},
  direction: {type: String, default: 'TB'}
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

</script>
