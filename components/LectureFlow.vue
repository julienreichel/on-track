<template>
  <div style="height: 900px; width: 100%">
    <vue-flow
      :nodes="nodes"
      :edges="edges"
      :connection-mode="ConnectionMode.Strict"
    >
      <template #node-lecture="nodeProps">
        <FlowLectureNode :data="nodeProps.data" :node-id="nodeProps.id"/>
      </template>
    </vue-flow>
  </div>
</template>

<script setup lang="js">
import { VueFlow, ConnectionMode, useVueFlow } from "@vue-flow/core";

const { onConnect, onNodesChange, onEdgesChange, applyNodeChanges, applyEdgeChanges, updateNodeData } = useVueFlow()
const { layout } = useLayout()

const props = defineProps({
  lectures: { type: Array, required: true },
  prerequisites: { type: Array, required: true },
});
const lectureService = useLecture();
const prerequisiteService = useLecturePrerequisite();

const nodes = ref([]);
const edges = ref([]);

watch(() => props.lectures, async (lectures) => {
  // convert lecture to nodes
  nodes.value = lectures.map((lecture) => ({
    id: lecture.id,
    position: { x:0, y:0 },
    type: 'lecture',
    data: {
      label: lecture.name.en,
    },
  }));
  nextTick(() => {
    nodes.value = layout(nodes.value, edges.value, 'TB');
  });
}, { immediate: true });

watch(() => props.prerequisites, async (prerequisites) => {
  // convert prerequisites to edges
  edges.value = prerequisites.map((prerequisite) => ({
    id: prerequisite.id,
    source: prerequisite.prerequisiteId,
    target: prerequisite.lectureId,
  }));
  nextTick(() => {
    nodes.value = layout(nodes.value, edges.value, 'TB');
  });
}, { immediate: true });

onConnect( async ({source, target}) => {

  // create a new prerequisite
  const prerequisite = await prerequisiteService.create({
    lectureId: target,
    prerequisiteId: source
  });

  // Add the new edge to the list of edges
  edges.value.push({
    id: prerequisite.id,
    source,
    target,
  });

});

onNodesChange(async (changes) => {
  const nextChanges = [];

  for (const change of changes) {
    if (change.type === 'remove') {
      // delete the lecture
      edges.value = edges.value.filter(edge => edge.source !== change.id && edge.target !== change.id);
      nodes.value = nodes.value.filter(node => node.id !== change.id);
      await lectureService.delete({ id: change.id })
    } else {
      if (change.type === "select") {
        updateNodeData(change.id, { selected: change.selected });
      }
      nextChanges.push(change)
    }
  }

  applyNodeChanges(nextChanges)
})

onEdgesChange(async (changes) => {
  const nextChanges = []

  for (const change of changes) {
    if (change.type === 'remove') {
      // delete the prerequisite
      edges.value = edges.value.filter(edge => edge.id !== change.id);
      await prerequisiteService.delete({ id: change.id});
    } else {
      nextChanges.push(change)
    }
  }

  applyEdgeChanges(nextChanges)
})
</script>

<style>
/* import the necessary styles for Vue Flow to work */
@import "@vue-flow/core/dist/style.css";

/* import the default theme, this is optional but generally recommended */
@import "@vue-flow/core/dist/theme-default.css";

.vue-flow__edge.selected .vue-flow__edge-path {
  stroke: #2a08ec;
  stroke-width: 3px;
}
</style>
