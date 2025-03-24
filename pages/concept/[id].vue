<template>
  <div v-if="concept" class="q-px-none q-py-sm q-gutter-sm">
    <!-- Existing concept header/flow/etc. -->
    <competency-list
      class="bg-primary q-px-sm text-white"
      :competencies="[concept.competency]"
    />

    <concept-flow
      :concepts="relatedConcepts"
      :prerequisites="relatedLinks"
      direction="LR"
      :style="{ height: `${height}px`, width: '100%' }"
      class="gt-xs q-px-sm"
    />

    <editable-text
      :value="concept.name"
      :enable-editing="teacherMode"
      class="text-h3 q-px-sm"
      @update="(text) => updateConcept('name', text)"
    />
    <editable-text
      v-if="concept.description && !hasObjectives"
      :value="concept.description"
      :enable-editing="teacherMode"
      type="textarea"
      class="q-px-sm"
      use-rich-text
      @update="(text) => updateConcept('description', text)"
    />

    <!-- TABS -->
    <concept-status
      :concept="concept"
      :concept-action="conceptAction"
      class="q-pb-sm"
      @finished="conceptDone"
    />

    <q-tabs
      v-model="activeTab"
      inline-label
      align="justify"
      narrow-indicator
      class="bg-primary text-white"
    >
      <!-- 1. OBJECTIVES (when in-progress or teacherMode) -->
      <q-tab
        v-if="teacherMode || !hasObjectives"
        name="objectives"
        label="Objectives"
        icon="fact_check"
      />

      <!-- 2. THEORY -->
      <q-tab
        v-if="teacherMode || concept.theory"
        name="theory"
        label="Theory"
        icon="article"
      />

      <!-- 3. EXAMPLES -->
      <q-tab
        v-if="concept.examples"
        name="examples"
        label="Examples"
        icon="ballot"
      />

      <!-- 4. FLASHCARDS -->
      <q-tab
        v-if="concept.flashCards?.length"
        name="flashcards"
        label="Flashcards"
        icon="check_box"
      />

      <!-- 5. QUIZ -->
      <q-tab
        v-if="teacherMode || concept.questions?.length"
        name="quiz"
        label="Quiz"
        icon="help_center"
      />

      <!-- 6. COMPLETED OBJECTIVES (when no longer in-progress) -->
      <q-tab
        v-if="checkObjectives"
        name="objectivesDone"
        label="Objectives"
        icon="fact_check"
      />

      <!-- 7. NEXT STEPS (when no longer in-progress) -->
      <q-tab
        v-if="!conceptAction?.inProgress"
        name="nextSteps"
        label="Next steps"
        icon="exit_to_app"
      />
    </q-tabs>

    <!-- TAB PANELS -->
    <q-tab-panels v-model="activeTab" animated>
      <!-- OBJECTIVES TAB -->
      <q-tab-panel name="objectives" class="q-pa-none">
        <editable-text
          v-if="teacherMode"
          :value="concept.objectives.join('\n\n')"
          :enable-editing="teacherMode"
          type="textarea"
          class="q-pa-sm"
          use-rich-text
          @update="
            (text) =>
              updateConcept(
                'objectives',
                text.split('\n').filter((o) => o)
              )
          "
        />
        <objective-select
          v-else-if="!hasObjectives"
          :objectives="concept.objectives"
          @selected="createObjective"
          @finished="activeTab = 'theory'"
        />
        <objective-list
          v-else
          :objectives="conceptAction?.objectives.map((o) => o.objective)"
          :disabled="true"
        />
      </q-tab-panel>

      <!-- THEORY TAB -->
      <q-tab-panel name="theory" class="q-pa-none">
        <div class="q-py-sm q-px-none">
          <div v-if="!teacherMode && concept.theory">
            <concept-runner
              :markdown-content="concept.theory"
              @finished="markAsRead('theory')"
            />
          </div>
          <editable-text
            v-if="teacherMode && concept.theory"
            :value="concept.theory"
            :enable-editing="teacherMode"
            type="textarea"
            class="q-pa-sm"
            use-rich-text
            @update="(text) => updateConcept('theory', text)"
          />
          <q-btn v-else-if="teacherMode" @click="generateConceptData()">
            Generate
          </q-btn>
        </div>
      </q-tab-panel>

      <!-- EXAMPLES TAB -->
      <q-tab-panel name="examples" class="q-pa-none">
        <div class="q-py-sm q-px-none">
          <div v-if="!teacherMode && concept.examples">
            <concept-runner
              :markdown-content="concept.examples"
              @finished="markAsRead('examples')"
            />
          </div>
          <editable-text
            v-if="teacherMode && concept.examples"
            :value="concept.examples"
            :enable-editing="teacherMode"
            type="textarea"
            class="q-pa-sm"
            use-rich-text
            @update="(text) => updateConcept('examples', text)"
          />
        </div>
      </q-tab-panel>

      <!-- FLASHCARDS TAB -->
      <q-tab-panel name="flashcards" class="q-pa-none">
        <flashcard-list
          v-if="teacherMode"
          v-model="concept.flashCards"
          :concept="concept"
        />
        <div v-else>
          <flashcard-runner
            :flash-cards="concept.flashCards"
            @updated="updateFlashCard"
            @finished="activeTab = 'quiz'"
          />
        </div>
      </q-tab-panel>

      <!-- QUIZ TAB -->
      <q-tab-panel name="quiz" class="q-pa-none">
        <template #header>
          <!-- Battery Icons (if desired) -->
          <q-item-section
            v-if="conceptAction && !conceptAction.inProgress && !teacherMode"
            side
          >
            <div class="row items-center">
              <q-icon
                v-for="i in 5"
                :key="i"
                :name="getBatteryIcon(conceptAction, i)"
              />
            </div>
          </q-item-section>
        </template>

        <div class="q-py-sm q-px-none">
          <div v-if="concept.questions?.length">
            <question-list
              v-if="teacherMode"
              v-model="concept.questions"
              :concept="concept"
            />
            <quiz-runner
              v-else
              :questions="concept.questions"
              :max="quizSize"
              adaptative
              :initial-level="quizLevel"
              @finished="updateQuestionsFinished"
              @results="updateQuestionsResults"
              @progress="updateQuestionsProgress"
            />
          </div>
          <div v-else-if="teacherMode">
            <q-btn @click="generateQuizData()">Generate</q-btn>
          </div>
        </div>
      </q-tab-panel>

      <!-- COMPLETED OBJECTIVES TAB (objectives when no longer in progress) -->
      <q-tab-panel name="objectivesDone" class="q-pa-none">
        <div class="q-pa-sm">
          <objective-list
            :objectives="conceptAction?.objectives.map((o) => o.objective)"
            :default-check="conceptAction?.objectives.map((o) => o.isDone)"
            :disabled="disableObjectives"
            @check-objective="updateObjective"
            @finished="activeTab = 'nextSteps'"
          />
        </div>
      </q-tab-panel>

      <!-- NEXT STEPS TAB -->
      <q-tab-panel name="nextSteps" class="q-pa-none">
        <div class="q-pa-sm">
          <concept-cards :concepts="nextConcepts" />
        </div>
      </q-tab-panel>
    </q-tab-panels>
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

const activeTab = ref("objectives");
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
        });
      }
    }
    activeTab.value = nextTab.value;
  } catch (error) {
    console.error("Failed to fetch concept or user action:", error);
  }
});

const nextTab = computed(() => {
  if (conceptAction.value?.inProgress) {
    if (!hasObjectives.value) {
      return "objectives";
    } else if (!hasDoneTheory.value) {
      return "theory";
    } else if (!hasDoneExamples.value) {
      return "examples";
    } else if (!hasDoneFlashcards.value) {
      return "flashcards";
    } 
  }
  return"quiz";
})
const hasObjectives = computed(() => conceptAction.value?.objectives?.length);
const hasDoneTheory = computed(() => conceptAction.value?.theory);
const hasDoneExamples = computed(() => conceptAction.value?.examples);
const hasDoneFlashcards = computed(
  () =>
    conceptAction.value?.usedFlashCards?.length ===
    concept.value.flashCards?.length
);
const checkObjectives = computed(
  () => !conceptAction.value?.inProgress && hasObjectives.value
);

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

const nextConcepts = computed(() => {
  const nextConcepts = [];
  if (concept.value?.followUps) {
    concept.value.followUps.forEach((f) => nextConcepts.push(f.concept));
  }
  return nextConcepts;
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

const updateStarted = () => {
  if (teacherMode.value || !conceptAction.value) {
    return false;
  }
  return conceptActionService.updateStarted(conceptAction.value);
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
    await conceptActionService.update(conceptAction.value);
  }

  activeTab.value = nextTab.value;
};

let objectives = [];
const createObjective = async (o) => {
  console.log("Create objective", o);
  objectives = o;
};

watch(activeTab, (newQName, oldName) => {
  console.log("Active tab", oldName);
  if (oldName === "objectives") {
    finaliseObjective();
  }
});
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
  await conceptActionService.update(conceptAction.value);
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
    await conceptActionService.update(conceptAction.value);
  }
};

const updateFlashCard = async ({ flashCardId, status }) => {
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
  let triggerOpenQuiz = false;
  if (!flashCard) {
    flashCard = { flashCardId };
    conceptAction.value.usedFlashCards.push(flashCard);
    if (
      conceptAction.value.usedFlashCards.length ===
      concept.value.flashCards.length
    ) {
      triggerOpenQuiz = true;
    }
  }
  flashCard.isOk = status;
  await conceptActionService.update(conceptAction.value);

  if (triggerOpenQuiz) {
    activeTab.value = nextTab.value;
  }
};

const updateQuestionsFinished = () => {
  if (conceptAction.value?.inProgress) {
    return;
  }
  if (hasObjectives.value) {
    activeTab.value = "objectivesDone";
  } else {
    activeTab.value = "nextSteps";
  }
};

const updateQuestionsProgress = async (questions) => {
  if (teacherMode.value || !conceptAction.value) {
    return;
  }
  return conceptActionService.updateQuestionsProgress(
    questions,
    conceptAction.value
  );
};
const updateQuestionsResults = async () => {
  if (teacherMode.value || !conceptAction.value) {
    return;
  }
  return conceptActionService.updateQuestionsResults(conceptAction.value);
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

  await conceptActionService.update(conceptAction.value);
};
const disableObjectives = computed(() => conceptAction.value?.inProgress);
const quizSize = computed(() => (conceptAction.value?.inProgress ? 10 : 5));
const quizLevel = computed(() => conceptAction.value?.inProgress ? "beginner" : "intermediate");

const getBatteryIcon = (action, index) => {
  const correctAnswers =
    action.answeredQuestions?.filter((q) => q.isValid).length || 0;
  const fullBatteries = Math.floor(correctAnswers / 4);
  if (index <= fullBatteries) return "battery_full";
  const remaining = correctAnswers % 4;
  if (index === fullBatteries + 1) {
    if (remaining >= 3) return "battery_6_bar";
    if (remaining >= 2) return "battery_4_bar";
    if (remaining >= 1) return "battery_2_bar";
  }
  return "battery_0_bar";
};

const updateConcept = async (field, value) => {
  concept.value[field] = value;
  await conceptService.update(concept.value);
};
</script>
