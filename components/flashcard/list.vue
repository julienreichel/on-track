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
      </q-card>
    </q-expansion-item>
  </q-list>
</template>

<script setup>
const flashCard = useFlashCard(); 
const teacherMode = inject("teacherMode");

const props = defineProps({
  flashCards: { type: Array, required: true },
});


// Compute the text representation of each flashcard
const flashCardsAsText = computed(() =>
  props.flashCards.map((f) => `- ${f.question}\n- ${f.answer}\n- ${f.notes}`)
);

const updateFlashCardContent = (updatedText, index) => {
  const lines = updatedText.split("\n").map((line) => line.replace("- ", "").trim());

  if (lines.length < 2) return; // Ensure valid format
  const updatedCard = props.flashCards[index];
  updatedCard.question = lines[0] || "";
  updatedCard.answer = lines[1] || "";
  updatedCard.notes = lines[2] || "";

  flashCard.update(updatedCard);
};
</script>
