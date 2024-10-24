<template>
  <div v-if="section" class="q-pa-sm">
    <h1>{{ section.name[locale] }}</h1>
    <rich-text-renderer v-if="section.introduction" :markdown-content="section.introduction[locale]" />

    <div v-if="section.objectives?.length">
      <h3>Objectives</h3>
      <objective-list :objectives="section.objectives" :locale="locale" />
    </div>

    <div v-if="section.theory">
      <h3>Theory</h3>
      <rich-text-renderer :markdown-content="section.theory[locale]" />
    </div>

    <div v-if="section.examples">
      <h3>Examples</h3>
      <rich-text-renderer :markdown-content="section.examples[locale]" />
    </div>

    <h3>Questions</h3>
    <div v-if="section.questions">
      <quiz-list :questions="section.questions.sort(() => Math.random() - 0.5)" />
    </div>
    <div v-else>
      <q-btn @click="generateQuizData()">Generate</q-btn>
    </div>

    <h3>Lecture</h3>
    <lecture-list :lectures="[section.lecture]" />

    <div v-if="section.lecture.sections?.length">
      <h3>Other Sections</h3>
      <section-list
        :sections="section.lecture.sections.filter((s) => s.id !== section.id)"
        :locale="locale"
      />
    </div>
  </div>
  <div v-else>
    <p>Loading section data...</p>
  </div>
</template>

<script setup>
const route = useRoute();
const sectionService = useSection();
const { loading } = useQuasar();

const section = ref(null);
const locale = ref("en");

onMounted(async () => {
  try {
    const sectionId = route.params.id;
    section.value = await sectionService.get(sectionId);
  } catch (error) {
    console.error("Failed to fetch section:", error);
  }
});

const generateQuizData = async (level) => {
  loading.show();
  if (level) {
    await sectionService.addQuizWithAI(section.value, level, locale.value);
  } else {
    await Promise.all([1, 2, 3, 4].map(l => sectionService.addQuizWithAI(section.value, l, locale.value)));
  }
  await sectionService.update(section.value);
  loading.hide();
};
</script>
