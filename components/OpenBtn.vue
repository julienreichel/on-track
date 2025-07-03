<template>
  <q-btn
    flat
    dense
    round
    icon="open_in_new"
    :to="to"
    :aria-label="ariaLabel"
    @click.stop
  />
</template>

<script setup lang="ts">
const props = defineProps({
  to: { type: String, required: true },
  ariaLabel: { type: String, required: true },
});
</script>
