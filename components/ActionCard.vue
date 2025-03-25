<template>
  <q-card>
    <q-card-section v-if="title" class="q-pb-none">
      <div class="text-h5">{{title}}</div>
    </q-card-section>
    <q-card-section v-if="title" class="q-pb-none">
      <slot>
        <div>{{description}}</div>
      </slot>
    </q-card-section>
    <q-card-actions class="q-px-none q-py-lg">
      <q-space />
      <q-btn
        square
        size="md"
        :icon-right="icon"
        :label="label"
        color="primary"
        padding="sm 64px"
        :to="to"
        @click="$emit('activated')"
      />
    </q-card-actions>
  </q-card>
</template>

<script setup>
defineProps({
  title: { type: String, default: null },
  description: { type: String, default: null },
  label: { type: String, default: null },
  icon: { type: String, default: "chevron_right" },
  to: { type: String, default: null },
});

defineEmits(["activated"]);
</script>