<template>
  <q-list>
  <q-item
    v-for="(competency, idx) in competencies"
    :key="idx"
    class="q-pa-none"
    clickable
    @click="navigateTo(`/competency/${competency.id}`)"
  >
    <q-item-section>{{ competency.name }}</q-item-section>
    <q-item-section avatar>
        <div class="row q-gutter-sm">
          <q-btn
            v-if="allowDelete"
            label="delete"
            @click.stop.prevent="$emit('delete', competency)"
          />
        </div>
      </q-item-section>
  </q-item>
</q-list>
</template>

<script setup>

defineProps({
  competencies: { type: Array, required: true },
  allowDelete: { type: Boolean, default: false },
})

defineEmits(["delete"]);

</script>
