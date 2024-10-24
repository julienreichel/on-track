<template>
  <div style="height: 100%; width: 100%">
    <vue-flow
      :nodes="nodes"
      :edges="edges"
      :connection-mode="ConnectionMode.Strict"
    >
      <template #node-lecture="nodeProps">
        <FlowLectureNode
          :data="nodeProps.data"
          :node-id="nodeProps.id"
          :direction="direction"
          @generate-node-data="generateNodeData"
        />
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
  locale: { type: String, default: "en" },
  direction: { type: String, default: "TB" },
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
      label: lecture.name?.en,
      description: lecture.description?.[props.locale],
      objectives: lecture.objectives || [],
      sections: [],
    },
  }));
  nextTick(() => {
    nodes.value = layout(nodes.value, edges.value, props.direction);
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
    nodes.value = layout(nodes.value, edges.value, props.direction);
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
        if (change.selected) {
          const node = nodes.value.find(node => node.id === change.id);
          if (node && !node.data.sections?.length) {
            const model = await lectureService.get(change.id);
            node.data.sections = model?.sections;
            node.data.description = model.description?.[props.locale];
            node.data.objectives = model.objectives || [];
          }
        }
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

const generateNodeData = async (nodeId) => {
  updateNodeData(nodeId, {
    selected: false,
    processing: true
  });

  const node = nodes.value.find(node => node.id === nodeId);
  const { touchedLectures } = await lectureService.createWithAI( [node.data.label] );

  if (!touchedLectures.length){
    updateNodeData(nodeId, {
      processing: false
    });
    return;
  }
  const model = touchedLectures[0];
  updateNodeData(nodeId, {
    description: model.description?.en,
    objectives: model.objectives?.map(objective => objective.en),
    sections: model.sections,
    processing: false
   });
}
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
