<template>
  <div v-if="subject" class="q-pa-sm">
    <h1>{{ subject.name }}</h1>
    <p v-if="subject.description" style="max-width:600px" >{{ subject.description }}</p>
    <q-btn v-else @click="generateSubjectData()">Generate</q-btn>

    <div v-if="subject.competencies?.length">
      <h3>Competencies</h3>
      <competency-list :competencies="subject.competencies" :allow-delete="teacherMode" @delete="deleteCompetency"/>
      <q-btn v-if="teacherMode && subject.competencies.some(s => !s.introduction)" @click="generateCompetenciesData()">Populate</q-btn>
    </div>
  </div>
  <div v-else>
    <p>Loading...</p>
  </div>
</template>

<script setup>
const subjectService = useSubject();
const competencyService = useCompetency();
const route = useRoute();
const { loading } = useQuasar();

const teacherMode = inject('teacherMode');

const subject = ref(null);

onMounted(async () => {
  try {
    const subjectId = route.params.id;
    subject.value = await subjectService.get(subjectId);
  } catch (error) {
    console.error("Failed to fetch subject:", error);
  }
});

const generateSubjectData = async () => {
  loading.show();

  const { touchedSubjects } = await subjectService.createWithAI( [subject.value.name] );

  if (!touchedSubjects.length){
    loading.hide();
    return;
  }
  subject.value = touchedSubjects[0];

  loading.hide();
}

const deleteCompetency = async (competency) => {
  loading.show();

  await competencyService.delete(competency);

  subject.value.competencies = subject.value.competencies.filter((s) => s.id !== competency.id);

  loading.hide();
}

const generateCompetenciesData = async () => {
  loading.show();

  await Promise.all( subject.value.competencies.map((c) => {
    if (!c.concepts?.length){
      return competencyService.createWithAI( c );
    }
  }));

  loading.hide();
}
</script>

<style scoped>
/* Add your styles here */
</style>
