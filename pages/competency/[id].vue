<template>
  <div v-if="competency" class="q-pa-sm q-gutter-sm">
    <competency-flow
      :competencies="relatedCompetencies"
      :prerequisites="relatedLinks"
      :direction="direction"
      :style="{ height: `${height}px`, width: '100%' }"
      class="gt-xs"
    />
    <subject-list :subjects="[competency.subject]" />
    <h1>{{ competency.name }}</h1>

    <p v-if="competency.description" style="max-width: 600px">
      {{ competency.description }}
    </p>

    <q-btn
      v-if="!teacherMode && !showQuiz"
      :label="quizLabel"
      color="primary"
      class="q-my-md"
      @click="startPreCheck"
    />

    <quiz-runner
      v-if="showQuiz"
      :answered-questions="answeredQuestions"
      :questions="questions"
      :max="20"
      always-show-hints
      @finished="updateQuestionsFinished"
      @results="updateQuestionsResults"
      @progress="updateQuestionsProgress"
    />

    <h3>Concepts</h3>
    <div v-if="competency.concepts?.length">
      <concept-flow
        :concepts="competency.concepts"
        :direction="direction"
        :style="{ height: `${heightConcepts}px`, width: '100%' }"
        class="gt-xs"
      />
      <concept-cards
        :concepts="competency.concepts"
        :allow-delete="teacherMode"
        @delete="deleteConcept"
      />
      <q-btn
        v-if="teacherMode && competency.concepts.some((s) => !s.theory)"
        @click="generateConceptsData"
        >Populate</q-btn
      >
    </div>
    <div v-else-if="teacherMode">
      <q-btn @click="generateCompetencyData">Generate</q-btn>
    </div>
  </div>
  <div v-else>
    <p>Loading...</p>
  </div>
</template>

<script setup>
const competencyService = useCompetency();
const conceptService = useConcept();
const competencyActionService = useCompetencyAction();
const route = useRoute();
const { loading, screen } = useQuasar();
const { getCurrentUser } = useNuxtApp().$Amplify.Auth;

const teacherMode = inject("teacherMode");

const competency = ref(null);
const questions = ref([]);
const answeredQuestions = ref([]);
const showQuiz = ref(false);
const competencyAction = ref(null);


const getLastQuizTime = (action) => {
  return action.actionTimestamps?.reduce((acc, a) => {
    const time = new Date(a.createdAt).getTime();
    return time > acc ? time : acc;
  }, 0) || 0;
};
onMounted(async () => {
  try {
    const competencyId = route.params.id;
    competency.value = await competencyService.get(competencyId);

    // Check or create CompetencyAction
    console.log("teacherMode", teacherMode.value);
    if (!teacherMode.value) {
      const { userId, username } = await getCurrentUser();
      const actions = await competencyActionService.list({
        competencyId,
        userId,
        username,
      });
      if (actions.length) {
        competencyAction.value = actions[0];
      } else {
        competencyAction.value = await competencyActionService.create({
          competencyId,
        });
      }
      const lastQuizTime = getLastQuizTime(competencyAction.value);
      const inProgress = competencyAction.value.answeredQuestions?.some(
        (q) => new Date(q.createdAt).getTime() > lastQuizTime
      );
      if (inProgress) {
        startPreCheck();
      }
    }

  } catch (error) {
    console.error("Failed to fetch competency:", error);
  }

  if (competency.value?.concepts) {
    conceptService.sort(competency.value.concepts);
  }
});

const direction = computed(() => (screen.lt.sm ? "TB" : "LR"));

const relatedCompetencies = computed(() => {
  const relatedCompetencies = [competency.value];
  if (competency.value?.prerequisites) {
    competency.value.prerequisites.forEach((p) =>
      relatedCompetencies.push(p.prerequisite)
    );
  }
  if (competency.value?.followUps) {
    competency.value.followUps.forEach((f) =>
      relatedCompetencies.push(f.competency)
    );
  }
  return relatedCompetencies;
});

const relatedLinks = computed(() => {
  const relatedLinks = [];

  if (competency.value?.prerequisites) {
    competency.value.prerequisites.forEach((p) =>
      relatedLinks.push({
        id: p.prerequisite.id,
        prerequisiteId: p.prerequisite.id,
        competencyId: competency.value.id,
      })
    );
  }
  if (competency.value?.followUps) {
    competency.value.followUps.forEach((f) =>
      relatedLinks.push({
        id: f.competency.id,
        prerequisiteId: competency.value.id,
        competencyId: f.competency.id,
      })
    );
  }
  return relatedLinks;
});

const height = computed(() => {
  if (screen.lt.sm) {
    const hasPre = competency.value?.prerequisites?.length ? 1 : 0;
    const hasFollow = competency.value?.followUps?.length ? 1 : 0;
    return hasPre * 100 + hasFollow * 100 + 120;
  } else {
    return (
      Math.max(
        competency.value?.prerequisites?.length || 0,
        competency.value?.followUps?.length || 0
      ) *
        100 +
      20
    );
  }
});

const heightConcepts = computed(() => {
  if (!competency.value?.concepts?.length) {
    return 0;
  }
  const concepts = competency.value.concepts;
  if (screen.lt.sm) {
    return concepts[concepts.length - 1].order * 150;
  } else {
    let height = 1;
    const dep = {};
    concepts.forEach((c) => {
      if (!c.prerequisites?.length) {
        return;
      }
      c.prerequisites.forEach((p) => {
        if (!dep[p.prerequisiteId]) {
          dep[p.prerequisiteId] = 0;
        }
        dep[p.prerequisiteId]++;
      });
      height = Math.max(height, c.prerequisites.length || 0);
    });
    const maxDep = Math.max(...Object.values(dep), height);
    return maxDep * 100 + 20;
  }
});

const startPreCheck = async () => {
  try {
    loading.show();
    const extendedCompetency = await competencyService.get(
      competency.value.id,
      { selectionSet: ["concepts.questions.*"] }
    );
    const allQuestion = extendedCompetency.concepts.flatMap((c) => c.questions);
    if (competencyAction.value) {
      const action = competencyAction.value;
      const lastQuizTime = getLastQuizTime(action);
      const prevQuizQuestionsIds =
        action.answeredQuestions?.filter(
            (q) => new Date(q.createdAt).getTime() <= lastQuizTime && q.isValid
          )
          .map((q) => q.questionId) || [];

        answeredQuestions.value = action.answeredQuestions?.filter(
          (q) => new Date(q.createdAt).getTime() > lastQuizTime
        ) || [];

      questions.value = allQuestion.filter(
        (q) => !prevQuizQuestionsIds.includes(q.id)
      );
    } else {
      questions.value = allQuestion;
    }
    showQuiz.value = true;
  } catch (error) {
    console.error("Error starting pre-check:", error);
  } finally {
    loading.hide();
  }
};

const updateQuestionsFinished = () => {
  showQuiz.value = false;
};

const quizLabel = computed(() => {
  if (
    teacherMode.value ||
    !competencyAction.value ||
    !competencyAction.value.actionTimestamps?.length
  ) {
    return "Pre Check";
  }
  const finished = competencyAction.value.actionTimestamps.some(
    (a) => a.actionType === "finished"
  );
  return finished ? "Final Quiz" : "Test";
});
const updateQuestionsProgress = async (questions) => {
  if (teacherMode.value || !competencyAction.value) {
    return;
  }
  return competencyActionService.updateQuestionsProgress(
    questions,
    competencyAction.value
  );
};
const updateQuestionsResults = async () => {
  if (teacherMode.value || !competencyAction.value) {
    return;
  }
  return competencyActionService.updateQuestionsResults(competencyAction.value);
};

const generateCompetencyData = async () => {
  loading.show();

  competency.value = await competencyService.createWithAI(competency.value);

  loading.hide();
};

const deleteConcept = async (concept) => {
  loading.show();

  await conceptService.delete(concept);

  competency.value.concepts = competency.value.concepts.filter(
    (s) => s.id !== concept.id
  );

  loading.hide();
};

const generateConceptsData = async () => {
  loading.show();

  await Promise.all(
    competency.value.concepts.map(async (c) => {
      if (!c.theory) {
        await conceptService.createWithAI(c);
        await Promise.all(
          [1, 2, 3, 4].map((l) => conceptService.addQuizWithAI(c, l))
        );
      }
    })
  );

  loading.hide();
};
</script>

<style scoped>

</style>
