<template>
  <div class="q-pa-md">
    <q-card>
      <q-card-section>
        <div class="text-h5 text-primary">Your Subjects</div>
      </q-card-section>
      <q-card-section>
        <notification-text v-if="!userSubjects.length">
          You are not currently working on any subjects. Start learning from the Subjects page!
        </notification-text>
        <subject-cards v-else :subjects="userSubjects" />
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup lang="ts">
const subjectService = useSubject();
const competencyActionService = useCompetencyAction();
const conceptActionService = useConceptAction();

const userSubjects = ref([]);

// Helper type for actions
// (same as in layout)
type AnyAction = Record<string, unknown>;
function extractActionWithSubject(a: AnyAction): { subjectId?: string, actionTimestamps?: { createdAt: string }[], createdAt?: string } {
  return {
    subjectId: typeof a.subjectId === 'string' ? a.subjectId : undefined,
    actionTimestamps: Array.isArray(a.actionTimestamps) ? a.actionTimestamps as { createdAt: string }[] : undefined,
    createdAt: typeof a.createdAt === 'string' ? a.createdAt : undefined
  };
}

async function fetchUserSubjects() {
  try {
    // @ts-expect-error: NuxtApp type is unknown, but $Amplify.Auth is present in runtime
    const { getCurrentUser } = useNuxtApp().$Amplify.Auth;
    const currentUser = await getCurrentUser();
    const { userId, username } = currentUser;
    // Fetch all actions
    const [competencyActions, conceptActions] = await Promise.all([
      competencyActionService.list({ userId, username }),
      conceptActionService.list({ userId, username })
    ]);
    // Extract unique subjectIds and last action date
    const subjectIdToLastAction: Record<string, Date> = {};
    const subjectIds = new Set<string>();
    function processActionRaw(a: AnyAction) {
      const { subjectId, actionTimestamps, createdAt } = extractActionWithSubject(a);
      if (!subjectId) return;
      subjectIds.add(subjectId);
      let lastDate: Date | undefined = undefined;
      if (Array.isArray(actionTimestamps) && actionTimestamps.length) {
        const last = actionTimestamps[actionTimestamps.length-1];
        if (last && last.createdAt) lastDate = new Date(last.createdAt);
      } else if (createdAt) {
        lastDate = new Date(createdAt);
      }
      if (lastDate) {
        const prev = subjectIdToLastAction[subjectId];
        if (!prev || lastDate > prev) subjectIdToLastAction[subjectId] = lastDate;
      }
    }
    competencyActions.forEach(processActionRaw);
    conceptActions.forEach(processActionRaw);
    // Fetch subject details
    const allSubjects = await subjectService.list();
    userSubjects.value = Array.from(subjectIds)
      .map(id => allSubjects.find(s => s.id === id))
      .filter((s): s is { id: string } => !!s)
      .sort((a, b) => {
        const dateA = subjectIdToLastAction[a.id] || new Date(0);
        const dateB = subjectIdToLastAction[b.id] || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
  } catch (e) {
    console.error('Failed to fetch user subjects', e);
  }
}

onMounted(() => {
  fetchUserSubjects();
});
</script>
