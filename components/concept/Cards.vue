<template>
  <div class="row q-col-gutter-md q-row-gutter-md">
    <div
      v-for="(concept, idx) in concepts"
      :key="idx"
      class="col-12 col-sm-6 col-md-4">
    <q-card
      flat
      bordered
      class="cursor-pointer full-height column q-pb-sm"
      :class="{
        'primary-card': primaryCardId === concept.id,
      }"
      @click="$router.push(`/concept/${concept.id}`)"
    >
      <q-card-section class="col q-pb-none">
        <q-icon v-if="!concept.theory" name="warning" class="float-right text-warning" />
        <div class="text-h6 text-bold">{{ concept.name }}</div>
        <div class="q-mt-sm truncated-description">
          {{ concept.description }}
        </div>
      </q-card-section>
      <q-card-section v-if="concept.action" class="col-2 q-pt-none">
        <concept-status
          :concept="concept"
          :concept-action="concept.action"
        />
      </q-card-section>
      <q-card-actions v-if="allowDelete">
        <q-space/>
        <q-btn
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
  primaryCardId: { type: String, default: null },
});

defineEmits(["delete"]);
</script>

