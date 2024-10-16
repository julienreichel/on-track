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
            <q-tab name="sections" label="Sections" />
          </q-tabs>
          <q-tab-panels v-model="tab" animated>
            <q-tab-panel name="description">
              {{ data.description || "No description" }}
            </q-tab-panel>
            <q-tab-panel name="objectives">
              <q-list>
                <q-item
                  v-for="(objective, idx) in data.objectives"
                  :key="idx"
                  class="q-pa-none"
                >
                  <q-item-section side>
                    <q-checkbox v-model="check[idx]" />
                  </q-item-section>
                  <q-item-section>{{ objective }}</q-item-section>
                </q-item>
              </q-list>
            </q-tab-panel>
            <q-tab-panel name="sections">
              <q-list>
                <q-item
                  v-for="(section, idx) in data.sections"
                  :key="idx"
                  class="q-pa-none"
                >
                  <q-item-section>{{ section }}</q-item-section>
                </q-item>
              </q-list>
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

const emits = defineEmits(['generateNodeData'])

const check = ref(props.data.objectives?.map(() => false));
const tab = ref('description');

const showPopup = ref(false);
watch(() => props.data.selected, (selected) => {
  showPopup.value = selected && !props.data.processing
})

const generateNodeDetails = (nodeId) => {
  emits('generateNodeData', nodeId);
}


const openNodes = (nodeId) => {
  console.log(nodeId)
}
</script>
