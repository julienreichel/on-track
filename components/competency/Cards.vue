<template>
  <div class="row q-col-gutter-md q-row-gutter-md">
    <div
      v-for="(competency, idx) in competencies"
      :key="idx"
      class="col-12 col-sm-6 col-md-4">
    <q-card
      flat
      bordered
      class="cursor-pointer full-height"
      :class="{
        'primary-card': primaryCardId === competency.id,
      }"
      @click="$router.push(`/competency/${competency.id}`)"
    >
      <q-card-section >
        <competency-level v-if="competency.action" class="float-right q-mr-none" :competency="competency" />
        <div class="text-h6 text-bold">{{ competency.name }}</div>
        <div class="q-mt-sm truncated-description">
          {{ competency.description }}
        </div>
      </q-card-section>
      <q-card-actions>
        <q-space/>
        <q-btn
          v-if="allowDelete"
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

defineEmits(["delete"]);
</script>

