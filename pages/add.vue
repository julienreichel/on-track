<template>
  <div class="q-gutter-sm q-pa-sm">
    <p class="text-h3 q-pt-md">Add subject</p>
    <q-input v-model="prompt" rows="6" type="textarea" />
    <q-btn label="Create" @click="sendRequest" />
    <div>
      <subject-cards
        :subjects="subjects"
      />
    </div>
  </div>
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

