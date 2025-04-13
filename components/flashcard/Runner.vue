<template>
  <q-card v-if="currentCard" class="q-pt-xs">
    <q-card-section v-if="title" class="q-pb-none">
      <div class="text-h5 text-center">{{ title }}</div>
    </q-card-section>
    <q-card-section class="q-pt-none q-px-sm">
      <q-linear-progress :value="progress" class="q-mt-md" size="lg" />
    </q-card-section>
    <q-card-section class="q-pa-sm">
      <notification-text :show="showBanner">
        Test yourself using flashcards, then mark them as correct
        <q-icon class="text-positive" name="check" /> or incorrect
        <q-icon class="text-negative" name="close" />.
      </notification-text>
      <div class="row justify-center">
        <flashcard-view :flash-card="currentCard" @success="updateFlashCard" />
      </div>
      
    </q-card-section>
    <q-card-actions class="q-px-none q-py-lg">
      <q-btn
        v-if="step > 0"
        square
        size="md"
        icon="chevron_left"
        @click="prevCard"
      />
      <q-space />
      <q-btn
        square
        size="md"
        :icon="isLastCard ? nextActionsIcon : 'chevron_right'"
        padding="sm 64px"
        @click="nextCard"
      />
    </q-card-actions>
  </q-card>
</template>

<script setup>
const props = defineProps({
  flashCards: { type: Array, required: true },
  nextActionsIcon: { type: String, default: "check" },
  maxCards: { type: Number, default: 5 },
  title: { type: String, default: null },
});
const emit = defineEmits(["updated", "finished"]);

const step = ref(0);
const showBanner = ref(true);

const selectedCards = computed(() =>
  [...props.flashCards].sort(() => Math.random() - 0.5).slice(0, props.maxCards)
);
const currentCard = computed(() => selectedCards.value[step.value]);
const realMaxCards = computed(() =>
  Math.min(props.flashCards.length, props.maxCards)
);
const progress = computed(() =>
  realMaxCards.value > 0 ? step.value / (realMaxCards.value - 1) : 0
);
const isLastCard = computed(() => step.value === realMaxCards.value - 1);

const nextCard = () => {
  if (step.value < realMaxCards.value - 1) {
    step.value++;
  } else {
    emit("finished");
  }
};

const prevCard = () => {
  if (step.value > 0) {
    step.value--;
  }
};

const updateFlashCard = (status) => {
  const flashCardId = currentCard.value.id;
  showBanner.value = false;
  emit("updated", { flashCardId, status });
  nextCard();
};
</script>
