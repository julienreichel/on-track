<template>
  <div v-if="competency" class="q-px-none q-py-sm q-gutter-sm">
    <subject-list
      :subjects="[competency.subject]"
      class="bg-primary q-px-sm text-white"
    />

    <competency-level
      v-if="competencyAction"
      class="float-right"
      :competency="competency"
    />

    <editable-text
      :value="competency.name"
      :enable-editing="teacherMode"
      class="text-h3 q-px-sm"
      @update="(text) => updateCompetency('name', text)"
    />
    <editable-text
      v-if="competency.description && !showQuiz"
      :value="competency.description"
      :enable-editing="teacherMode"
      type="textarea"
      class="q-px-md"
      use-rich-text
      @update="(text) => updateCompetency('description', text)"
    />

    <quiz-runner
      v-if="showQuiz"
      :answered-questions="answeredQuestions"
      :questions="questions"
      :max="20"
      :always-show-hints="quizStatus === 'pre-quiz'"
      :exam-mode="quizStatus === 'final-quiz'"
      :adaptative="quizStatus !== 'final-quiz'"
      :initial-level="currentUserLevel"
      @finished="updateQuestionsFinished"
      @results="updateQuestionsResults"
      @progress="updateQuestionsProgress"
    />

    <action-card
      v-else-if="onGoingConcept"
      title="Continue"
      label="Continue"
      :to="`/concept/${onGoingConcept.id}`"
    >
      <p>
        Let's continue learning where you left off on
        <b>{{ onGoingConcept?.name }}</b
        >.
      </p>
      <p>
        If you prefere studing another concept, you can click on any concept in
        the list bellow
      </p>
    </action-card>
    <action-card
      v-else-if="nextConcept"
      title="Continue"
      label="Continue"
      :to="`/concept/${nextConcept.id}`"
    >
      <p>
        Let's start the next concept: 
        <b>{{ nextConcept?.name }}</b
        >.
      </p>
      <p>
        If you prefere studing another concept, you can click on any concept in
        the list bellow
      </p>
    </action-card>
    <action-card
      v-else-if="quizStatus === 'quiz'"
      title="Let's start learning now"
      label="Open Concept"
      :to="`/concept/${initialConcept.id}`"
    >
      <p>
        We will tackle te follwing concept: <b>{{ initialConcept?.name }}</b
        >.
      </p>
      <p>
        If you prefere starting with another concept, you can click on any
        concept in the list bellow
      </p>
    </action-card>
    <action-card
      v-else
      :title="quizLabel"
      label="Start Quiz"
      @activated="startPreCheck"
    >
      <p>Let's run a quiz to see where you stand.</p>
      <p v-if="quizStatus !== 'final-quiz'">
        If you prefere, you can also directly start studying a concept from the
        list bellow.
      </p>
    </action-card>

    <div v-if="competency.concepts?.length && !showQuiz">
      <concept-cards
        :concepts="competency.concepts"
        :allow-delete="teacherMode"
        class="q-pa-sm"
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
const { loading } = useQuasar();
const { getCurrentUser } = useNuxtApp().$Amplify.Auth;

const teacherMode = inject("teacherMode");

const competency = ref(null);
const questions = ref([]);
const answeredQuestions = ref([]);
const showQuiz = ref(false);
const competencyAction = ref(null);
const quizStatus = ref("pre-quiz");
const onGoingConcept = ref(null);
const finishedConcepts = ref([]);

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
          subjectId: competency.value.subjectId,
        });
      }
      const lastQuizTime = competencyService.getLastQuizTime(
        competencyAction.value
      ).time;
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
      competency.value.action = competencyAction.value;

      const status = [];
      // load all concepts actions
      competency.value.concepts.forEach((c) => {
        // little hack to make sure the preogression status is corect as the questions and flashcards are not loaded at this point
        c.action = {};
        c.questions = c.questions || Array(20).fill(null);
        c.flashCards = c.flashCards || Array(5).fill(null);
      });
      const conceptActions = await conceptActionService.list({
        competencyId,
        userId,
        username,
      });
      conceptActions.forEach((ca) => {
        const concept = competency.value.concepts.find((c) => c.id === ca.conceptId);
        if (!concept) {
          return;
        }
        concept.action = ca;
      });
      competency.value.concepts.forEach((c) => {
        // check if the action is started and/or finished
        const started = c.action.actionTimestamps?.some(
          (a) => a.actionType === "started"
        );
        const finished = c.action.actionTimestamps?.some(
          (a) => a.actionType === "finished"
        );
        status.push({ started, finished });
        if (started && !finished) {
          onGoingConcept.value = concept;
        }
        if (finished) {
          finishedConcepts.value.push(concept);
        }
        
      });
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

const currentUserLevel = computed(() => {
  if (!competencyAction.value) {
    return "novice";
  }
  return competencyService.computeLevel(competencyAction.value);
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
      const lastQuizTime = competencyService.getLastQuizTime(action).time;
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

const initialConcept = computed(() => {
  return (
    competency.value?.concepts?.find((c) => !c.prerequisites?.length) ||
    competency.value?.concepts[0]
  );
});

const nextConcept = computed(() => {
  if (!finishedConcepts.value.length) {
    return null;
  }
  const finishedConceptsIds = finishedConcepts.value.map((c) => c.id);
  const toDoConcept = competency.value?.concepts?.filter((c) => !finishedConceptsIds.includes(c.id)); 
  const next = toDoConcept?.find(
      (c) =>
        c.prerequisites?.every((p) => finishedConceptsIds.includes(p.prerequisiteId)));
  return next;
});

const updateQuestionsFinished = () => {
  showQuiz.value = false;
  quizStatus.value = "quiz";
};

const quizLabel = computed(() => {
  const mapping = {
    "pre-quiz": "Pre-check, where do you stand",
    quiz: "Test me again",
    "final-quiz": "Final Quiz, are you ready?",
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
