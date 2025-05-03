<template>
  <div class="q-gutter-sm q-pa-sm">
    <p class="text-h3 q-pt-md">Add subject</p>

    <!-- Subject description -->
    <q-input v-model="prompt" rows="6" type="textarea" :disable="!!subject" label="Subject Description" />

    <!-- Language and expected length -->
    <div class="row q-col-gutter-md q-pa-sm">
      <q-select
        v-model="locale"
        outlined
        emit-value
        map-options
        :options="locales"
        :disable="!!subject"
        label="Language"
        class="col-6"
      />

      <q-select
        v-model="length"
        outlined
        emit-value
        map-options
        :options="lengths"
        :disable="!!subject"
        label="Expected Length"
        class="col-6"
      />
    </div>

    <!-- Generate button -->
    <q-btn v-if="!subject" label="Generate Structure" @click="sendRequest" />
    <q-linear-progress v-if="nbRequest" size="xl" color="primary" :value="nbRequestDone / nbRequest" />

    <!-- Show structure -->
    <div v-if="subject">
      <p class="text-h4">{{subject.name}}</p>
      <p class="">{{subject.description}}</p>
      <q-list padding>
        <q-expansion-item
          v-for="(comp, index) in subject.competencies"
          :key="index"
          :label="comp.name"
          :caption="comp.description"
          expand-separator
        >
          <q-list padding class="q-ml-md">
            <q-item v-for="concept in comp.concepts" :key="concept.name">
              <q-item-section>
                <q-item-label>{{ concept.name }}</q-item-label>
                <q-item-label caption>{{ concept.description }}</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-expansion-item>
      </q-list>

      <div>
        <q-btn label="Generate Content" color="primary" class="q-mr-md" @click="generateConcepts" />
        <q-btn label="Delete and Restart" color="secondary" @click="regenerate" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const subjectService = useSubject();
const conceptService = useConcept();
const { loading } = useQuasar();

const prompt = ref("");
const locale = ref<Locale>("en");
const length = ref(1);

const subject = ref<SubjectModel | null>(null);
const nbRequest = ref(0);
const nbRequestDone = ref(0);

const locales = [
  { label: "English", value: "en" },
  { label: "French", value: "fr" },
];

const lengths = [
  { label: "Very short (10-30 min)", value: 0 },
  { label: "Short (~1 hour)", value: 1 },
  { label: "Medium (2-3 hours)", value: 2 },
  { label: "Long (4-5 hours)", value: 3 },
  { label: "Very long (~6 hours)", value: 4 },
];

const sendRequest = async () => {
  loading.show();
  nbRequest.value = 1;
  nbRequestDone.value = 0;

  try {
    nbRequestDone.value += 0.5;
    subject.value = await subjectService.createWithAIV2(prompt.value, length.value, locale.value);
    nbRequestDone.value += 0.5;
  } catch (error) {
    console.error("Error creating subject:", error);
  } finally {
    loading.hide();
    nbRequest.value = 0;
  }
};

const generateConcepts = async () => {
  if (!subject.value) return;

  loading.show();
  nbRequest.value = subject.value.competencies.reduce((sum: number, c: CompetencyModel) => sum + (c.concepts?.length || 0) * 5, 0);
  nbRequestDone.value = 0;

  try {
    await Promise.all(
      subject.value.competencies.flatMap((comp: CompetencyModel) =>
        comp.concepts.map(async (concept) => {
          if (!concept.theory) {
            await conceptService.createWithAI(concept);
            nbRequestDone.value++;
            await Promise.all(
              [1, 2, 3, 4].map(async (l) => {
                await conceptService.addQuizWithAI(concept, l);
                nbRequestDone.value++;
              })
            );
          }
        })
      )
    );
  } catch (error) {
    console.error("Error generating concepts:", error);
  } finally {
    loading.hide();
    nbRequest.value = 0;
  }
};

const regenerate = async () => {
  if (subject.value) {
    await subjectService.delete(subject.value);
  }  
  subject.value = null;
};
</script>

