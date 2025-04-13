<template>
  <div class="q-pa-sm">
    <q-card v-if="subjects.length" class="q-pt-xs">
      <q-card-section class="q-pt-none q-px-sm">
        <q-linear-progress :value="progress" class="q-mt-md" size="lg" />
      </q-card-section>
      <q-card-section>
        <q-list
          v-for="subject in visibleSubjects"
          :key="subject.id"
          class="row q-gutter-sm justify-center"
        >
          <q-slide-item
            right-color="negative"
            left-color="positive"
            class="col-12 col-sm-6 col-md-4"
            @right="rejectSubject(subject)"
            @left="acceptSubject(subject)"
          >
            <template #right>
              <q-icon name="thumb_down" />
            </template>
            <template #left>
              <q-icon name="thumb_up" />
            </template>
            <div>
              <q-item>
              <q-card flat bordered>
                <q-card-section class="text-h6 text-bold">
                  {{ subject.name }}
                </q-card-section>
                <q-card-section class="q-py-none q-mt-sm truncated-description">
                  {{ subject.description }}
                </q-card-section>
                <q-card-actions >
                  <q-space/>
                </q-card-actions>
                
              </q-card>
              </q-item>
            </div>
          </q-slide-item>
        </q-list>
        <notification-text v-if="showBanner">
          Swipe to the right to accept the subject, or to the left to reject it.
        </notification-text>
      </q-card-section>

      <q-card-actions class="q-px-none q-py-lg">
        <q-space />
        <q-btn
          v-if="canGo"
          square
          size="md"
          icon="chevron_right"
          color="primary"
          padding="sm 64px"
          @click="go"
        />
      </q-card-actions>
    </q-card>
  </div>
</template>

<script setup>
const router = useRouter();

const subjectService = useSubject();
const subjects = ref([]);
const selectedSubjects = ref([]);
const discardedSubjects = ref([]);


onMounted(async () => {
  const allSubjects = await subjectService.list();
  subjects.value = shuffleArray(allSubjects);
});
// show only 3 subjects at a time
const visibleSubjects = computed(() =>
  subjects.value
    .filter(
      (s) =>
        !selectedSubjects.value.includes(s) &&
        !discardedSubjects.value.includes(s)
    )
    .slice(0, 1)
);

const votedSubjectsCount = computed(
  () => selectedSubjects.value.length + discardedSubjects.value.length
);
const showBanner = computed(() => votedSubjectsCount.value < 2);

const progress = computed(() =>
  subjects.value.length > 0
    ? votedSubjectsCount.value / subjects.value.length
    : 0
);
const canGo = computed(
  () =>
    selectedSubjects.value.length > 0 &&
    (votedSubjectsCount.value >= 5 ||
      votedSubjectsCount.value === subjects.value.length)
);

const acceptSubject = (subject) => {
  selectedSubjects.value.push(subject);
  if (votedSubjectsCount.value === subjects.value.length) {
    go();
  }
};

const rejectSubject = (subject) => {
  discardedSubjects.value.push(subject);
  if (votedSubjectsCount.value === subjects.value.length) {
    go();
  }
};

const go = () => {
  if (selectedSubjects.value.length > 0) {
    const randomSubject =
      selectedSubjects.value[
        Math.floor(Math.random() * selectedSubjects.value.length)
      ];
    router.push(`/subject/${randomSubject.id}`);
  } else {
    router.push("/subjects");
  }
};

const shuffleArray = (array) => {
  return array.sort(() => Math.random() - 0.5);
};
</script>

<style></style>
