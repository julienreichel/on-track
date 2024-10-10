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
      <panel>
        <input
          v-model="newLectureName"
          placeholder="Lecture name"
          type="text"
          @keypress.enter="addLecture"
        >
      </panel>
    </vue-flow>
  </div>
</template>

<script setup lang="js">
import { VueFlow, Panel, ConnectionMode, useVueFlow } from "@vue-flow/core";

const { onConnect, onNodesChange, onEdgesChange, applyNodeChanges, applyEdgeChanges, fitView, updateNodeData } = useVueFlow()
const { layout } = useLayout()

const lectureService = useLecture();
const prerequisiteService = useLecturePrerequisite();

const nodes = ref([]);
const edges = ref([]);

onMounted(async () => {
  const lectures = await lectureService.list();
  const prerequisites = await prerequisiteService.list();

  // convert lecture to nodes
  nodes.value = lectures.map((lecture) => ({
    id: lecture.id,
    position: { x:0, y:0 },
    type: 'lecture',
    data: {
      label: lecture.name.en,
      toolbarPosition: 'top',
    },
  }));

  // convert prerequisites to edges
  edges.value = prerequisites.map((prerequisite) => ({
    id: prerequisite.id,
    source: prerequisite.prerequisiteId,
    target: prerequisite.lectureId,
  }));

  nextTick(() => {
    nodes.value = layout(nodes.value, edges.value, 'TB');
    fitView({nodes: nodes.value.map(node => node.id)});
  })
});

const newLectureName = ref("");
const addLecture = () => {
  // Create a new lecture
  const newLecture = {
    name: {
      en: newLectureName.value,
    },
  };

  lectureService.create(newLecture).then((lecture) => {
    // Add the new lecture to the list of nodes
    nodes.value.push({
      id: lecture.id,
      position: { x: 500, y: 500 },
      type: 'lecture',
      data: {
        label: lecture.name.en,
        toolbarPosition: 'top',
      },
    });
  });
  newLectureName.value = "";
};


onConnect( async ({source, target}) => {
  console.log("Connect:", source, target);
  // create a new prerequisite
  const prerequisite = await prerequisiteService.create({
    lectureId: target,
    prerequisiteId: source
  });

  console.log("Prerequisite:", prerequisite);

  // Add the new edge to the list of edges
  edges.value.push({
    id: prerequisite.id,
    source,
    target,
  });
  console.log("Edges:", edges.value);

});

onNodesChange(async (changes) => {
  const nextChanges = [];
  console.log("Nodes change:", changes);
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
