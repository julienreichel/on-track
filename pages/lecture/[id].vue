<template>
  <div v-if="lecture" class="q-pa-sm">
    <h1>{{ lecture.name[locale] }}</h1>
    <q-btn v-if="!lecture.description" @click="generateLectureData()">Generate</q-btn>
    <p v-if="lecture.description" style="max-width:600px" >{{ lecture.description[locale] }}</p>
    <div v-if="lecture.prerequisites?.length">
      <h3>Prerequisites</h3>
      <lecture-list
        :lectures="lecture.prerequisites.map((p) => p.prerequisite)"
      />
    </div>
    <div v-if="lecture.objectives?.length">
      <h3>Objective</h3>
      <objective-list :objectives="lecture.objectives" :locale="locale"/>
    </div>
    <div v-if="lecture.sections?.length">
      <h3>Sections</h3>
      <section-list :sections="lecture.sections" :locale="locale" allow-delete @delete="deleteSection"/>
      <q-btn v-if="lecture.sections.some(s => !s.introduction)" @click="generateSectionsData()">Generate</q-btn>
    </div>
    <div v-if="lecture.followUps?.length">
      <h3>Follow up</h3>
      <lecture-list :lectures="lecture.followUps.map((f) => f.lecture)" :locale="locale"/>
    </div>
  </div>
  <div v-else>
    <p>Loading...</p>
  </div>
</template>

<script setup>
const lectureService = useLecture();
const sectionService = useSection();
const route = useRoute();
const { loading } = useQuasar();

const lecture = ref(null);

const locale = ref("en");

onMounted(async () => {
  try {
    const lectureId = route.params.id;
    lecture.value = await lectureService.get(lectureId, {
      selectionSet: [
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

const deleteSection = async (section) => {
  loading.show();

  await sectionService.delete(section);

  lecture.value.sections = lecture.value.sections.filter((s) => s.id !== section.id);

  loading.hide();
}

const generateSectionsData = async () => {
  loading.show();

  const sections = await sectionService.createWithAI( lecture.value );

  console.log(sections);

  loading.hide();
}
</script>

<style scoped>
/* Add your styles here */
</style>
