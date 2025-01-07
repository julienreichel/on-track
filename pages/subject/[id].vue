<template>
  <div v-if="subject" class="q-pa-sm">
    <editable-text
      :value="subject.name"
      :enable-editing="teacherMode"
      class="text-h1"
      @update="(text) => updateSubject('name', text)"
    />
    <editable-text
      v-if="subject.description"
      :value="subject.description"
      :enable-editing="teacherMode"
      type="textarea"
      use-rich-text
      @update="(text) => updateSubject('description', text)"
    />
    <q-btn v-else @click="generateSubjectData()">Generate</q-btn>

    <div v-if="subject.competencies?.length">
      <h3>Competencies</h3>
      <competency-flow
        :competencies="subject.competencies"
        :direction="direction"
        :style="{ height: `${height}px`, width: '100%' }"
        class="gt-xs"
      />
      <competency-cards
        :competencies="subject.competencies"
        :allow-delete="teacherMode"
        @delete="deleteCompetency"
      />
    </div>
  </div>
  <div v-else>
    <p>Loading...</p>
  </div>
</template>

<script setup>
const subjectService = useSubject();
const competencyService = useCompetency();
const competencyActionService = useCompetencyAction();
const route = useRoute();
const { loading, screen } = useQuasar();
const { getCurrentUser } = useNuxtApp().$Amplify.Auth;

const teacherMode = inject("teacherMode");

const subject = ref(null);

onMounted(async () => {
  try {
    const subjectId = route.params.id;
    subject.value = await subjectService.get(subjectId);

    if (subject.value?.competencies) {
      competencyService.sort(subject.value.competencies);
    }
    if (!teacherMode.value) {
      const { userId, username } = await getCurrentUser();
      await Promise.all(
        subject.value.competencies.map(async (c) => {
          const actions = await competencyActionService.list({
            competencyId: c.id,
            userId,
            username,
          });
          c.action = actions[0];
        })
      );
    }
  } catch (error) {
    console.error("Failed to fetch subject:", error);
  }
});

const direction = computed(() => (screen.lt.sm ? "TB" : "LR"));

const height = computed(() => {
  if (!subject.value?.competencies?.length) {
    return 0;
  }
  const competencies = subject.value.competencies;
  if (screen.lt.sm) {
    return competencies[competencies.length - 1].order * 150;
  } else {
    const dep = {};
    let height = 1;
    let starters = 0;
    competencies?.forEach((c) => {
      if (!c.prerequisites?.length) {
        starters++;
        return;
      }
      c.prerequisites.forEach((p) => {
        if (!dep[p.prerequisiteId]) {
          dep[p.prerequisiteId] = 0;
        }
        dep[p.prerequisiteId]++;
      });
      height = Math.max(height, c.prerequisites?.length || 0);
    });
    const maxDep = Math.max(...Object.values(dep), height, starters);
    return maxDep * 100 + 20;
  }
});

const generateSubjectData = async () => {
  loading.show();

  const { touchedSubjects } = await subjectService.createWithAI([
    subject.value.name,
  ]);

  if (!touchedSubjects.length) {
    loading.hide();
    return;
  }
  subject.value = touchedSubjects[0];

  loading.hide();
};

const deleteCompetency = async (competency) => {
  loading.show();

  await competencyService.delete(competency);

  subject.value.competencies = subject.value.competencies.filter(
    (s) => s.id !== competency.id
  );

  loading.hide();
};

const updateSubject = async (field, value) => {
  subject.value[field] = value;
  await subjectService.update(subject.value);
};
</script>

<style scoped>
/* Add your styles here */
</style>
