<template>
  <q-list>
    <q-item
      v-for="(concept, idx) in concepts"
      :key="idx"
      class="q-pa-none"
      clickable
      :to="`/concept/${concept.id}`"
    >
      <q-item-section>{{ concept.name }}</q-item-section>
      <q-item-section avatar>
        <div class="row q-gutter-sm">
          <q-btn
            v-if="allowDelete && !concept.introduction"
            label="delete"
            @click.stop.prevent="$emit('delete', concept)"
          />
        </div>
      </q-item-section>
    </q-item>
  </q-list>
</template>

<script setup>
defineProps({
  concepts: { type: Array, required: true },
  allowDelete: { type: Boolean, default: false },
});

defineEmits(["delete"]);
</script>
