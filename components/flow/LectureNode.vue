<template>
  <div>
    <q-card class="text-white" :class="{'bg-secondary': !data.selected, 'bg-primary': data.selected}" style="width: 150px">
      <q-menu v-model="showPopup">
          <q-list style="min-width: 100px">
          <q-item v-close-popup clickable @click="removeNodes([nodeId])">
            <q-item-section>Delete</q-item-section>
          </q-item>
          </q-list>
        </q-menu>
      <q-card-section class="q-pa-sm text-center">
        {{ data.label }}
      </q-card-section>
    </q-card>

    <Handle type="target" :position="Position.Top" />
    <Handle type="source" :position="Position.Bottom" />
  </div>
</template>

<script lang="js" setup>
import { Handle, Position, useVueFlow } from '@vue-flow/core'
const { removeNodes } = useVueFlow()


const props = defineProps({
  data: {type: Object, required: true},
  nodeId: {type: String, required: true}
})

const showPopup = ref(false);
watch(() => props.data.selected, (selected) => {
  showPopup.value = selected
})

</script>

