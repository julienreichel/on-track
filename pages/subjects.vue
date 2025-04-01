<template>
  <div class="q-pa-sm">
    <q-card class="q-mb-md">
      <q-card-section class="q-pb-none">
        <div class="text-h5 text-primary">Subjects list</div>
      </q-card-section>
      <q-card-section>
        <p v-if="notStarted" >
          Pick any subject from the list bellow to start your learning journey.
        </p>
        <p v-else >
          Explore any subject from the list bellow to continue your learning journey.
        </p>
      </q-card-section>
      </q-card>
    <subject-cards :subjects="subjects" :allow-delete="teacherMode" @delete="deleteSubject"/>
  </div>
</template>


<script setup lang="js">
const subjectService = useSubject();
const competencyActionService = useCompetencyAction();

const teacherMode = inject('teacherMode');
const subjects = ref([]);
const notStarted = ref(true);

const fetchUserActions = async (subjects) => {
  try {
    // Get current user
    const { getCurrentUser } = useNuxtApp().$Amplify.Auth;
    const currentUser = await getCurrentUser();
    const { userId, username } = currentUser;

    // fetch competencies actions
    const competencyActions = await competencyActionService.list({
      userId,
      username,
    });
    // very simple flag for now, ideally we want to indicate some notion of progress
    competencyActions.forEach((a) => {
      console.log(a);
      const subject = subjects.find(
        (s) => s.id === a.subjectId
      );
      subject.inProgress = true;
    });
    if (competencyActions.length) {
      notStarted.value = false;
    }
    
  } catch (error) {
    console.error("Error fetching user history:", error);
  }
};

onMounted(async () => {
  subjects.value = await subjectService.list();
  fetchUserActions(subjects.value);
});

const deleteSubject = async (subject) => {
  await subjectService.delete(subject);

  subjects.value = subjects.value.filter((s) => s.id !== subject.id);
}
</script>
