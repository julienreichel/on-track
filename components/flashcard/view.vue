<template>
  <q-card class="flashcard">
    <q-card-section v-if="view === 'question'" class="card-content">
      <div class="question">
        {{ flashCard.question }}
      </div>
      <q-btn
        icon="sync"
        flat
        round
        dense
        class="turn-btn"
        aria-label="Turn card to view answer"
        @click="turnCard('answer')"
      />
    </q-card-section>

    <q-card-section v-if="view === 'answer'" class="card-content">
      <div class="answer">
        {{ flashCard.answer }}
      </div>
      <div class="row full-width justify-between">
        <q-btn
          icon="close"
          flat
          round
          dense
          class="close-btn text-negative"
          aria-label="False answer"
          @click="resetView(false)"
        />
        <q-btn
          icon="question_mark"
          flat
          round
          dense
          class="explain-btn"
          aria-label="View explanation"
          @click="turnCard('explanation')"
        />
        <q-btn
          icon="done"
          flat
          round
          dense
          class="close-btn text-positive"
          aria-label="Correct answer"
          @click="resetView(true)"
        />

      </div>
    </q-card-section>

    <q-card-section v-if="view === 'explanation'" class="card-content">
      <div class="notes">
        {{ flashCard.notes }}
      </div>
      <q-btn
        icon="sync"
        flat
        round
        dense
        class="close-btn"
        aria-label="Close explanation"
        @click="view = 'answer'"
      />
    </q-card-section>
  </q-card>
</template>

<script lang="js" setup>

defineProps({
  flashCard: {
    type: Object,
    required: true,
  },
});

const emits = defineEmits(['success'])

const view = ref('question'); // Possible values: 'question', 'answer', 'explanation'

const turnCard = (nextView) => {
  view.value = nextView;
};

const resetView = (success) => {
  emits('success', success);
  view.value = 'question';
};
</script>

<style scoped>
.flashcard {
  max-width: 400px;
  min-height: 150px;
  display: flex;
  flex-direction: column;
}

.card-content {
  display: flex;
  flex-direction: column;
  justify-content: space-between; /* Space out content to push the button to the bottom */
  align-items: center; /* Center the text horizontally */
  flex-grow: 1; /* Allow the card content to fill the available space */
}

.question, .answer, .notes {
  display: flex;
  align-items: center; /* Center the text vertically */
  text-align: center; /* Center the text horizontally within the div */
  flex-grow: 1; /* Allow this section to take up the available space */
}

</style>
