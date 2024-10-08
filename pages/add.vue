<template>
  <q-page class="q-gutter-sm q-pa-sm">
    <p class="text-h6 q-pt-md">Add lectures</p>
    <q-input v-model="prompt" rows="6" type="textarea" />
    <q-btn label="Send Request" @click="sendRequest" />
    <q-input v-model="response" rows="6" readonly type="textarea" />
    <div style="height: 900px; width: 100%">
    <lecture-flow
      :lectures="lectures"
      :prerequisites="prerequisites"
    />
  </div>
  </q-page>
</template>

<script setup lang="ts">
const lectureService = useLecture();
const { loading } = useQuasar();


const prompt = ref("");
const response = ref("");
const isLoading = ref(false);
const lectures = ref([]);
const prerequisites = ref([]);


const sendRequest = async () => {
  loading.show();
  isLoading.value = true;
  response.value = ""; // Clear previous response

  const newLectures = prompt.value.split("\n");
  const { additionalLectures, touchedLectures, touchedPrerequisites } = await lectureService.createWithAI(newLectures);

  lectures.value = touchedLectures;
  prerequisites.value = touchedPrerequisites;

  response.value = additionalLectures.join("\n");

  isLoading.value = false;
  loading.hide();
};
</script>

