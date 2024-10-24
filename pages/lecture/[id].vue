<template>
  <div v-if="lecture" class="q-pa-sm">
    <lecture-flow
      :lectures="relatedLectures"
      :prerequisites="relatedLinks"
      direction="LR"
      :style="{height: `${height}px`, width: '100%' }"
    />
    <h1>{{ lecture.name[locale] }}</h1>
    <q-btn v-if="!lecture.description" @click="generateLectureData()">Generate</q-btn>
    <p v-if="lecture.description" style="max-width:600px" >{{ lecture.description[locale] }}</p>
    <div v-if="lecture.objectives?.length">
      <h3>Objective</h3>
      <objective-list :objectives="lecture.objectives" :locale="locale"/>
    </div>
    <div v-if="lecture.sections?.length">
      <h3>Sections</h3>
      <section-list :sections="lecture.sections" :locale="locale" allow-delete @delete="deleteSection"/>
      <q-btn v-if="lecture.sections.some(s => !s.introduction)" @click="generateSectionsData()">Generate</q-btn>
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

const relatedLectures = computed(() => {
  const relatedLectures = [lecture.value];
  if (lecture.value?.prerequisites){
    lecture.value.prerequisites.forEach((p) => relatedLectures.push(p.prerequisite));
  }
  if (lecture.value?.followUps){
    lecture.value.followUps.forEach((f) => relatedLectures.push(f.lecture));
  }
  console.log(relatedLectures);
  return relatedLectures;
});
const relatedLinks = computed(() => {
  const relatedLinks = [];
  console.log(lecture.value);
  if (lecture.value?.prerequisites){
    lecture.value.prerequisites.forEach((p) => relatedLinks.push({ id: p.prerequisite.id, prerequisiteId: p.prerequisite.id, lectureId: lecture.value.id}));
  }
  if (lecture.value?.followUps){
    lecture.value.followUps.forEach((f) => relatedLinks.push({ id: f.lecture.id, prerequisiteId: lecture.value.id, lectureId: f.lecture.id}));
  }
  console.log(relatedLinks);
  return relatedLinks;
});

const height = computed(() => {
  return Math.max(lecture.value?.prerequisites?.length || 0, lecture.value?.followUps?.length || 0) * 100;
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
