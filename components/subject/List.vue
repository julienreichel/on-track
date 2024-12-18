<template>
  <q-list>
    <q-item
      v-for="(subject, idx) in subjects"
      :key="idx"
      class="q-pa-none"
      clickable
      :to="`/subject/${subject.id}`"
    >
      <q-item-section>{{ subject.name }}</q-item-section>
      <q-item-section avatar>
        <div class="row q-gutter-sm">
          <q-btn
            v-if="allowDelete"
            label="delete"
            @click="$emit('delete', subject)"
          />
        </div>
      </q-item-section>
    </q-item>
  </q-list>
</template>

<script setup>
defineProps({
  subjects: { type: Array, required: true },
  allowDelete: { type: Boolean, default: false },
});

defineEmits(["delete"]);
</script>
