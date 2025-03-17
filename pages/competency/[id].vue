<template>
  <div v-if="competency" class="q-px-none q-py-sm q-gutter-sm">
    <subject-list :subjects="[competency.subject]" class="bg-primary q-px-sm text-white"/>

    <competency-level
      v-if="competencyAction"
      class="float-right"
      :action="competencyAction"
    />

    <editable-text
      :value="competency.name"
      :enable-editing="teacherMode"
      class="text-h3 q-px-sm"
      @update="(text) => updateCompetency('name', text)"
    />
    <editable-text
      v-if="competency.description"
      :value="competency.description"
      :enable-editing="teacherMode"
      type="textarea"
      class="q-px-sm"
      use-rich-text
      @update="(text) => updateCompetency('description', text)"
    />

    <div v-if="!showQuiz && !teacherMode" class="q-py-sm row">
      <q-btn
        v-if="onGoingConcept"
        label="Continue"
        color="primary"
        class="q-ma-sm col"
        :to="`/concept/${onGoingConcept.id}`"
      />
      <q-btn
        v-else-if="quizStatus === 'quiz'"
        label="Go, let's start learning now"
        color="primary"
        class="q-ma-sm col"
        @click="startCompetency"
      />
      <q-btn
          :label="quizLabel"
        :color="quizStatus === 'quiz' ? undefined : 'primary'"
        class="q-ma-sm col"
        @click="startPreCheck"
      />
    </div>

    <quiz-runner
      v-if="showQuiz"
      :answered-questions="answeredQuestions"
      :questions="questions"
      :max="20"
      :always-show-hints="quizStatus === 'pre-quiz'"
      :exam-mode="quizStatus === 'final-quiz'"
      @finished="updateQuestionsFinished"
      @results="updateQuestionsResults"
      @progress="updateQuestionsProgress"
    />

    <div v-if="competency.concepts?.length">
      <div class="gt-xs q-pb-md">
        <concept-flow
          :concepts="competency.concepts"
          :direction="direction"
          :style="{ height: `${heightConcepts}px`, width: '100%' }"
          class="q-pa-sm"
        />
        <q-banner v-if="!teacherMode && quizStatus !== 'final-quiz'" class="bg-info q-mt-md text-white">
          Select a concept to learn more about it.
        </q-banner>
      </div>
      <concept-cards
        :concepts="competency.concepts"
        :allow-delete="teacherMode"
        class="q-pa-sm lt-sm2"
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
const conceptActionService = useConceptAction();
const route = useRoute();
const router = useRouter();
const { loading, screen } = useQuasar();
const { getCurrentUser } = useNuxtApp().$Amplify.Auth;

const teacherMode = inject("teacherMode");

const competency = ref(null);
const questions = ref([]);
const answeredQuestions = ref([]);
const showQuiz = ref(false);
const competencyAction = ref(null);
const quizStatus = ref("pre-quiz");
const onGoingConcept = ref(null);

const getLastQuizTime = (action, lastQuizTime = 0) => {
  return (
    action.actionTimestamps?.reduce(
      (acc, a) => {
        const time = new Date(a.createdAt).getTime();
        if (lastQuizTime && time >= lastQuizTime) {
          return acc;
        }
        return time > acc.time ? { time, type: a.actionType } : acc;
      },
      { time: 0 }
    ) || { time: 0 }
  );
};

onMounted(async () => {
  try {
    const competencyId = route.params.id;
    competency.value = await competencyService.get(competencyId);

    // Check or create CompetencyAction
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
      const lastQuizTime = getLastQuizTime(competencyAction.value).time;
      const inProgress = competencyAction.value.answeredQuestions?.some(
        (q) => new Date(q.createdAt).getTime() > lastQuizTime
      );
      // the pre-quiz has been run, so this cannot be run again
      if (lastQuizTime && !inProgress) {
        quizStatus.value = "quiz";
      }
      if (inProgress) {
        startPreCheck();
      }

      // laod all concepts actions
      const status = [];
      await Promise.all(
        competency.value.concepts.map(async (c) => {
          const actions = await conceptActionService.list({
            conceptId: c.id,
            userId,
            username,
          });
          // little hack to make sure the preogression status is corect as the questions and flashcards are not loaded at this point
          c.questions = c.questions || Array(20).fill(null);
          c.flashCards = c.flashCards || Array(5).fill(null);
          c.action = actions[0] || {};
          // check if the action is started and/or finished
          const started = c.action.actionTimestamps?.some(
            (a) => a.actionType === "started"
          );
          const finished = c.action.actionTimestamps?.some(
            (a) => a.actionType === "finished"
          );
          status.push({ started, finished });
          if (started && !finished) {
            onGoingConcept.value = c;
          }
        })
      );
      if (status.some((s) => s.started)) {
        quizStatus.value = "quiz";
      }
      if (status.every((s) => s.finished)) {
        quizStatus.value = "final-quiz";
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
      const lastQuizTime = getLastQuizTime(action).time;
      const prevQuizQuestionsIds =
        action.answeredQuestions
          ?.filter(
            (q) => new Date(q.createdAt).getTime() <= lastQuizTime && q.isValid
          )
          .map((q) => q.questionId) || [];

      answeredQuestions.value =
        action.answeredQuestions?.filter(
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

const startCompetency = () => {
  const concept = competency.value.concepts.find(
    (c) => !c.prerequisites?.length
  );
  router.push(`/concept/${concept.id}`);
};
const updateQuestionsFinished = () => {
  showQuiz.value = false;
  quizStatus.value = "quiz";
};

const quizLabel = computed(() => {
  const mapping = {
    "pre-quiz": "Pre Check, where do I stand",
    quiz: "Test me again",
    "final-quiz": "Final Quiz, I am ready",
  };
  return mapping[quizStatus.value] || "Pre Check";
});

const updateQuestionsProgress = async (questions) => {
  if (teacherMode.value || !competencyAction.value) {
    return;
  }
  return competencyActionService.updateQuestionsProgress(
    questions,
    competencyAction.value,
    quizStatus.value
  );
};
const updateQuestionsResults = async () => {
  if (teacherMode.value || !competencyAction.value) {
    return;
  }
  return competencyActionService.updateQuestionsResults(
    competencyAction.value,
    quizStatus.value
  );
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

const updateCompetency = async (field, value) => {
  competency.value[field] = value;
  await competencyService.update(competency.value);
};
</script>

<style scoped>
.q-chip {
  text-transform: capitalize;
}
</style>
