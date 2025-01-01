<template>
  <div class="row q-col-gutter-md q-row-gutter-md">
    <div
      v-for="(subject, idx) in subjects"
      :key="idx"
      class="col-12 col-md-4">
    <q-card
      flat
      bordered
      class="cursor-pointer"
      @click="$router.push(`/subject/${subject.id}`)"
    >
      <q-card-section>
        <div class="text-h6 text-bold">{{ subject.name }}</div>
        <div class="q-mt-sm truncated-description">
          {{ subject.description }}
        </div>
      </q-card-section>
      <q-card-actions>
        <q-space/>
        <q-btn
          v-if="allowDelete"
          icon="delete"
          flat
          dense
          @click.stop.prevent="$emit('delete', subject)"
        />
      </q-card-actions>
    </q-card>
  </div>
  </div>
</template>

<script setup>
defineProps({
  subjects: { type: Array, required: true },
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
