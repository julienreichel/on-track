<template>
  <q-page class="q-gutter-sm q-pa-sm">
    <p class="text-h6 q-pt-md">Add subjects</p>
    <q-input v-model="prompt" rows="6" type="textarea" />
    <q-btn label="Send Request" @click="sendRequest" />
    <div style="height: 300px; width: 100%">
      <subject-list
        :subjects="subjects"
      />
    </div>
  </q-page>
</template>

<script setup lang="ts">
const subjectService = useSubject();
const { loading } = useQuasar();


const prompt = ref("");
const response = ref("");
const isLoading = ref(false);
const subjects = ref([]);


const sendRequest = async () => {
  loading.show();
  isLoading.value = true;
  response.value = ""; // Clear previous response

  const subject = await subjectService.createWithAI(prompt.value);

  subjects.value = [subject];

  isLoading.value = false;
  loading.hide();
};
</script>

