<template>
  <q-list>
    <q-expansion-item
      v-if="conceptsToRevisit.length"
      label="Revisit"
      :expanded="true"
      group="concept"
      header-class="text-h3"
      :content-inset-level="0.5"
      class="q-mb-md"
    >
      <concept-list :concepts="conceptsToRevisit" />
    </q-expansion-item>

    <q-expansion-item
      v-if="conceptsInProgress.length"
      label="In Progress"
      group="concept"
      header-class="text-h3"
      :content-inset-level="0.5"
      class="q-mb-md"
    >
      <concept-list :concepts="conceptsInProgress" />
    </q-expansion-item>

    <q-expansion-item
      v-if="relatedConcepts.length"
      label="Next"
      group="concept"
      header-class="text-h3"
      :content-inset-level="0.5"
      class="q-mb-md"
    >
      <concept-list :concepts="relatedConcepts" />
    </q-expansion-item>
  </q-list>
</template>

<script setup lang="js">

// References to hold categorized concepts
const conceptsToRevisit = ref([]);
const conceptsInProgress = ref([]);
const relatedConcepts = ref([]);

// Access services
const conceptService = useConcept();
const conceptActionService = useConceptAction();

// Function to fetch and categorize actions
const fetchConceptActions = async () => {
  try {
    // Get current user
    const { getCurrentUser } = useNuxtApp().$Amplify.Auth;
    const currentUser = await getCurrentUser();
    const { userId, username } = currentUser;

    // Fetch concept actions for the user
    const actions = await conceptActionService.list({
      userId,
      username
    });

    // Separate actions into revisited and in-progress
    const fetchedConcepts = new Set();
    const relatedConcept = {};

    conceptsInProgress.value = [];
    conceptsToRevisit.value = [];
    for (const action of actions) {
      const concept = await conceptService.get(action.conceptId);

      if (action.inProgress) {
        conceptsInProgress.value.push(concept);
      } else {
        conceptsToRevisit.value.push(concept);
      }
      fetchedConcepts.add(action.conceptId);

      // Collect followUp concept
      for (const followUp of concept.followUps) {
        console.log(followUp);
        relatedConcept[followUp.concept.id] = followUp.concept;
      }
    }
    // filter out the fetchedConcepts from the relatedConcepts
    relatedConcepts.value = Object.values(relatedConcept).filter(concept => !fetchedConcepts.has(concept.id));

  } catch (error) {
    console.error('Error fetching concept actions:', error);
  }
};

// Fetch data on component mount
onMounted(() => {
  fetchConceptActions();
});
</script>

<style scoped>
/* Add any component-specific styles here */
</style>
