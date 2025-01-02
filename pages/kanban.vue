<template>
  <div class="q-pa-sm" style="min-width: 1024px;">
    <div class="text-h3 q-mb-md">Kanban Board</div>
    <q-card flat bordered>
      <q-card-section class="q-pa-sm">
        <q-spinner
          v-if="loading"
          color="primary"
          size="lg"
          class="q-my-sm text-center"
        />
        <div v-else>
          <!-- Header Row with Column Titles -->
          <div class="row q-col-gutter-sm">
            <div class="col-2">
              <div class="text-h5 text-center">Competency</div>
            </div>
            <div class="col-10">
              <div class="row q-col-gutter-sm">
                <div v-for="column in columns" :key="column" class="col">
                  <div class="text-h5 text-center">{{ column }}</div>
                </div>
              </div>
            </div>
          </div>
          <q-separator class="q-my-md" />
          <!-- Rows for Competencies -->
          <div v-for="(competency, competencyId) in board" :key="competencyId">
            <div class="row q-col-gutter-sm">
              <div class="col-2 q-pb-sm">
                <q-card
                  flat
                  bordered
                  class="q-mb-sm cursor-pointer bg-secondary text-white full-height "
                  @click="$router.push(`/competency/${competencyId}`)"
                >
                  <q-card-section class="">{{
                    competency.name
                  }}</q-card-section>
                </q-card>
              </div>
              <div class="col-10">
                <div class="row q-col-gutter-sm">
                  <div v-for="column in columns" :key="column" class="col">
                    <q-card
                      v-for="concept in competency.columns[column]"
                      :key="concept.id"
                      flat
                      bordered
                      class="cursor-pointer q-mb-sm"
                      @click="$router.push(`/concept/${concept.id}`)"
                    >
                      <q-card-section class="q-pb-xs">
                        {{ concept.name }}
                      </q-card-section>
                      <q-card-section class="q-pt-xs">
                        <div v-if="column === 'ToDo'" class="row">
                          <q-space />
                          <q-icon
                            name="cancel"
                            class="cursor-pointer"
                            @click.stop.prevent="deleteConceptAction(concept)"
                          />
                        </div>

                        <!-- Actions for Learning -->
                        <div v-else-if="column === 'Learning'" class="row">
                          <q-icon
                            name="article"
                            :color="
                              concept.action.theory ? 'primary' : 'grey-4'
                            "
                          />
                          <q-icon
                            name="ballot"
                            :color="
                              concept.action.examples ? 'primary' : 'grey-4'
                            "
                          />
                          <q-icon
                            name="check_box"
                            :color="
                              concept.action.usedFlashCards?.filter(
                                (fc) => fc.isOk
                              ).length >= 3
                                ? 'primary'
                                : 'grey-4'
                            "
                          />
                          <q-icon
                            name="help_center"
                            :color="
                              concept.action.answeredQuestions?.filter(
                                (q) => q.isValid
                              ).length >= 8
                                ? 'primary'
                                : 'grey-4'
                            "
                          />
                        </div>

                        <!-- Actions for Revision -->
                        <div v-else-if="column === 'Revision'" class="row">
                          <q-icon
                            v-for="i in 5"
                            :key="i"
                            :name="getBatteryIcon(concept.action, i)"
                          />
                        </div>

                        <!-- Actions for Done -->
                        <div v-else-if="column === 'Done'" class="row">
                          <q-space />
                          <q-icon
                            name="visibility_off"
                            class="cursor-pointer"
                            @click.stop.prevent="hideTask(concept)"
                          />
                        </div>
                      </q-card-section>
                    </q-card>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Follow-Up Concepts Section -->
    <div v-if="!loading" class="q-my-sm">
      <div class="text-h5 q-mb-md">Backlog</div>
      <q-card flat>
        <q-card-section class="q-pa-sm">
          <div class="row q-col-gutter-sm">
            <div
              v-for="concept in followUpConcepts"
              :key="concept.id"
              class="col-2"
            >
              <q-card flat bordered>
                <q-card-section class="q-pb-xs">
                  {{ concept.name }}
                </q-card-section>
                <q-card-section class="q-pt-xs row">
                  <q-space />
                  <q-icon
                    name="add_circle"
                    class="cursor-pointer"
                    @click="addFollowUpConcept(concept)"
                  />
                </q-card-section>
              </q-card>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </div>
  </div>
</template>

<script setup lang="js">

const board = ref({});
const columns = ["ToDo", "Learning", "Revision", "Done"];
const loading = ref(true);
const followUpConcepts = ref([]);

const conceptActionService = useConceptAction();
const conceptService = useConcept();

const deleteConceptAction = async (concept) => {
  try {
    await conceptActionService.delete(concept.action);
    const columns = board.value[concept.competency.id].columns
    columns.ToDo = columns.ToDo.filter(c => c.id !== concept.id);
    followUpConcepts.value.push(concept);
  } catch (error) {
    console.error("Error deleting concept action:", error);
  }
};

const hideTask = async (concept) => {
  try {
    const timestamp = { createdAt: new Date().toISOString(), actionType: "hidden" };
    concept.action.actionTimestamps.push(timestamp);
    await conceptActionService.update(concept.action);
    const columns = board.value[concept.competency.id].columns
    columns.Done = columns.Done.filter(c => c.id !== concept.id);
  } catch (error) {
    console.error("Error hiding task:", error);
  }
};

const getBatteryIcon = (action, index) => {
  const correctAnswers = action.answeredQuestions?.filter(q => q.isValid).length || 0;
  const fullBatteries = Math.floor(correctAnswers / 4);
  if (index <= fullBatteries) return "battery_full";
  const remaining = correctAnswers % 4;
  if (index === fullBatteries + 1) {
    if (remaining >= 3) return "battery_6_bar";
    if (remaining >= 2) return "battery_4_bar";
    if (remaining >= 1) return "battery_2_bar";
  }
  return "battery_0_bar";
};

const addFollowUpConcept = async (concept) => {
  try {
    await conceptActionService.create({
      conceptId: concept.id,
      inProgress: true,
    });
    followUpConcepts.value = followUpConcepts.value.filter(c => c.id !== concept.id);
    concept = await conceptService.get(concept.id);
    existingConceptIds.add(concept.id);
    concept.action = { inProgress: true };
    board.value[concept.competency.id].columns.ToDo.push(concept);
    for (const followUp of concept.followUps) {
      if (!existingConceptIds.has(followUp.concept.id) && !followUpConcepts.value.some(c => c.id === followUp.concept.id)){
        followUpConcepts.value.push(followUp.concept);
      }
    }
  } catch (error) {
    console.error("Error adding follow-up concept:", error);
  }
};

const existingConceptIds = new Set();

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
      if (action.actionTimestamps?.some(ts => ts.actionType === 'hidden')) continue;

      const concept = await conceptService.get(action.conceptId);
      if(!concept) continue;
      concept.action = action;
      const competency = concept.competency;
      existingConceptIds.add(concept.id);

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

      if (!action.actionTimestamps?.length) {
        groupedByCompetency[competency.id].columns.ToDo.push(concept);
      } else if (action.inProgress) {
        groupedByCompetency[competency.id].columns.Learning.push(concept);
      } else if (reviews.length < 3) {
        groupedByCompetency[competency.id].columns.Revision.push(concept);
      } else {
        groupedByCompetency[competency.id].columns.Done.push(concept);
      }

      // Collect follow-up concepts
      for (const followUp of concept.followUps) {
        if (!followUpConcepts.value.some(c => c.id === followUp.concept.id)) {
          followUpConcepts.value.push(followUp.concept);
        }
      }
    }
    followUpConcepts.value = followUpConcepts.value.filter(c => !existingConceptIds.has(c.id));

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
