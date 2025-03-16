<template>
  <q-list>
    <q-expansion-item
      v-for="(card, index) in flashCards"
      :key="card.id"
      class="q-pa-none"
      :label="card.question"
      group="cards"    
      >
      <q-card>
        <q-card-section>
          <editable-text
            :value="flashCardsAsText[index]"
            :enable-editing="teacherMode"
            type="textarea"
            class="q-pa-sm"
            use-rich-text
            @update="updateFlashCardContent($event, index)"
          />
        </q-card-section>
        <q-card-actions>
          <q-space />
          <q-btn
            v-if="teacherMode"
            icon="delete"
            @click="removeCard(card)"
          />
        </q-card-actions>
      </q-card>
    </q-expansion-item>
    <q-item>
      <q-item-section>
        <q-btn
          v-if="teacherMode"
          label="Add FlashCard"
          @click="addCard"
        />
      </q-item-section>
    </q-item>
  </q-list>
</template>

<script setup>
const flashCardStore = useFlashCard(); 
const teacherMode = inject("teacherMode");

const flashCards = defineModel({ type: Array, required: true });
const props = defineProps({
  concept: { type: Object, required: true },
});

// Compute the text representation of each flashcard
const flashCardsAsText = computed(() =>
  flashCards.value.map((f) => `- ${f.question}\n- ${f.answer}\n- ${f.notes}`)
);

const updateFlashCardContent = (updatedText, index) => {
  const lines = updatedText.split("\n").map((line) => line.replace("- ", "").trim());

  if (lines.length < 2) return; // Ensure valid format
  const updatedCard = flashCards.value[index];
  updatedCard.question = lines[0] || "";
  updatedCard.answer = lines[1] || "";
  updatedCard.notes = lines[2] || "";

  flashCardStore.update(updatedCard);
};
const removeCard = (card) => {
  flashCardStore.delete(card.id);
  flashCards.value = flashCards.value.filter((q) => q.id !== card.id);
};

const addCard = () => {
  const newCard = {
    question: "Question",
    answer: "Answer",
    notes: "Note/hints",
    conceptId: props.concept.id
  };

  flashCardStore.create(newCard);
  flashCards.value.push(newCard);
};
</script>
