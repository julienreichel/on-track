<template>
    <q-card flat>
      <q-card-section>
        <div class="text-h5 text-primary">Your Subjects</div>
      </q-card-section>
      <q-card-section>
        <notification-text v-if="!userSubjects.length">
          You are not currently working on any subjects. Start learning from the Subjects page!
        </notification-text>
        <div v-else>
          <q-list bordered>
            <q-expansion-item
              v-for="subject in userSubjects"
              :key="subject.id"
              expand-separator
              :content-inset-level="0.1"
              :label="subject.name"
              :header-class="'row items-center'"
              :expand-icon="null"
            >
              <template #header>
                <div class="row items-center q-gutter-sm full-width">
                  <div class="col text-subtitle1">{{ subject.name }}</div>
                  <q-badge
                    v-if="subject.startedCompetencies && subject.startedCompetencies.length"
                    :label="`${getSubjectCompletedCompetencies(subject)}/${subject.startedCompetencies.length}`"
                    color="primary"
                    class="q-ml-sm"
                    style="min-width: 36px; justify-content: center;"
                  />
                  <q-space />
                  <open-btn :to="`/subject/${subject.id}`" :aria-label="`Open ${subject.name}`" />
                </div>
              </template>
              <q-list v-if="subject.startedCompetencies && subject.startedCompetencies.length">
                <q-expansion-item
                  v-for="comp in subject.startedCompetencies"
                  :key="comp.id"
                  :label="comp.name"
                  :content-inset-level="0.6"
                  dense
                >
                  <template #header>
                    <div class="row items-center q-gutter-sm full-width">
                      <q-icon :name="getCompetencyIcon(comp.state)" :color="getCompetencyColor(comp.state)" class="q-mr-sm" />
                      <div class="col text-body1">{{ comp.name }}</div>
                      <q-badge
                        v-if="typeof comp.revisionOrMasteredCount === 'number' && typeof comp.totalConcepts === 'number'"
                        :label="`${comp.revisionOrMasteredCount}/${comp.totalConcepts}`"
                        color="secondary"
                        class="q-ml-sm"
                        style="min-width: 36px; justify-content: center;"
                      />
                      <q-space />
                      <open-btn :to="`/competency/${comp.id}`" :aria-label="`Open ${comp.name}`" />
                    </div>
                  </template>
                  <q-list v-if="comp.concepts && comp.concepts.length">
                    <q-item v-for="concept in comp.concepts" :key="concept.id" class="q-pl-md">
                      <q-item-section avatar>
                        <q-icon size="xs" :name="getConceptStatusIcon(concept)" :color="getConceptStatusColor(concept)" />
                      </q-item-section>
                      <q-item-section>
                        <div class="text-body2">{{ concept.name }}</div>
                      </q-item-section>
                      <q-item-section style="min-width: 180px; max-width: 220px;">
                        <concept-status v-if="concept.action" :concept="concept" :concept-action="concept.action" />
                      </q-item-section>
                      <q-item-section>
                        <div class="text-caption">
                          <span v-if="concept.nextReview" class="text-grey-7">Next review: {{ formatDate(concept.nextReview) }}</span>
                        </div>
                      </q-item-section>
                      <q-item-section side>
                        <open-btn :to="`/concept/${concept.id}`" :aria-label="`Open ${concept.name}`" />
                      </q-item-section>
                    </q-item>
                  </q-list>
                </q-expansion-item>
              </q-list>
              <div v-else class="q-pa-sm text-grey">No started competencies.</div>
            </q-expansion-item>
          </q-list>
        </div>
      </q-card-section>
    </q-card>

</template>

<script setup lang="ts">
const subjectService = useSubject();
const userSubjects = ref([]);

async function loadUserSubjects() {
  userSubjects.value = await subjectService.fetchUserSubjects();
}

onMounted(() => {
  loadUserSubjects();
});

// Extend ConceptWithAction to include state
interface ConceptWithAction {
  id: string;
  name: string;
  action?: { state?: string };
  state?: string;
  nextReview?: string | Date;
}

function getConceptStatusIcon(concept: ConceptWithAction) {
  switch (concept.state) {
    case 'mastered': return 'check_circle';
    case 'revision': return 'watch_later';
    case 'started': return 'pending';
    default: return 'radio_button_unchecked';
  }
}
function getConceptStatusColor(concept: ConceptWithAction) {
  switch (concept.state) {
    case 'mastered': return 'positive';
    case 'revision': return 'secondary';
    case 'started': return 'primary';
    default: return 'grey';
  }
}

function formatDate(date: string | Date) {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getCompetencyIcon(state: string) {
  switch (state) {
    case 'mastered': return 'check_circle';
    case 'ready_for_final': return 'ads_click';
    case 'started': return 'pending';
    default: return 'radio_button_unchecked';
  }
}
function getCompetencyColor(state: string) {
  switch (state) {
    case 'mastered': return 'positive';
    case 'ready_for_final': return 'warning';
    case 'started': return 'primary';
    default: return 'grey';
  }
}

function getSubjectCompletedCompetencies(subject: SubjectModel & { startedCompetencies?: StartedCompetency[] }) {
  if (!subject.startedCompetencies) return 0;
  return subject.startedCompetencies.filter(
    (comp: StartedCompetency) =>
      comp.state === 'mastered' 
  ).length;
}
</script>
