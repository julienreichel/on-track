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
const userSubjects = ref([]);

async function loadUserSubjects() {
  userSubjects.value = await subjectService.fetchUserSubjects();
}

onMounted(() => {
  loadUserSubjects();
});
</script>
