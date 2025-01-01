<template>
  <div class="row q-col-gutter-md q-row-gutter-md">
    <div
      v-for="(competency, idx) in competencies"
      :key="idx"
      class="col-12 col-md-4">
    <q-card
      flat
      bordered
      class="cursor-pointer"
      @click="$router.push(`/competency/${competency.id}`)"
    >
      <q-card-section>
        <div class="text-h6 text-bold">{{ competency.name }}</div>
        <div class="q-mt-sm truncated-description">
          {{ competency.description }}
        </div>
      </q-card-section>
      <q-card-section v-if="competency.action">
        <competency-status
          :competency="competency"
          :competency-action="competency.action"
        />
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
});

defineEmits(["delete"]);
</script>

<style scoped>
.truncated-description {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: normal;
}
</style>
