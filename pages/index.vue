<template>
  <div class="q-px-none q-py-sm q-gutter-sm">
    <cards-history :history="history" />
    <!-- TABS -->
    <q-tabs
      v-model="activeTab"
      inline-label
      align="justify"
      narrow-indicator
      class="bg-primary text-white"
    >
      <q-tab
        v-if="conceptsToRevisit.length"
        icon="help_center"
        name="review"
        label="Review"
      />
      <q-tab
        v-if="conceptsInProgress.length"
        icon="slideshow"
        name="continue"
        label="Continue"
      />
      <q-tab
        v-if="relatedConcepts.length"
        icon="pageview"
        name="explore"
        label="Explore"
      />
    </q-tabs>

    <q-tab-panels v-model="activeTab" animated>

      <!-- REVIEW TAB -->
      <q-tab-panel
        v-if="conceptsToRevisit.length"
        name="review"
        class="q-pa-none"
      >
        <div class="q-py-sm q-px-none">
          <quiz-runner
            :questions="conceptsToRevisit[0].questions"
            :max="5"
            @finished="sortRevisitedConcepts"
            @results="
              conceptActionService.updateQuestionsResults(
                conceptsToRevisit[0].action
              )
            "
            @progress="
              (q) =>
                conceptActionService.updateQuestionsProgress(
                  q,
                  conceptsToRevisit[0].action
                )
            "
          />

          <concept-cards
            class="q-pa-sm gt-sm"
            :concepts="conceptsToRevisit.slice(0, 3)"
          />
        </div>
      </q-tab-panel>

      <!-- CONTINUE TAB -->
      <q-tab-panel
        v-if="conceptsInProgress.length"
        name="continue"
        class="q-pa-none"
      >
        <div class="q-pa-sm">
          <concept-cards
            :concepts="conceptsInProgress"
          />
        </div>
      </q-tab-panel>

      <!-- EXPLORE TAB -->
      <q-tab-panel
        v-if="relatedConcepts.length"
        name="explore"
        class="q-pa-none"
      >
        <div class="q-pa-sm">
          <concept-cards
            :concepts="relatedConcepts"
          />
        </div>
      </q-tab-panel>

    </q-tab-panels>
  </div>
</template>

<script setup lang="js">

// References to hold categorized concepts
const conceptsToRevisit = ref([]);
const conceptsInProgress = ref([]);
const relatedConcepts = ref([]);

// Reference to hold history data
const history = ref([]);
const activeTab = ref('')  // Will hold "review", "continue", or "explore"

// Access services
const conceptService = useConcept();
const conceptActionService = useConceptAction();
const router = useRouter();

// Utility function to format dates
const formatDate = (date) => {
  const options = { month: 'short', day: 'numeric' };
  return date.toLocaleDateString(undefined, options);
};

const getWeekday = (date) => {
  return date.toLocaleDateString(undefined, { weekday: 'short' });
};

// Function to generate the last 14 days
const generateLastDays = () => {
  const days = [];
  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const day = new Date();
    day.setDate(today.getDate() - i);
    days.unshift({
      date: day.toISOString().split('T')[0], // YYYY-MM-DD
      shortDate: formatDate(day),
      weekday: getWeekday(day),
      hasAction: false,
    });
  }
  return days;
};

const sortRevisitedConcepts = () => {
  conceptsToRevisit.value = conceptsToRevisit.value.filter((concept) => {
    const nbReviews = concept.action.actionTimestamps.filter(({ actionType }) => actionType === 'review').length;
    const lastReview = concept.action.actionTimestamps.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
    return nbReviews < 3 && new Date() - new Date(lastReview.createdAt) > 12 * 60 * 60 * 1000;
  });

  conceptsToRevisit.value.sort((a, b) => {
    if (a.action.actionTimestamps.length === 0) return -1;
    if (b.action.actionTimestamps.length === 0) return 1;
    const lastActionsA = a.action.actionTimestamps.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
    const lastActionsB = b.action.actionTimestamps.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
    return new Date(lastActionsA.createdAt) - new Date(lastActionsB.createdAt);
  });
};

// Function to fetch and categorize actions
const fetchConceptActions = async () => {
  try {
    // Initialize history
    history.value = generateLastDays();

    // Get current user
    const { getCurrentUser } = useNuxtApp().$Amplify.Auth;
    const currentUser = await getCurrentUser();
    const { userId, username } = currentUser;

    // Fetch concept actions for the user
    const actions = await conceptActionService.list({
      userId,
      username
    });

    // Initialize sets for fetched concepts and related concepts
    const fetchedConcepts = new Set();
    const relatedConcept = {};

    // Reset categorized concepts
    conceptsInProgress.value = [];
    conceptsToRevisit.value = [];

    // Collect all action timestamps
    const allActionTimestamps = [];

    // Fetch all concepts in parallel
    const conceptPromises = actions.map(action => conceptService.get(action.conceptId));
    const concepts = await Promise.all(conceptPromises);

    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      const concept = concepts[i];
      if (!concept) continue;
      concept.action = action;
      console.log(action.actionTimestamps);
      if (action.inProgress) {
        conceptsInProgress.value.push(concept);
      } else if (action.actionTimestamps.filter(({ actionType }) => actionType === 'review').length < 3) {
        conceptsToRevisit.value.push(concept);
      }
      fetchedConcepts.add(action.conceptId);

      // Collect all actionTimestamps
      if (action.actionTimestamps && action.actionTimestamps.length) {
        allActionTimestamps.push(...action.actionTimestamps);
      }

      // Collect followUp concepts
      for (const followUp of concept.followUps) {
        relatedConcept[followUp.concept.id] = followUp.concept;
      }
    }

    // Update history based on actionTimestamps
    allActionTimestamps.forEach(({ createdAt, actionType }) => {
      if(!createdAt) return;
      if (actionType !== 'quiz' && actionType !== 'pre-quiz' && actionType !== 'review') return;
      const actionDate = new Date(createdAt).toISOString().split('T')[0];
      const historyDay = history.value.find(day => day.date === actionDate);
      if (historyDay) {
        historyDay.hasAction = true;
      }
    });

    // Fetch related concepts, excluding already fetched concepts
    relatedConcepts.value = Object.values(relatedConcept).filter(concept => !fetchedConcepts.has(concept.id));

    if (conceptsInProgress.value.length === 0 && conceptsToRevisit.value.length === 0) {
      router.push('/subject/wizard');
    }
    sortRevisitedConcepts();

    // Pick a default active tab
    if (conceptsToRevisit.value.length) {
      activeTab.value = 'review'
    } else if (conceptsInProgress.value.length) {
      activeTab.value = 'continue'
    } else {
      activeTab.value = 'explore'
    }
  } catch (error) {
    console.error('Error fetching concept actions:', error);
  }
};

// Fetch data on component mount
onMounted(() => {
  fetchConceptActions();
});
</script>

<style scoped></style>
