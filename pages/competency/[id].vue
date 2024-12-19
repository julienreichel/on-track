<template>
  <div v-if="competency" class="q-pa-sm">
    <competency-flow
      :competencies="relatedCompetencies"
      :prerequisites="relatedLinks"
      direction="LR"
      :style="{height: `${height}px`, width: '100%' }"
    />
    <h1>{{ competency.name }}</h1>

    <p v-if="competency.description" style="max-width:600px" >{{ competency.description }}</p>

    <div v-if="competency.objectives?.length">
      <h3>Objective</h3>
      <objective-list :objectives="competency.objectives" />
    </div>

    <h3>Concepts</h3>
    <div v-if="competency.concepts?.length">
      <concept-list :concepts="competency.concepts" allow-delete @delete="deleteConcept"/>
      <q-btn v-if="competency.concepts.some(s => !s.theory)" @click="generateConceptsData()">Populate</q-btn>
    </div>
    <div v-else>
      <q-btn @click="generateCompetencyData()">Generate</q-btn>
    </div>

    <h3>Subject</h3>
    <subject-list :subjects="[competency.subject]" />

  </div>
  <div v-else>
    <p>Loading...</p>
  </div>
</template>

<script setup>
const competencyService = useCompetency();
const conceptService = useConcept();
const route = useRoute();
const { loading } = useQuasar();

const competency = ref(null);

onMounted(async () => {
  try {
    const competencyId = route.params.id;
    competency.value = await competencyService.get(competencyId);
  } catch (error) {
    console.error("Failed to fetch competency:", error);
  }
});

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
  return Math.max(competency.value?.prerequisites?.length || 0, competency.value?.followUps?.length || 0) * 100;
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

  await Promise.all( competency.value.concepts.map((c) => {
    if (!c.theory){
      return conceptService.createWithAI( c );
    }
  }));

  loading.hide();
}
</script>

<style scoped>
/* Add your styles here */
</style>
