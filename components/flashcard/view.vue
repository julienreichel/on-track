<template>
  <q-card class="flashcard">
    <q-card-section v-if="view === 'question'">
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

    <q-card-section v-if="view === 'answer'">
      <div class="answer">
        {{ flashCard.answer }}
      </div>
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
        icon="sync"
        flat
        round
        dense
        class="close-btn"
        aria-label="Close answer"
        @click="resetView"
      />
    </q-card-section>

    <q-card-section v-if="view === 'explanation'">
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
        @click="resetView"
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

const view = ref('question'); // Possible values: 'question', 'answer', 'explanation'

const turnCard = (nextView) => {
  view.value = nextView;
};

const resetView = () => {
  view.value = 'question';
};
</script>

<style scoped>
.flashcard {
  max-width: 400px;
  margin: auto;
  text-align: center;
}

.turn-btn, .explain-btn, .close-btn {
  margin-top: 10px;
}
</style>
