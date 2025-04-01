<template>
  <div v-if="subject" class="q-px-none q-py-sm q-gutter-sm">
    <editable-text
      :value="subject.name"
      :enable-editing="teacherMode"
      class="text-h3 q-px-sm"
      @update="(text) => updateSubject('name', text)"
    />
    <editable-text
      v-if="subject.description"
      :value="subject.description"
      :enable-editing="teacherMode"
      class="q-px-md"
      type="textarea"
      use-rich-text
      @update="(text) => updateSubject('description', text)"
    />
    <q-btn v-else @click="generateSubjectData()">Generate</q-btn>

    <action-card
      v-if="!hasStarted"
      title="Let's get started"
      label="Start"
      :to="`/competency/${initialCompetency.id}`"
    >
      <p>This subject is composed of multiple competencies, let's start with <b>{{initialCompetency?.name}}</b>.</p>
      <p>If you prefere to start with another competencies, you can click on any competency in the list bellow</p>
    </action-card>
    <action-card
      v-else-if="onGoingCompentecy"
      title="Continue"
      label="Continue"
      :to="`/competency/${onGoingCompentecy.id}`"
    >
      <p>Let's continue learning where you left off on <b>{{onGoingCompentecy?.name}}</b>.</p>
      <p>If you prefere studing another competency, you can click on any competency in the list bellow</p>
    </action-card>

    <div v-if="subject.competencies?.length">
      <competency-cards
        class="q-pa-sm"
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
const { loading } = useQuasar();
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
    } else {
      subject.value.competencies = [];
    }
    subject.value.competencies.forEach((c) => {
      c.concepts ??= [];
    });
    if (!teacherMode.value) {
      const { userId, username } = await getCurrentUser();
      const competencyActions = await competencyActionService.list({
        subjectId,
        userId,
        username,
      });
      competencyActions.forEach((a) => {
        const competency = subject.value.competencies.find(
          (c) => c.id === a.competencyId
        );
        if (competency) {
          competency.action = a;
          if (a.actionTimestamps?.length) {
            hasStarted.value = true;
          }
        }
      });

      const conceptActions = await conceptActionService.list({
        subjectId,
        userId,
        username,
      });
      conceptActions.forEach((a) => {
        const competency = subject.value.competencies.find(
          (c) => c.id === a.competencyId
        );
        if (competency) {
          const concept = competency.concepts.find(
            (cc) => cc.id === a.conceptId
          );
          if (concept) {
            concept.action = a;
          } else {
            competency.concepts.push({ id: a.conceptId, action: a });
          }
        }
      });
    }
  } catch (error) {
    console.error("Failed to fetch subject:", error);
  }
});

const initialCompetency = computed(() => subject.value.competencies.find(
    (c) => !c.prerequisites?.length
  ) || subject.value.competencies[0]);

const onGoingCompentecy = computed(() => subject.value.competencies.find(
  (c) => {
    // check if the user did a pre-check test, and not a final test
    const started = c.action?.actionTimestamps?.some(
      (a) => a.actionType === "pre-quiz"
    )
    const conceptStarted = c.concepts?.find((cc) => cc.action.actionTimestamps?.some(
        (a) => a.actionType === "started"
      ));

    const finished = c.action?.actionTimestamps?.some(
      (a) => a.actionType === "final-quiz"
    );
    if ((started || conceptStarted) && !finished) {
      return true;
    }
  })
);

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
