<template>
  <div class="row q-col-gutter-md q-row-gutter-md">
    <div
      v-for="(concept, idx) in concepts"
      :key="idx"
      class="col-12 col-sm-6 col-md-4">
    <q-card
      flat
      bordered
      class="cursor-pointer"
      @click="$router.push(`/concept/${concept.id}`)"
    >
      <q-card-section>
        <div class="text-h6 text-bold">{{ concept.name }}</div>
        <div class="q-mt-sm truncated-description">
          {{ concept.description }}
        </div>
      </q-card-section>
      <q-card-section v-if="concept.action">
        <concept-status
          :concept="concept"
          :concept-action="concept.action"
        />
      </q-card-section>
      <q-card-actions>
        <q-space/>
        <q-btn
          v-if="allowDelete"
          icon="delete"
          flat
          dense
          @click.stop.prevent="$emit('delete', concept)"
        />
      </q-card-actions>
    </q-card>
  </div>
  </div>
</template>

<script setup>
defineProps({
  concepts: { type: Array, required: true },
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
