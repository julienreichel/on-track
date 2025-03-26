<template>
  <div v-if="subject" class="q-pa-sm q-gutter-sm">
    <editable-text
      :value="subject.name"
      :enable-editing="teacherMode"
      class="text-h3"
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

    <div class="q-pa-sm">
      <q-btn
        v-if="!teacherMode && !hasStarted"
        label="Let's get started"
        color="primary"
        class="q-ma-md full-width"
        @click="startSubject"
      />
    </div>

    <div v-if="subject.competencies?.length">
      <div class="gt-xs q-pb-md">
        <competency-flow
          :competencies="subject.competencies"
          :direction="direction"
          :style="{ height: `${height}px`, width: '100%' }"
        />
        <q-banner v-if="!teacherMode" class="bg-info q-mt-md text-white">
          Select a competency to learn more about it.
        </q-banner>
      </div>
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
const conceptActionService = useConceptAction();
const route = useRoute();
const router = useRouter();
const { loading, screen } = useQuasar();
const { getCurrentUser } = useNuxtApp().$Amplify.Auth;

const hasStarted = ref(false);
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
          if (c.action?.actionTimestamps?.length) {
            hasStarted.value = true;
          }
          const conceptActions = await conceptActionService.list({
            competencyId: c.id,
            userId,
            username,
          });
          if (!c.concepts) {
            c.concepts = [];
          }
          conceptActions.forEach((ca) => {
            const concept = c.concepts.find((cc) => cc.id === ca.conceptId);
            if (concept) {
              concept.action = ca;
            } else {
              c.concepts.push({ id: ca.conceptId, action: ca });
            }
            console.log("concept", c.concepts);
        });
      }));
    }
  } catch (error) {
    console.error("Failed to fetch subject:", error);
  }
});

const startSubject = () => {
  const competency = subject.value.competencies.find(
    (c) => !c.prerequisites?.length
  );
  router.push(`/competency/${competency.id}`);
};

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
