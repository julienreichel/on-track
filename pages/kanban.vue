<template>
  <div class="q-pa-md">
    <div class="text-h4 q-mb-md">Kanban Board</div>
    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <q-spinner v-if="loading" color="primary" size="lg" class="q-my-md text-center" />
        <div v-else>
          <!-- Header Row with Column Titles -->
          <div class="row q-col-gutter-md">
            <div class="col-2">
              <div class="text-h5 text-center">Competency</div>
            </div>
            <div class="col-10">
              <div class="row q-col-gutter-md">
                <div v-for="column in columns" :key="column" class="col">
                  <div class="text-h5 text-center">{{ column }}</div>
                </div>
              </div>
            </div>
          </div>
          <q-separator class="q-my-md" />
          <!-- Rows for Competencies -->
          <div v-for="(competency, competencyId) in board" :key="competencyId">
            <div class="row q-col-gutter-md">
              <div class="col-2">
                <q-card
                  flat
                  bordered
                  class="q-mb-sm cursor-pointer"
                  @click="$router.push(`/competency/${competencyId}`)">
                  <q-card-section class="text-h5 text-center">{{ competency.name }}</q-card-section>
                </q-card>
              </div>
              <div class="col-10">
                <div class="row q-col-gutter-md">
                  <div v-for="column in columns" :key="column" class="col">
                    <q-card
                      v-for="concept in competency.columns[column]"
                      :key="concept.id"
                      flat
                      bordered
                      class="q-mb-sm cursor-pointer"
                      @click="$router.push(`/concept/${concept.id}`)">
                      <q-card-section>{{ concept.name }}</q-card-section>
                    </q-card>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup lang="js">

const board = ref({});
const columns = ["ToDo", "Learning", "Revision", "Done"];
const loading = ref(true);

const conceptActionService = useConceptAction();
const conceptService = useConcept();

const fetchKanbanData = async () => {
  try {
    const { getCurrentUser } = useNuxtApp().$Amplify.Auth;
    const currentUser = await getCurrentUser();
    const { userId, username } = currentUser;

    const actions = await conceptActionService.list({
      userId,
      username,
    });

    const groupedByCompetency = {};

    for (const action of actions) {
      const concept = await conceptService.get(action.conceptId);
      const competency = concept.competency;

      if (!groupedByCompetency[competency.id]) {
        groupedByCompetency[competency.id] = {
          name: competency.name,
          columns: {
            ToDo: [],
            Learning: [],
            Revision: [],
            Done: [],
          },
        };
      }

      // Determine the column
      const reviews = action.actionTimestamps?.filter(
        (timestamp) => timestamp.actionType === 'review'
      ) || [];
      reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const lastReview = reviews.length > 0 ? new Date(reviews[0].createdAt) : null;
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

      if (!action.actionTimestamps?.length) {
        groupedByCompetency[competency.id].columns.ToDo.push(concept);
      } else if (action.inProgress) {
        groupedByCompetency[competency.id].columns.Learning.push(concept);
      } else if (reviews.length < 3) {
        groupedByCompetency[competency.id].columns.Revision.push(concept);
      } else if (lastReview && lastReview > twoWeeksAgo) {
        groupedByCompetency[competency.id].columns.Done.push(concept);
      }
    }

    board.value = groupedByCompetency;
  } catch (error) {
    console.error('Error fetching Kanban data:', error);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchKanbanData();
});
</script>

<style scoped></style>
