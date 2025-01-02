<template>
  <div v-if="competency" class="q-pa-md">
    <competency-flow
      :competencies="relatedCompetencies"
      :prerequisites="relatedLinks"
      :direction="direction"
      :style="{height: `${height}px`, width: '100%' }"
      class="gt-xs"
    />
    <subject-list :subjects="[competency.subject]" />
    <h1>{{ competency.name }}</h1>

    <p v-if="competency.description" style="max-width:600px" >{{ competency.description }}</p>

    <div v-if="competency.objectives?.length">
      <h3>Objectives</h3>
      <objective-list :objectives="competency.objectives" />
    </div>

    <h3>Concepts</h3>
    <div v-if="competency.concepts?.length">
      <concept-flow
        :concepts="competency.concepts"
        :direction="direction"
        :style="{height: `${heightConcepts}px`, width: '100%' }"
        class="gt-xs"
      />
      <concept-cards :concepts="competency.concepts" :allow-delete="teacherMode" @delete="deleteConcept"/>
      <q-btn v-if="teacherMode && competency.concepts.some(s => !s.theory)" @click="generateConceptsData()">Populate</q-btn>
    </div>
    <div v-else-if="teacherMode">
      <q-btn @click="generateCompetencyData()">Generate</q-btn>
    </div>
  </div>
  <div v-else>
    <p>Loading...</p>
  </div>
</template>

<script setup>
const competencyService = useCompetency();
const conceptService = useConcept();
const route = useRoute();
const { loading, screen } = useQuasar();

const teacherMode = inject('teacherMode');

const competency = ref(null);

onMounted(async () => {
  try {
    const competencyId = route.params.id;
    competency.value = await competencyService.get(competencyId);
  } catch (error) {
    console.error("Failed to fetch competency:", error);
  }

  if (competency.value?.concepts){
    conceptService.sort(competency.value.concepts);
  }

});

const direction = computed(() => screen.lt.sm ? "TB" : "LR");

const relatedCompetencies = computed(() => {
  const relatedCompetencies = [competency.value];
  if (competency.value?.prerequisites){
    competency.value.prerequisites.forEach((p) => relatedCompetencies.push(p.prerequisite));
  }
  if (competency.value?.followUps){
    competency.value.followUps.forEach((f) => relatedCompetencies.push(f.competency));
  }
  return relatedCompetencies;
});
const relatedLinks = computed(() => {
  const relatedLinks = [];

  if (competency.value?.prerequisites){
    competency.value.prerequisites.forEach((p) => relatedLinks.push({ id: p.prerequisite.id, prerequisiteId: p.prerequisite.id, competencyId: competency.value.id}));
  }
  if (competency.value?.followUps){
    competency.value.followUps.forEach((f) => relatedLinks.push({ id: f.competency.id, prerequisiteId: competency.value.id, competencyId: f.competency.id}));
  }
  return relatedLinks;
});

const height = computed(() => {
  if (screen.lt.sm){
    const hasPre = competency.value?.prerequisites?.length ? 1 : 0;
    const hasFollow = competency.value?.followUps?.length ? 1: 0;
    return hasPre * 100 + hasFollow * 100 + 120;
  } else{
    return Math.max(competency.value?.prerequisites?.length || 0, competency.value?.followUps?.length || 0) * 100 + 20;
  }
});

const heightConcepts = computed(() => {
  if (!competency.value?.concepts?.length){
    return 0;
  }
  const concepts = competency.value.concepts;
  if (screen.lt.sm){
    return concepts[concepts.length - 1].order * 150;
  } else {
    let height = 1;
    const dep = {}
    concepts.forEach((c) => {
      if (!c.prerequisites?.length){
        return;
      }
      c.prerequisites.forEach((p) => {
        if (!dep[p.prerequisiteId]){
          dep[p.prerequisiteId] = 0;
        }
        dep[p.prerequisiteId]++;
      });
      height = Math.max(height, c.prerequisites.length || 0);
    });
    const maxDep = Math.max(...Object.values(dep), height);
    console.log(dep);
    return maxDep * 100 + 20;
  }
});

const generateCompetencyData = async () => {
  loading.show();

  competency.value = await competencyService.createWithAI( competency.value );

  loading.hide();
}

const deleteConcept = async (concept) => {
  loading.show();

  await conceptService.delete(concept);

  competency.value.concepts = competency.value.concepts.filter((s) => s.id !== concept.id);

  loading.hide();
}

const generateConceptsData = async () => {
  loading.show();

  await Promise.all( competency.value.concepts.map(async (c) => {
    if (!c.theory){
      await conceptService.createWithAI( c );
    }
    if (!c.questions?.length){
      await Promise.all(
        [1, 2, 3, 4].map((l) => conceptService.addQuizWithAI(c, l))
      );
    }
  }));

  loading.hide();
}
</script>

<style scoped>
/* Add your styles here */
</style>
