<template>
  <q-card v-if="!hasValidatedAnswers && question" class="q-pt-sm">
    <q-card-section v-if="title" class="q-pb-none">
      <div class="text-h5 text-center">{{ title }}</div>
    </q-card-section>
    <q-card-section class="q-pt-none">
      <q-linear-progress :value="progress" class="q-mt-md" size="lg" />
    </q-card-section>
    <q-card-section>
      <q-card square>
        <q-card-section v-if="question.text">
          <rich-text-renderer class="text-h6" :markdown-content="question.text" />
        </q-card-section>
        <q-separator inset />
        <q-card-section
          v-if="question.type === 'radio' || question.type === 'checkbox'"
          class="q-gutter-sm"
        >
          <q-option-group
            v-model="question.response"
            :options="options"
            :type="question.type"
            :disable="question.validated"
          >
            <template #label="opt">
              <!-- eslint-disable vue/no-v-html -->
              <span v-html="renderKatex(opt.label, true)"/>
            </template>
          </q-option-group>
        </q-card-section>
        <q-card-section
          v-if="question.type === 'shorttext' || question.type === 'word'"
          class="q-gutter-sm q-pl-lg"
        >
          <q-input
            v-model="question.response"
            clearable
            dense
            :readonly="question.validated"
          >
            <template v-if="question.validated" #before>
              <q-icon
                :name="options.icon"
                :color="options.color"
                class="q-px-sm"
              />
            </template>
          </q-input>
        </q-card-section>
        <q-card-section
          v-if="
            question.validated &&
            question.explanations &&
            question.explanations !== ''
          "
          class="q-pa-md"
        >
          <q-banner v-if="question.explanations" class="bg-positive">
            <rich-text-renderer :markdown-content="question.explanations" />
          </q-banner>
        </q-card-section>
      </q-card>
    </q-card-section>
    <q-card-actions class="q-px-none q-py-lg">
      <q-btn
        v-if="step === 0 && prevActionsIcon"
        square
        size="md"
        :icon="prevActionsIcon"
        @click="finished()"
      />
      <q-btn
        v-if="step > 0 && !hasResults"
        square
        size="md"
        icon="chevron_left"
        @click="step--"
      />
      <q-space />
      <q-btn
        square
        size="md"
        icon="chevron_right"
        :color="hasAnswer ? 'primary' : undefined"
        padding="sm 64px"
        @click="nextCliked"
      />
    </q-card-actions>
  </q-card>
  <q-card v-else class="q-pt-sm">
    <q-card-section v-if="title" class="q-pb-none">
      <div class="text-h5 text-center">{{ title }}</div>
    </q-card-section>
    <q-card-section>
      <q-card square>
        <quiz-summary-responses
          :questions="correctQuestions"
          title="Well done"
          icon="task_alt"
          color="bg-positive"
          @activate="goToQuestion"
        />
        <quiz-summary-responses
          :questions="wrongQuestions"
          title="Lets review"
          icon="highlight_off"
          color="bg-negative"
          @activate="goToQuestion"
        />
        <quiz-summary-responses
          :questions="leftOverQuestions"
          title="More to go"
          icon="help_outline"
          color="bg-info"
          @activate="goToNextQuestion"
        />
      </q-card>
    </q-card-section>
    <q-card-actions v-if="hasValidatedAnswers" class="q-px-none q-py-lg">
      <q-space />
      <q-btn
        square
        size="md"
        icon="chevron_right"
        color="primary"
        padding="sm 64px"
        @click="goToNextQuestion"
      />
    </q-card-actions>
    <q-card-actions v-else-if="nextActionsIcon" class="q-px-none q-py-lg">
      <q-space />
      <q-btn
        square
        size="md"
        :icon="nextActionsIcon"
        color="primary"
        padding="sm 64px"
        @click="finished()"
      />
    </q-card-actions>
  </q-card>
</template>

<script setup>
const { renderKatex } = useFormatter();
const { getActiveQuestions, resetQuestions, getOptions, validateAnswers } = useQuizQuestions();

const props = defineProps({
  questions: { type: Array, default: () => [] },
  answeredQuestions: { type: Array, default: () => [] },
  max: { type: Number, default: 0 },
  adaptative: { type: Boolean, default: false },
  examMode: { type: Boolean, default: false },
  nextActionsIcon: { type: String, default: "check" },
  prevActionsIcon: { type: String, default: "" },
  title: { type: String, default: null },
});
const emit = defineEmits(["finished", "results", "progress"]);

const step = ref(0);
const realMax = computed(() =>
  props.max
    ? Math.min(props.max, props.questions.length)
    : props.questions.length,
);

const activeQuestions = ref([]);

const hasValidatedAnswers = ref(false);
// this is the main initialization loop
watch(
  () => props.questions,
  () => {
    step.value = 0;
    hasValidatedAnswers.value = resetQuestions(props.questions, props.answeredQuestions);
    activeQuestions.value = getActiveQuestions(props);
  },
  { immediate: true },
);

const hasResults = computed(() =>
  activeQuestions.value.every((q) => q.validated),
);
watch(hasResults, (hasResults) => {
  if (hasResults) {
    emit("results", activeQuestions.value);
  }
});

const progress = computed(() =>
  hasResults.value ? 1 : step.value / realMax.value,
);

let timeStart = new Date();
const question = computed(() => activeQuestions.value[step.value]);
watch(question, (newQuestion, oldQuestion) => {
  const timeEnd = new Date();
  if (oldQuestion) {
    oldQuestion.time += Math.round((timeEnd - timeStart) / 1000);
  }
  timeStart = timeEnd;
});
const hasAnswer = computed(() => question.value.response !== undefined);

const options = computed(() => getOptions(question.value));

const nextCliked = () => {
  if (question.value.validated) {
    if (hasResults.value) {
      step.value = activeQuestions.value.length;
    } else {
      step.value++;
    }
  } else if (props.examMode) {
    step.value++;
    if (step.value === activeQuestions.value.length) {
      activeQuestions.value.forEach((question) => {
        validateAnswers(question);
      });
      emit("progress", [...activeQuestions.value]);
    }
  } else {
    const valid = validateAnswers(question.value);
    emit("progress", [...activeQuestions.value]);
    if (valid) {
      step.value++;
    }
  }
  if (activeQuestions.value.length <= step.value + 1) {
    // we are building question dynamically
    activeQuestions.value = getActiveQuestions(props);
  }
};

const goToQuestion = (q) => {
  step.value = activeQuestions.value.indexOf(q);
  hasValidatedAnswers.value = false;
};
const goToNextQuestion = () => {
  step.value = numValidatedQuestions.value;
  hasValidatedAnswers.value = false;
};

const correctQuestions = computed(() =>
  activeQuestions.value.filter(
    (q) => q.validated && q.valid,
  ),
);

const wrongQuestions = computed(() =>
  activeQuestions.value.filter(
    (q) => q.validated && !q.valid,
  ),
);

const numValidatedQuestions = computed(
  () => activeQuestions.value.filter((q) => q.validated).length,
);

const leftOverQuestions = computed(() =>
  Array.from(
    { length: realMax.value - numValidatedQuestions.value },
    (_, index) => ({ id: index, text: "...", points: "?" }),
  ),
);

const finished = () => {
  step.value = 0;
  hasValidatedAnswers.value = resetQuestions(props.questions, props.answeredQuestions);
  activeQuestions.value = getActiveQuestions(props);

  emit('finished', activeQuestions.value);
}
</script>
