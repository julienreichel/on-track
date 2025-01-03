<template>
  <div class="q-gutter-sm q-pa-sm">
    <p class="text-h3 q-pt-md">Add subject</p>
    <q-input v-model="prompt" rows="6" type="textarea" />
    <div class="row q-col-gutter-md q-pa-sm">
      <q-select
        v-model="locale"
        outlined
        emit-value
        map-options
        :options="locales"
        label="Language"
        class="col"
      />

      <q-toggle
        v-model="enableCompetencies"
        label="Create Competencies"
        class="col"
      />

      <q-toggle
        v-model="enableConcepts"
        :disable="!enableCompetencies"
        label="Create Concepts"
        class="col"
      />
    </div>

    <q-btn label="Create" @click="sendRequest" />

    <div>
      <subject-cards :subjects="subjects" />
      <div v-for="subject in subjects" :key="subject.id">
        <p class="text-h4 q-pt-md">Competencies</p>
        <competency-cards :competencies="subject.competencies" />
      </div>
    </div>
  </div>
</template>

<script setup lang="js">
const subjectService = useSubject();
const competencyService = useCompetency();
const conceptService = useConcept();
const { loading } = useQuasar();

const prompt = ref("");
const response = ref("");
const subjects = ref([]);
const locale = ref("en");
const locales = [
  { label: "English", value: "en" },
  { label: "French", value: "fr" },
];

const enableCompetencies = ref(false);
const enableConcepts = ref(false);

const sendRequest = async () => {
  loading.show();
  response.value = ""; // Clear previous response
  try {
    const subject = await subjectService.createWithAI(prompt.value, locale.value);

    if (subject) {
      subjects.value = [subject];

      if (enableCompetencies.value) {
        await Promise.all(
          subject.competencies.map((c) => {
            if (!c.concepts?.length) {
              return competencyService.createWithAI(c);
            }
          })
        );

        if (enableConcepts.value) {
          for (const competency of subject.competencies) {
            await Promise.all(
              competency.concepts.map(async (c) => {
                if (!c.theory) {
                  await conceptService.createWithAI(c, locale.value);
                  await Promise.all(
                    [1, 2, 3, 4].map((l) => conceptService.addQuizWithAI(c, l))
                  );
                }
              })
            );
          }
        }
      }
    }
  } catch (error) {
    console.error("Error creating subject:", error);
  } finally {
    loading.hide();
  }
};
</script>

<style scoped>

</style>
