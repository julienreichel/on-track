<template>
  <div class="q-pa-md">
    <div class="text-h4 q-mb-md">History</div>
    <q-timeline color="primary" header-color="blue">
      <q-timeline-entry
        v-for="(entry, index) in timelineEntries"
        :key="index"
        :icon="entry.icon"
        :color="entry.color"
        :subtitle="`${entry.date} ${entry.time}`"
      >
        <template #title>
          {{ entry.concept.name }}
          <q-icon
            name="arrow_right"
            class="cursor-pointer"
            @click="$router.push(`/concept/${entry.concept.id}`)"
          />
        </template>
        <div>
          <div class="text-weight-bold">
            {{ entry.competency.name }}
            <q-icon
              name="arrow_right"
              class="cursor-pointer"
              @click="$router.push(`/competency/${entry.competency.id}`)"
            />
          </div>
          <div>{{ entry.label }}</div>
        </div>
      </q-timeline-entry>
    </q-timeline>
  </div>
</template>

<script setup lang="js">
// Reference for the timeline entries
const timelineEntries = ref([]);

// Access services
const conceptActionService = useConceptAction();
const conceptService = useConcept();

// Function to fetch the user's activity history
const fetchUserHistory = async () => {
  try {
    // Get current user
    const { getCurrentUser } = useNuxtApp().$Amplify.Auth;
    const currentUser = await getCurrentUser();
    const { userId, username } = currentUser;

    // Fetch concept actions
    const actions = await conceptActionService.list({
      userId,
      username,
    });

    const entries = [];

    // Fetch all concepts in parallel
    const conceptPromises = actions.map(action => conceptService.get(action.conceptId));
    const concepts = await Promise.all(conceptPromises);

    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      const concept = concepts[i];
      if(!concept) continue;
      const competency = concept.competency;

      // Add task started entry
      if (!action.actionTimestamps ){
        const startDate = new Date(action.createdAt);
        entries.push({
          timestamp: startDate,
          date: startDate.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' }),
          time: startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          concept,
          competency,
          label: 'Opened',
          icon: 'book',
          color: 'secondary',
        });
      }

      // Add action timestamps
      if (!action.actionTimestamps) continue;
      for (const timestamp of action.actionTimestamps) {
        const actionDate = new Date(timestamp.createdAt);
        let label, icon, color;
        if (timestamp.actionType === 'quiz' ) {
          label = 'Tested';
          icon = 'quiz';
          color = 'info';
        } else if (timestamp.actionType === 'pre-quiz' ) {
          label = 'Pre-Tested';
          icon = 'quiz';
          color = 'info';
        } else if (timestamp.actionType === 'started' ) {
          label = 'Started';
          icon = 'play_circle';
          color = 'secondary';
        } else if (timestamp.actionType === 'review' ) {
          label = 'Reviewed';
          icon = 'flash_on';
          color = 'accent';
        } else if (timestamp.actionType === 'finished' ) {
          label = 'Finished';
          icon = 'done';
          color = 'primary';
        } else {
          continue;
        }
        entries.push({
          timestamp: actionDate,
          date: actionDate.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' }),
          time: actionDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          concept,
          competency,
          label,
          icon,
          color,
        });
      }
    }

    // Sort entries by date and time
    timelineEntries.value = entries.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('Error fetching user history:', error);
  }
};

// Fetch data on component mount
onMounted(() => {
  fetchUserHistory();
});
</script>

<style scoped>
/* Add custom styles for the timeline if needed */
</style>
