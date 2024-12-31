<template>
  <div v-if="concept" class="q-pa-sm">
    <concept-status
      :concept="concept"
      :concept-action="conceptAction"
      @finished="conceptDone"
    />
    <concept-flow
      :concepts="relatedConcepts"
      :prerequisites="relatedLinks"
      direction="LR"
      :style="{ height: `${height}px`, width: '100%' }"
    />
    <competency-list :competencies="[concept.competency]" />
    <h1>{{ concept.name }}</h1>


    <rich-text-renderer
      v-if="concept.description"
      :markdown-content="concept.description"
    />

    <q-list>
      <q-expansion-item
        v-if="conceptAction?.inProgress"
        label="Objectives"
        header-class="text-h3"
        group="concept"
        :content-inset-level="0.5"
        @hide="finaliseObjective"
      >
        <objective-select
          v-if="!conceptAction?.objectives?.length"
          :objectives="concept.objectives"
          @selected="createObjective"
        />
        <objective-list
          v-else
          :objectives="conceptAction?.objectives.map((o) => o.objective)"
          :disabled="true"
        />
      </q-expansion-item>

      <q-expansion-item
        v-if="teacherMode || concept.theory"
        label="Theory"
        header-class="text-h3"
        group="concept"
        :content-inset-level="0.5"
        @show="openTab('theory')"
        @hide="closeTab('theory')"
      >
        <rich-text-renderer
          v-if="concept.theory"
          :markdown-content="concept.theory"
        />
        <q-btn v-else-if="teacherMode" @click="generateConceptData()"
          >Generate</q-btn
        >
      </q-expansion-item>

      <q-expansion-item
        v-if="concept.examples"
        label="Examples"
        header-class="text-h3"
        group="concept"
        :content-inset-level="0.5"
        @show="openTab('examples')"
        @hide="closeTab('examples')"
      >
        <rich-text-renderer :markdown-content="concept.examples" />
      </q-expansion-item>

      <q-expansion-item
        v-if="concept.flashCards?.length"
        label="Flashcards"
        header-class="text-h3"
        group="concept"
      >
        <div class="row q-col-gutter-sm">
          <div
            v-for="flashCard in concept.flashCards"
            :key="flashCard.id"
            class="col"
          >
            <flashcard-view
              :flash-card="flashCard"
              @success="(status) => updateFlashCard(flashCard.id, status)"
            />
          </div>
        </div>
      </q-expansion-item>

      <q-expansion-item
        v-if="teacherMode || concept.questions?.length"
        label="Questions"
        header-class="text-h3"
        group="concept"
        :content-inset-level="0.5"
      >
        <div v-if="concept.questions?.length">
          <quiz-runner
            v-if="!teacherMode"
            :questions="concept.questions"
            :max="quizSize"
            @finished="updateQuestionsFinished"
            @results="updateQuestionsResults"
            @progress="updateQuestionsProgress"
          />
          <question-list v-else :questions="randomizedQuestions" />
        </div>
        <div v-else-if="teacherMode">
          <q-btn @click="generateQuizData()">Generate</q-btn>
        </div>
      </q-expansion-item>
      <q-expansion-item
        v-if="!conceptAction?.inProgress && conceptAction?.objectives?.length"
        label="Objectives"
        header-class="text-h3"
        group="concept"
        :content-inset-level="0.5"
      >
        <objective-list
          :objectives="conceptAction?.objectives.map((o) => o.objective)"
          :default-check="conceptAction?.objectives.map((o) => o.isDone)"
          :disabled="disableObjectives"
          @check-objective="updateObjective"
        />
      </q-expansion-item>
    </q-list>
  </div>
  <div v-else>
    <p>Loading concept data...</p>
  </div>
</template>

<script setup>
const route = useRoute();
const conceptService = useConcept();
const conceptActionService = useConceptAction();
const { loading } = useQuasar();

const { getCurrentUser } = useNuxtApp().$Amplify.Auth;

const concept = ref(null);
const conceptAction = ref(null);

const teacherMode = inject("teacherMode");

onMounted(async () => {
  try {
    const conceptId = route.params.id;
    concept.value = await conceptService.get(conceptId);

    // Check or create ConceptAction
    if (!teacherMode.value) {
      const { userId, username } = await getCurrentUser();
      const actions = await conceptActionService.list({
        conceptId,
        userId,
        username,
      });
      if (actions.length) {
        conceptAction.value = actions[0];
      } else {
        conceptAction.value = await conceptActionService.create({
          conceptId,
          inProgress: true,
          objectives: concept.value.objectives?.map(() => false) || [],
        });
      }
      conceptAction.value.objectives = conceptAction.value.objectives.filter(
        (o) => o.objective
      );
    }
  } catch (error) {
    console.error("Failed to fetch concept or user action:", error);
  }
});

const relatedConcepts = computed(() => {
  const relatedConcepts = [concept.value];
  if (concept.value?.prerequisites) {
    concept.value.prerequisites.forEach((p) =>
      relatedConcepts.push(p.prerequisite)
    );
  }
  if (concept.value?.followUps) {
    concept.value.followUps.forEach((f) => relatedConcepts.push(f.concept));
  }
  return relatedConcepts;
});

const relatedLinks = computed(() => {
  const relatedLinks = [];

  if (concept.value?.prerequisites) {
    concept.value.prerequisites.forEach((p) =>
      relatedLinks.push({
        id: p.prerequisite.id,
        prerequisiteId: p.prerequisite.id,
        conceptId: concept.value.id,
      })
    );
  }
  if (concept.value?.followUps) {
    concept.value.followUps.forEach((f) =>
      relatedLinks.push({
        id: f.concept.id,
        prerequisiteId: concept.value.id,
        conceptId: f.concept.id,
      })
    );
  }
  return relatedLinks;
});

const height = computed(() => {
  const c = concept.value;
  if (!c) return 0;
  return Math.max(c.prerequisites?.length || 0, c.followUps?.length || 0) * 100;
});

const randomizedQuestions = computed(() => {
  return [...concept.value.questions].sort(() => Math.random() - 0.5);
});

const generateConceptData = async () => {
  loading.show();

  await conceptService.createWithAI(concept.value);

  loading.hide();
};

const generateQuizData = async (level) => {
  loading.show();
  if (level) {
    await conceptService.addQuizWithAI(concept.value, level);
  } else {
    await Promise.all(
      [1, 2, 3, 4].map((l) => conceptService.addQuizWithAI(concept.value, l))
    );
  }
  loading.hide();
};

const timers = {
  theory: null,
  examples: null,
};
const openTab = (tab) => {
  if (teacherMode.value || !conceptAction.value) {
    return;
  }
  // genereate a timeout in 15s to trigger the mark as read
  timers[tab] = setTimeout(() => markAsRead(tab), 15000);
};
const closeTab = (tab) => {
  if (timers[tab]) {
    clearTimeout(timers[tab]);
  }
};

const updateStarted = () => {
  if (teacherMode.value || !conceptAction.value) {
    return false;
  }
  if (conceptAction.value.actionTimestamps) {
    return false;
  }
  conceptAction.value.actionTimestamps = [];

  conceptAction.value.actionTimestamps.push({
    actionType: "started",
    createdAt: new Date().toISOString(),
  });
  return true;
};

const markAsRead = async (field) => {
  if (teacherMode.value || !conceptAction.value) {
    return;
  }

  let save = updateStarted();
  if (!conceptAction.value[field]) {
    conceptAction.value[field] = true;
    save = true;
  }

  if (save) {
    conceptAction.value = await conceptActionService.update(
      conceptAction.value
    );
  }
};

let objectives = [];
const createObjective = async (o) => {
  console.log("Create objective", o);
  objectives = o;
};

const finaliseObjective = async () => {
  console.log("Finalise objectives", objectives);
  if (teacherMode.value || !conceptAction.value) {
    return;
  }
  if (!objectives.length) {
    return;
  }

  conceptAction.value.objectives = objectives.map((o) => ({
    objective: o,
    isDone: false,
  }));
  conceptAction.value = await conceptActionService.update(conceptAction.value);
};

const updateObjective = async (objectives) => {
  if (teacherMode.value || !conceptAction.value) {
    return;
  }
  let modified = updateStarted();
  conceptAction.value.objectives.forEach((o, index) => {
    if (o.isDone !== objectives[index]) {
      modified = true;
      o.isDone = objectives[index];
    }
  });
  if (modified) {
    conceptAction.value = await conceptActionService.update(
      conceptAction.value
    );
  }
};

const updateFlashCard = async (flashCardId, status) => {
  if (teacherMode.value || !conceptAction.value) {
    return;
  }
  updateStarted();

  if (!conceptAction.value.usedFlashCards) {
    conceptAction.value.usedFlashCards = [];
  }
  let flashCard = conceptAction.value.usedFlashCards.find(
    (f) => f.flashCardId === flashCardId
  );
  if (flashCard && flashCard.status === status) {
    return;
  }
  if (!flashCard) {
    flashCard = { flashCardId };
    conceptAction.value.usedFlashCards.push(flashCard);
  }
  flashCard.isOk = status;
  conceptAction.value = await conceptActionService.update(conceptAction.value);
};

const updateQuestionsFinished = (p) => {
  console.log("Questions finished", p);
};

const getQuizType = () => {
  if (conceptAction.value.theory && conceptAction.value.examples) {
    if (conceptAction.value.inProgress) {
      return "quiz";
    } else {
      return "review";
    }
  } else {
    return "pre-quiz";
  }
};
const updateQuestionsProgress = async (questions) => {
  if (teacherMode.value || !conceptAction.value) {
    return;
  }
  const quizType = getQuizType();
  const validatedQuestions = questions
    .filter((q) => q.validated)
    .map((q) => ({
      questionId: q.id,
      userResponse:
        q.type === "checkbox"
          ? q.response.join(",")
          : q.response?.toString() || "",
      isValid: !!q.valid,
      quizType,
    }));

  if (!conceptAction.value.answeredQuestions) {
    conceptAction.value.answeredQuestions = [];
  }

  let hasChanges = updateStarted();
  validatedQuestions.forEach((q) => {
    const answeredQuestion = conceptAction.value.answeredQuestions.find(
      (aq) => aq.questionId === q.questionId
    );
    if (answeredQuestion) {
      if (answeredQuestion.userResponse === q.userResponse) {
        return;
      }
      hasChanges = true;
      answeredQuestion.userResponse = q.userResponse;
      answeredQuestion.isValid = q.isValid;
      answeredQuestion.quizType = quizType;
      return;
    }
    hasChanges = true;
    conceptAction.value.answeredQuestions.push(q);
  });

  if (hasChanges) {
    conceptAction.value = await conceptActionService.update(
      conceptAction.value
    );
  }
};
const updateQuestionsResults = async () => {
  if (teacherMode.value || !conceptAction.value) {
    return;
  }
  if (!conceptAction.value.actionTimestamps) {
    conceptAction.value.actionTimestamps = [];
  }
  const actionType = getQuizType();
  conceptAction.value.actionTimestamps.push({
    actionType,
    createdAt: new Date().toISOString(),
  });
  conceptAction.value = await conceptActionService.update(conceptAction.value);
};

const conceptDone = async () => {
  if (
    teacherMode.value ||
    !conceptAction.value ||
    !conceptAction.value.inProgress
  ) {
    return;
  }
  conceptAction.value.inProgress = false;
  conceptAction.value.actionTimestamps.push({
    actionType: "finished",
    createdAt: new Date().toISOString(),
  });

  conceptAction.value = await conceptActionService.update(conceptAction.value);
};
const disableObjectives = computed(() => conceptAction.value?.inProgress);
const quizSize = computed(() => (conceptAction.value?.inProgress ? 10 : 5));
</script>
