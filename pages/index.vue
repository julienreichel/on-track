<template>
  <div class="q-pa-md">
    <!-- Last 14 Days History Section -->
    <div class="q-mb-lg">
      <q-card flat class="q-pa-md">
        <q-card-section class="row q-col-gutter-sm">
          <div
            v-for="(day, idx) in history"
            :key="day.date"
            class="col"
            :class="{ 'gt-sm': idx < 7 }"
          >
            <q-card flat bordered class="text-center">
              <div class="text-sm gt-sm">{{ day.shortDate }}</div>
              <div class="text-xs text-gray-6">{{ day.weekday }}</div>
              <q-icon
                v-if="day.hasAction"
                name="check_circle"
                color="green"
                size="md"
                class="q-mt-sm"
              />
              <q-icon
                v-else
                name="radio_button_unchecked"
                color="grey-6"
                size="md"
                class="q-mt-sm"
              />
            </q-card>
          </div>
        </q-card-section>
      </q-card>
    </div>

    <!-- Concepts Sections -->
    <q-list>
      <q-expansion-item
        v-if="conceptsToRevisit.length"
        label="Review"
        :expanded="true"
        group="concept"
        default-opened
        header-class="text-h3"
      >
        <div class="q-pa-sm q-gutter-sm">
          <concept-cards
            class="q-pa-sm lt-md"
            :concepts="conceptsToRevisit.slice(0, 1)"
          />
          <concept-cards
            class="q-pa-sm gt-sm"
            :concepts="conceptsToRevisit.slice(0, 3)"
          />
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
        </div>
      </q-expansion-item>

      <q-expansion-item
        v-if="conceptsInProgress.length"
        label="Continue"
        group="concept"
        header-class="text-h3"
      >
        <concept-cards class="q-pa-sm" :concepts="conceptsInProgress" />
      </q-expansion-item>

      <q-expansion-item
        v-if="relatedConcepts.length"
        label="Explore"
        group="concept"
        header-class="text-h3"
      >
        <concept-cards class="q-pa-sm" :concepts="relatedConcepts" />
      </q-expansion-item>
    </q-list>
  </div>
</template>

<script setup lang="js">

// References to hold categorized concepts
const conceptsToRevisit = ref([]);
const conceptsInProgress = ref([]);
const relatedConcepts = ref([]);

// Reference to hold history data
const history = ref([]);

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
  conceptsToRevisit.value.sort((a, b) => {
    if (a.action.actionTimestamps.length === 0) return -1;
    if (b.action.actionTimestamps.length === 0) return 1;
    const lastActionsA = a.action.actionTimestamps.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
    const lastActionsB = b.action.actionTimestamps.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
    return new Date(lastActionsA.createdAt) - new Date(lastActionsB.createdAt);
  });

  conceptsToRevisit.value = conceptsToRevisit.value.filter((concept) => {
    return concept.action.actionTimestamps.filter(({ actionType }) => actionType === 'review').length < 3;
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

    for (const action of actions) {
      const concept = await conceptService.get(action.conceptId);
      if (!concept) continue;
      concept.action = action;
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
      router.push('/subjects');
    }
    sortRevisitedConcepts();
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
