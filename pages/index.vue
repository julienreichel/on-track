<template>
  <div class="q-px-none q-py-sm q-gutter-sm">
    <q-card flat class="q-pa-sm">
      <q-card-section class="q-pa-none">
        <div class="q-gutter-sm q-px-sm">
          <div class="text-h4 text-primary">Welcome {{ userName }}</div>
        </div>
      </q-card-section>
    </q-card>
    <cards-history v-if="hasHistory > 3" :history="history" />
    <!-- TABS -->
    <q-tabs
      v-model="activeTab"
      inline-label
      align="justify"
      narrow-indicator
      indicator-color="primary"
      active-bg-color="primary"
      class="bg-blue-3 text-white"
    >
      <q-tab icon="help_center" name="review" label="Review" />
      <q-tab icon="slideshow" name="continue" label="Continue" />
      <q-tab icon="pageview" name="explore" label="Explore" />
    </q-tabs>

    <q-tab-panels v-model="activeTab" animated>
      <!-- REVIEW TAB -->
      <q-tab-panel name="review" class="q-pa-none">
        <notification-text
          v-if="!emptyState && conceptsToRevisit.length"
          :show="hasHistory <= 3"
        >
          <p class="q-pt-md">Let's review some concepts!</p>
          <p>
            Let’s boost your memory! Review each concept a few times to fully
            charge your mastery battery
            <q-icon class="primary" name="battery_full" />
            <q-icon class="primary" name="battery_full" />
            <q-icon class="primary" name="battery_4_bar" />
            <q-icon class="primary" name="battery_0_bar" />
            <q-icon class="primary" name="battery_0_bar" />. Once it’s full,
            you’re all set.
          </p>
          <p>Want to revisit the theory? Just click the concept card.</p>
        </notification-text>
        <action-card
          v-if="emptyState"
          title="Nothing to review yet!"
          label="Subjects"
          to="/subjects"
        >
          <div class="text-subtitle2">
            <p>
              Once you’ve started learning, we’ll remind you to review key
              concepts at the perfect time — so they really stick.
            </p>
            <p>
              <q-icon name="arrow_forward" class="primary" /> Start by picking a
              subject to explore!
            </p>
          </div>
        </action-card>
        <action-card
          v-else-if="!conceptsToRevisit.length"
          title="No concepts to review"
          :label="conceptsInProgress.length ? 'Continue' : 'Explore'"
          @click="
            activeTab = conceptsInProgress.length ? 'continue' : 'explore'
          "
        >
          <div class="text-subtitle2">
            You have no more concepts to review today. Keep up the good work!
          </div>
          <div v-if="conceptsInProgress.length">
            You can continue your progress on the concepts you are currently
            working on.
          </div>
          <div v-else>You can explore new concepts to learn.</div>
        </action-card>
        <div v-else class="q-py-sm q-px-none">
          <quiz-runner
            :questions="conceptsToRevisit[0].questions"
            :max="5"
            adaptative
            initial-level="intermediate"
            @finished="quizFinished"
            @results="
              conceptActionService.updateQuestionsResults(
                conceptsToRevisit[0].action,
              )
            "
            @progress="
              (q) =>
                conceptActionService.updateQuestionsProgress(
                  q,
                  conceptsToRevisit[0].action,
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
      <q-tab-panel name="continue" class="q-pa-none">
        <notification-text
          v-if="!emptyState && conceptsInProgress.length === 1"
          :show="hasHistory <= 5"
        >
          <p class="q-pt-md">Here are the concept you’re working on.</p>
          <p>Let’s pick up from where you left off.</p>
        </notification-text>
        <notification-text
          v-if="!emptyState && conceptsInProgress.length > 1"
          :show="hasHistory <= 5"
        >
          <p class="q-pt-md">Here are the concepts you’re working on.</p>
          <p>Let’s pick up from where you left off.</p>
        </notification-text>
        <action-card
          v-if="emptyState"
          title="You haven’t started your journey yet!"
          label="Subjects"
          to="/subjects"
        >
          <div class="text-subtitle2">
            <p>
              When you come back, this is where you’ll find the next step in
              your learning path.
            </p>
            <p>
              <q-icon name="arrow_forward" class="primary" /> To begin, head
              over to the subject list and choose your first topic!
            </p>
          </div>
        </action-card>
        <action-card
          v-else-if="!conceptsInProgress.length"
          title="No concepts to continue"
          label="Explore"
          @click="activeTab = 'explore'"
        >
          <div class="text-subtitle2">
            You’ve completed all active learning paths for now. 
          </div>
          <div>You can explore a new concept to begin learning.</div>
        </action-card>
        <div v-else class="q-pa-sm">
          <concept-cards :concepts="conceptsInProgress" />
        </div>
      </q-tab-panel>

      <!-- EXPLORE TAB -->
      <q-tab-panel name="explore" class="q-pa-none">
        <notification-text
          v-if="relatedConcepts.length"
          :show="hasHistory <= 7"
        >
          <p class="q-pt-md">Let's start a new concept!</p>
          <p v-if="!conceptsInProgress.length && !conceptsToRevisit.length">You’ve completed your reviews and ongoing concepts. Here’s something new to explore!</p>
          <p v-else>Select a card bellow to start learning.</p>
        </notification-text>
        <action-card
          v-if="!relatedConcepts.length"
          title="Let’s get started!"
          label="Subjects"
          to="/subjects"
        >
          <div>
            <p>
              This is your learning dashboard. To begin your journey, choose a
              subject that interests you.
            </p>
            <p>
              <q-icon name="arrow_forward" class="primary" /> Click the
              “Subjects” button to browse all topics and pick one to dive into.
            </p>
          </div>
        </action-card>
        <div class="q-pa-sm">
          <concept-cards :concepts="relatedConcepts" />
        </div>
      </q-tab-panel>
    </q-tab-panels>
  </div>
</template>

<script setup lang="js">
const { notify } = useQuasar();
const { fetchUserAttributes } = useNuxtApp().$Amplify.Auth;

// References to hold categorized concepts
const conceptsToRevisit = ref([]);
const conceptsInProgress = ref([]);
const relatedConcepts = ref([]);
const emptyState = ref(false);

// Reference to hold history data
const history = ref([]);
const hasHistory = ref(0);
const activeTab = ref(""); // Will hold "review", "continue", or "explore"

// Access services
const conceptService = useConcept();
const conceptActionService = useConceptAction();
const compentencyService = useCompetency();
const competencyActionService = useCompetencyAction();

// Utility function to format dates
const formatDate = (date) => {
  const options = { month: "short", day: "numeric" };
  return date.toLocaleDateString(undefined, options);
};

const getWeekday = (date) => {
  return date.toLocaleDateString(undefined, { weekday: "short" });
};

// Function to generate the last 14 days
const generateLastDays = () => {
  const days = [];
  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const day = new Date();
    day.setDate(today.getDate() - i);
    days.unshift({
      date: day.toISOString().split("T")[0], // YYYY-MM-DD
      shortDate: formatDate(day),
      weekday: getWeekday(day),
      hasAction: false,
    });
  }
  return days;
};

const quizFinished = () => {
  // mark today as having an action
  const today = new Date().toISOString().split("T")[0];
  const historyDay = history.value.find((day) => day.date === today);
  if (historyDay) {
    if (!historyDay.hasAction) {
      // notify the user that they have completed a quiz today
      notify({
        message:
          "Congratulation, a quiz a day, keeps the learning curve at bay!",
      });
    }
    historyDay.hasAction = true;
    hasHistory.value = hasHistory.value + 3;
  }

  sortRevisitedConcepts();
};

const sortRevisitedConcepts = () => {
  conceptsToRevisit.value = conceptsToRevisit.value.filter((concept) => {
    const { actionTimestamps, answeredQuestions } = concept.action;
    const nbReviews = actionTimestamps.filter(
      ({ actionType }) => actionType === "review",
    ).length;
    const lastReview = actionTimestamps.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    )[0];

    const validQuestions = answeredQuestions.filter((q) => q.isValid).length;
    // we increase the time between reviews up to 5 days
    const nextReviewIn =
      Math.min(10, (nbReviews + 1) * (nbReviews + 1)) * 12 * 60 * 60 * 1000;
    return (
      validQuestions < 25 &&
      new Date() - new Date(lastReview.createdAt) > nextReviewIn
    );
  });

  conceptsToRevisit.value.sort((a, b) => {
    if (a.action.actionTimestamps.length === 0) return -1;
    if (b.action.actionTimestamps.length === 0) return 1;
    const lastActionsA = a.action.actionTimestamps.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    )[0];
    const lastActionsB = b.action.actionTimestamps.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    )[0];
    return new Date(lastActionsA.createdAt) - new Date(lastActionsB.createdAt);
  });

  // Pick a default active tab
  if (conceptsToRevisit.value.length) {
    activeTab.value = "review";
  } else if (conceptsInProgress.value.length) {
    if (activeTab.value === "review"){
      notify({
          message:
            "Great job reviewing! Ready to continue your journey?",
        });
    }
    activeTab.value = "continue";
  } else {
    if (activeTab.value === "review"){
      notify({
          message:
            "Great job reviewing! Ready to start a new journey?",
        });
    }
    activeTab.value = "explore";
  }
};

const updateHistoryFromAction = ({ createdAt, actionType }) => {
  if (!createdAt) return;
  if (
    actionType !== "quiz" &&
    actionType !== "pre-quiz" &&
    actionType !== "final-quiz"
  )
    return;
  const actionDate = new Date(createdAt).toISOString().split("T")[0];
  const historyDay = history.value.find((day) => day.date === actionDate);
  if (historyDay && !historyDay.hasAction) {
    historyDay.hasAction = true;
    hasHistory.value = hasHistory.value + 1;
  }
};

const checkToReview = (action) => {
  const nbReviews = action.actionTimestamps?.filter(
    ({ actionType }) => actionType === "review",
  ).length;
  return nbReviews < 3;
};

const fetchCompetencyConcepts = async (userId, username) => {
  const concepts = [];
  try {
    // Fetch competency actions for the user
    const actions = await competencyActionService.list({
      userId,
      username,
    });

    // Collect all action timestamps
    const allActionTimestamps = [];

    // Fetch all compentency in parallel
    const competenciesPromises = actions.map((action) =>
      compentencyService.get(action.competencyId),
    );
    const competencies = await Promise.all(competenciesPromises);

    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      const competency = competencies[i];
      conceptService.sort(competency.concepts);
      if (action.actionTimestamps?.length) {
        competency.concepts.forEach((concept) => concepts.push(concept));
      }
      // Collect all actionTimestamps
      if (action.actionTimestamps && action.actionTimestamps.length) {
        allActionTimestamps.push(...action.actionTimestamps);
      }
    }

    // Update history based on actionTimestamps
    allActionTimestamps.forEach(updateHistoryFromAction);
  } catch (error) {
    console.error("Error fetching competency actions:", error);
  }
  return concepts;
};
// Function to fetch and categorize actions
const fetchConceptActions = async (userId, username) => {
  try {
    // Initialize history
    history.value = generateLastDays();

    // Fetch concept actions for the user
    const actions = await conceptActionService.list({
      userId,
      username,
    });

    actions
      .filter((a) => Boolean(a))
      .sort((a, b) => {
        if (!a.actionTimestamps?.length) return -1;
        if (!b.actionTimestamps?.length) return 1;
        const lastActionsA = a.actionTimestamps.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
        )[0];
        const lastActionsB = b.actionTimestamps.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
        )[0];
        return (
          new Date(lastActionsA.createdAt) - new Date(lastActionsB.createdAt)
        );
      });

    // Initialize sets for fetched concepts and related concepts
    const fetchedConcepts = new Set();
    const relatedConcept = {};

    const competencyConcepts = await fetchCompetencyConcepts(userId, username);

    // Reset categorized concepts
    conceptsInProgress.value = [];
    conceptsToRevisit.value = [];

    // Collect all action timestamps
    const allActionTimestamps = [];

    // Fetch all concepts in parallel
    const conceptPromises = actions.map((action) => {
      // Check if the concept is already fetched
      const cc = competencyConcepts.find((c) => c.id === action.conceptId);
      if (cc && !checkToReview(action)) {
        return cc;
      }
      return conceptService.get(action.conceptId);
    });
    const concepts = await Promise.all(conceptPromises);

    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      const concept = concepts[i];
      if (!concept) continue;
      concept.action = action;
      if (action.inProgress) {
        conceptsInProgress.value.push(concept);
      } else if (checkToReview(action)) {
        conceptsToRevisit.value.push(concept);
      }
      fetchedConcepts.add(action.conceptId);

      // Collect all actionTimestamps
      if (action.actionTimestamps && action.actionTimestamps.length) {
        allActionTimestamps.push(...action.actionTimestamps);
      }

      // Collect followUp concepts
      if (concept.followUps?.length) {
        for (const followUp of concept.followUps) {
          relatedConcept[followUp.concept.id] = followUp.concept;
        }
      }
    }
    // put the compentency concepts in the end of the list
    competencyConcepts.forEach((concept) => {
      relatedConcept[concept.id] = concept;
    });

    // Update history based on actionTimestamps
    allActionTimestamps.forEach(updateHistoryFromAction);

    // Fetch related concepts, excluding already fetched concepts
    relatedConcepts.value = Object.values(relatedConcept).filter(
      (concept) => !fetchedConcepts.has(concept.id),
    );

    emptyState.value = relatedConcepts.value.length === 0;
    sortRevisitedConcepts();
  } catch (error) {
    console.error("Error fetching concept actions:", error);
  }
};

// Fetch data on component mount
const userName = ref("");
onMounted(async () => {
  const { getCurrentUser } = useNuxtApp().$Amplify.Auth;
  const currentUser = await getCurrentUser();
  const { userId, username } = currentUser;
  fetchConceptActions(userId, username);
  const userAttributes = await fetchUserAttributes();
  userName.value = userAttributes.name || "";
});
</script>

<style scoped></style>
