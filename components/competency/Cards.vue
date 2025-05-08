<template>
  <div class="row q-col-gutter-md q-row-gutter-md">
    <div
      v-for="(competency, idx) in competencies"
      :key="idx"
      class="col-12 col-sm-6 col-md-4">
    <q-card
      flat
      bordered
      class="cursor-pointer full-height column q-pb-sm"
      :class="{
        'primary-card': primaryCardId === competency.id,
      }"
      @click="$router.push(`/competency/${competency.id}`)"
    >
      <q-card-section class="col q-pb-xs">
        <competency-level v-if="competency.action" class="float-right q-mr-none" :competency="competency" />
        <div class="text-h6 text-bold">{{ competency.name }}</div>
        <div class="q-mt-sm truncated-description">
          {{ competency.description }}
        </div>
      </q-card-section>
      <q-card-section class="col-2 q-pt-none ">
        <q-linear-progress
          v-if="hasActions(competency)"
          :value="status(competency)"
          :color="color(competency)"
          size="25px">
          <div class="absolute-full flex flex-center">
            <q-badge
              color="white"
              text-color="primary"
              :label="`${statusText(competency)} %`"
            />
          </div>
        </q-linear-progress>
      </q-card-section>
      <q-card-actions v-if="allowDelete">
        <q-space/>
        <q-btn
          
          icon="delete"
          flat
          dense
          @click.stop.prevent="$emit('delete', competency)"
        />
      </q-card-actions>
    </q-card>
  </div>
  </div>
</template>

<script setup>
defineProps({
  competencies: { type: Array, required: true },
  allowDelete: { type: Boolean, default: false },
  primaryCardId: { type: String, default: null },
});

const hasActions = (competency) => {
  return competency.action || competency.concepts.some((concept) => concept.action);
}
const status = (competency) => {
  const nbConcepts = competency.concepts.length + 2;
  const nbCompleted = competency.concepts.filter((concept) => concept.action?.theory && !concept.action?.inProgress).length;
  const preQuizDone = competency.action?.actionTimestamps?.some((a) => a.actionType === "pre-quiz") ? 1: 0;
  const finalQuizDone = competency.action?.actionTimestamps?.some((a) => a.actionType === "final-quiz") ? 1 : 0;
  if (finalQuizDone){
    return 1;
  }
  return (nbCompleted + preQuizDone)/ nbConcepts;
}

const statusText = (competency) => {
  return Math.round(status(competency) * 10) * 10;
}

const color = (competency) => {
  const nbConcepts = competency.concepts.length;
  const nbCompleted = competency.concepts.filter((concept) => concept.action?.theory && !concept.action?.inProgress).length;
  if (nbCompleted < nbConcepts) {
    return "secondary";
  }
  const nbReviewed = competency.concepts.filter((concept) => concept.action?.answeredQuestions?.filter((q) => q.isValid).lenght >= 20).length;
  if (nbReviewed < nbConcepts) {
    return "secondary";
  }
  return "primary";
}

defineEmits(["delete"]);
</script>

