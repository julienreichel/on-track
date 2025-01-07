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

    <q-btn v-if="!nbRequest" label="Create" @click="sendRequest" />
    <q-linear-progress v-if="nbRequest" size="xl" color="primary" :value="nbRequestDone / nbRequest" />

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
const subjects = ref([]);
const locale = ref("en");
const locales = [
  { label: "English", value: "en" },
  { label: "French", value: "fr" },
];

const enableCompetencies = ref(false);
const enableConcepts = ref(false);

const nbRequestDone = ref(0);
const nbRequest = ref(0);

const sendRequest = async () => {
  loading.show();
  nbRequest.value = 1 + (enableCompetencies.value ? 6 : 0) + (enableConcepts.value ? 6 * 6 * (1 + 4)  : 0);
  nbRequestDone.value = 0;
  try {
    nbRequestDone.value += 0.5;
    const subject = await subjectService.createWithAI(prompt.value, locale.value);
    nbRequestDone.value += 0.5;

    if (subject) {
      subjects.value = [subject];

      if (enableCompetencies.value) {
        const nbCompetencies = subject.competencies.length;
        nbRequest.value = 1 + (enableCompetencies.value ? nbCompetencies : 0) + (enableConcepts.value ? nbCompetencies * 6 * (1 + 4)  : 0);
        await Promise.all(
          subject.competencies.map(async (c) => {
            if (!c.concepts?.length) {
              await competencyService.createWithAI(c);
            }
            nbRequestDone.value++;
            if (enableConcepts.value) {
              const nbConcepts = c.concepts.length;
              nbRequest.value = nbRequest.value - 6 * (1 + 4) + nbConcepts * (1 + 4);
              await Promise.all(
                c.concepts.map(async (cc) => {
                  if (!cc.theory) {
                    await conceptService.createWithAI(cc, locale.value);
                    nbRequestDone.value++;
                    await Promise.all(
                      [1, 2, 3, 4].map(async (l) => {
                        await conceptService.addQuizWithAI(cc, l);
                        nbRequestDone.value++;
                      })
                    );
                  }
                })
              );
            }
          })
        );
        nbRequestDone.value = nbRequest.value;
      }
    }
  } catch (error) {
    console.error("Error creating subject:", error);
  } finally {
    loading.hide();
    nbRequest.value = 0;
  }
};
</script>

<style scoped>

</style>
