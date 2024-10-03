<template>
  <div style="height: 600px; width: 100%">
    <vue-flow :nodes="nodes" :edges="edges" />
  </div>
</template>

<script setup lang="js">
import { VueFlow } from "@vue-flow/core";

const lectureService = useLecture();
const prerequisiteService = useLecturePrerequisite();

const nodes = ref([]);
const edges = ref([]);

/**
 * Assigns layers to nodes in a DAG.
 * @param {Array} nodes - Array of node objects with 'id'.
 * @param {Array} edges - Array of edge objects with 'source' and 'target'.
 * @returns {Object} - An object mapping node IDs to their assigned layers.
 */
 const assignLayers = (nodes, edges) => {
  const inDegree = {};
  const layer = {};
  const nodeMap = {};

  nodes.forEach((node) => {
    inDegree[node.id] = 0;
    nodeMap[node.id] = node;
  });

  edges.forEach((edge) => {
    inDegree[edge.target] = (inDegree[edge.target] || 0) + 1;
  });

  const queue = nodes.filter((node) => inDegree[node.id] === 0);
  queue.forEach((node) => {
    layer[node.id] = 0;
  });

  while (queue.length > 0) {
    const currentNode = queue.shift();
    edges
      .filter((edge) => edge.source === currentNode.id)
      .forEach((edge) => {
        const targetNode = nodeMap[edge.target];
        layer[targetNode.id] = Math.max(
          layer[targetNode.id] || 0,
          layer[currentNode.id] + 1
        );
        inDegree[targetNode.id] -= 1;
        if (inDegree[targetNode.id] === 0) {
          queue.push(targetNode);
        }
      });
  }
  return layer;
}

// Helper function to calculate the median of an array
const getMedian = (values) => {
  values.sort((a, b) => a - b);
  const mid = Math.floor(values.length / 2);
  if (values.length % 2 === 0) {
    return (values[mid - 1] + values[mid]) / 2;
  } else {
    return values[mid];
  }
}

// Helper function to find clusters (connected components)
const findClusters = (nodes, parents, children) => {
  const visited = new Set();
  const clusters = [];

  const nodeMap = {};
  nodes.forEach((node) => {
    nodeMap[node.id] = node;
  });

  function dfs(nodeId, cluster) {
    visited.add(nodeId);
    cluster.push(nodeMap[nodeId]);

    const neighbors = [
      ...(parents[nodeId] || []),
      ...(children[nodeId] || []),
    ];

    neighbors.forEach((neighborId) => {
      if (!visited.has(neighborId)) {
        dfs(neighborId, cluster);
      }
    });
  }

  nodes.forEach((node) => {
    if (!visited.has(node.id)) {
      const cluster = [];
      dfs(node.id, cluster);
      clusters.push(cluster);
    }
  });

  return clusters;
}

/**
 * Orders nodes within each layer to minimize edge crossings using the median heuristic.
 */
 const orderNodesWithinLayers = (nodes, edges, layer) =>{
  const maxLayer = Math.max(...Object.values(layer));
  const layers = {};
  const positions = {};
  const parents = {};
  const children = {};
  const nodeMap = {};

  edges.forEach((edge) => {
    if (!parents[edge.target]) parents[edge.target] = [];
    parents[edge.target].push(edge.source);
    if (!children[edge.source]) children[edge.source] = [];
    children[edge.source].push(edge.target);
  });

  // Identify clusters (connected components)
  const clusters = findClusters(nodes, parents, children);
  clusters.sort((a, b) => b.length - a.length);

  let posStart = 0;
  clusters.forEach(cluster => {
    const clusterLayers = {};
    cluster.forEach((node) => {
      const l = layer[node.id];
      if (!clusterLayers[l]) clusterLayers[l] = [];
      clusterLayers[l].push({id: node.id});

      if (!layers[l]) layers[l] = [];
      layers[l].push({id: node.id});

      nodeMap[node.id] = node;
    });
    let maxPos = posStart;
    Object.keys(clusterLayers).forEach((l) => {
      clusterLayers[l].forEach((node, index) => {
        positions[node.id] = posStart + index;
        maxPos = Math.max(maxPos, posStart + index);
      });
    });
    posStart = maxPos + 1;
 });

  const iterations = 2;
  for (let iter = 0; iter < iterations; iter++) {
    let minPos = nodes.length;

    for (let l = 0; l <= maxLayer; l++) {
      const medianValues = {};
      layers[l].forEach((node) => {
        const pars = parents[node.id] || [];
        const linked = [  ];
        if (pars.length) {
          linked.push(...pars.map((p) => positions[p]));
        } else {
          linked.push(positions[node.id]);
        }
        medianValues[node.id] = getMedian(linked);
      });

      layers[l].sort((a, b) => medianValues[a.id] - medianValues[b.id]);
      let pos = 0
      layers[l].forEach((node) => {
        if (medianValues[node.id] > pos) {
          pos = medianValues[node.id];
        }
        positions[node.id] = pos;
        node.position = pos;
        pos++;
      });
    }

    for (let l = maxLayer - 1; l >= 0; l--) {
      const medianValues = {};
      layers[l].forEach((node) => {
        const childs = children[node.id] || [];
        const pars = parents[node.id] || [];
        const linked = [  ];
        if (childs.length > pars.length) {
          linked.push(...childs.map((p) => positions[p]));
        } else {
          linked.push(positions[node.id]);
        }
        medianValues[node.id] = getMedian(linked);
      });

      layers[l].sort((a, b) => medianValues[a.id] - medianValues[b.id]);
      let pos = 0
      layers[l].forEach((node) => {
        if (medianValues[node.id] > pos) {
          pos = medianValues[node.id];
        }
        positions[node.id] = pos;
        node.position = pos;
        if (pos < minPos) {
          minPos = pos;
        }
        pos++;
      });
    }

    if (minPos > 0) {
      Object.keys(layers).forEach((l) =>
        layers[l].forEach((node) => {
          positions[node.id] -= minPos;
          node.position -= minPos;
        })
      );
    }
  }

  return layers;
}

/**
 * Assigns (x, y) coordinates to each node based on its layer and position.
 * @param {Object} layers - An object mapping layer numbers to arrays of node IDs in order.
 * @param {number} nodeSpacing - Horizontal spacing between nodes.
 * @param {number} layerHeight - Vertical spacing between layers.
 * @returns {Object} - An object mapping node IDs to their coordinates { x, y }.
 */
 const assignCoordinates = (layers, nodeSpacing = 100, layerHeight = 100) => {
  const coordinates = {};
  Object.keys(layers).forEach((layerNum) => {
    const y = layerNum * layerHeight;
    const nodesInLayer = layers[layerNum];
    nodesInLayer.forEach((node) => {
      const x = node.position * nodeSpacing;
      coordinates[node.id] = { x, y };
    });
  });
  return coordinates;
}

/**
 * Main function to compute the layout of a DAG.
 * @param {Array} nodes - Array of node objects with 'id'.
 * @param {Array} edges - Array of edge objects with 'source' and 'target'.
 * @param {number} nodeSpacing - Horizontal spacing between nodes.
 * @param {number} layerHeight - Vertical spacing between layers.
 * @returns {Array} - Updated array of node objects with calculated positions.
 */
const layoutDAG = (nodes, edges, nodeSpacing = 160, layerHeight = 100) => {
  // Step 1: Assign layers
  const layer = assignLayers(nodes, edges);

  // Step 2: Order nodes within layers
  const layers = orderNodesWithinLayers(nodes, edges, layer);

  // Step 3: Assign coordinates
  const coordinates = assignCoordinates(layers, nodeSpacing, layerHeight);

  // Update node positions
  return nodes.map((node) => {
    const pos = coordinates[node.id];
    return {
      ...node,
      position: pos,
    };
  });
}

onMounted(async () => {
  const lectures = await lectureService.list();
  const prerequisites = await prerequisiteService.list();

  // convert lecture to nodes
  const floatingNodes = lectures.map((lecture) => ({
    id: lecture.id,
    data: {
      label: lecture.name.en,
    },
  }));

  // convert prerequisites to edges
  edges.value = prerequisites.map((prerequisite) => ({
    id: `${prerequisite.prerequisiteId}->${prerequisite.lectureId}`,
    source: prerequisite.prerequisiteId,
    target: prerequisite.lectureId,
  }));

  nodes.value = layoutDAG(floatingNodes, edges.value);
});
</script>

<style>
/* import the necessary styles for Vue Flow to work */
@import "@vue-flow/core/dist/style.css";

/* import the default theme, this is optional but generally recommended */
@import "@vue-flow/core/dist/theme-default.css";
</style>
