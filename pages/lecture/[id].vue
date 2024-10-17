<template>
  <div v-if="lecture" class="q-pa-sm">
    <h1>{{ lecture.name.en }}</h1>
    <q-btn v-if="!lecture.description" @click="generateLectureData()">Generate</q-btn>
    <p style="max-width:600px">{{ lecture.description?.en }}</p>
    <div v-if="lecture.prerequisites?.length">
      <h3>Prerequisites</h3>
      <lecture-list
        :lectures="lecture.prerequisites.map((p) => p.prerequisite)"
      />
    </div>
    <div v-if="lecture.objectives?.length">
      <h3>Objective</h3>
      <objective-list :objectives="lecture.objectives" />
    </div>
    <div v-if="lecture.sections?.length">
      <h3>Sections</h3>
      <section-list :sections="lecture.sections" />
    </div>
    <div v-if="lecture.followUps?.length">
      <h3>Follow up</h3>
      <lecture-list :lectures="lecture.followUps.map((f) => f.lecture)" />
    </div>
  </div>
  <div v-else>
    <p>Loading...</p>
  </div>
</template>

<script setup>
const lectureService = useLecture();
const route = useRoute();
const { loading } = useQuasar();

const lecture = ref(null);

const locale = "en";

onMounted(async () => {
  try {
    const lectureId = route.params.id;
    lecture.value = await lectureService.get(lectureId, {
      include: [
        "id",
        "name.*",
        "description.*",
        "objectives.*",
        "sections.*",
        "prerequisites.prerequisite.*",
        "followUps.lecture.*",
      ],
    });
  } catch (error) {
    console.error("Failed to fetch lecture:", error);
  }
});

const generateLectureData = async () => {
  loading.show();

  const { touchedLectures } = await lectureService.createWithAI( [lecture.value.name[locale]] );

  if (!touchedLectures.length){
    loading.hide();
    return;
  }
  lecture.value = touchedLectures[0];

  loading.hide();
}
</script>

<style scoped>
/* Add your styles here */
</style>
