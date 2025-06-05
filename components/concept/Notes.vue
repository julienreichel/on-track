<template>
  <div>
    <div class="text-caption">Click to add or edit notes</div>
    <editable-text
      :value="notes"
      :enable-editing="true"
      :place-holder="placeholder"
      type="textarea"
      class="q-pa-sm"
      use-rich-text
      @update="$emit('update', $event)"
    />
  </div>
</template>
<script setup>
defineProps({
  notes: { type: String, default: '' },
  placeholder: { type: String, default: 'Add your notes here...' },
});
defineEmits(['update']);
</script>
