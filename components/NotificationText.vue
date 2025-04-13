<template>
  <q-banner v-if="show" class="bg-info q-mb-md">
    <slot>
      {{ text }}
    </slot>
  </q-banner>
</template>

<script setup>
defineProps({
  show: { type: Boolean, default: true },
  text: { type: String, default: '' },
});
</script>