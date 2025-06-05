<template>
  <div>
    <q-breadcrumbs class="q-px-sm q-pt-sm text-primary">
      <q-breadcrumbs-el label="Subjects" to="/subjects" class="gt-sm" />
      <q-breadcrumbs-el
        :label="concept.competency?.subject?.name"
        :to="`/subject/${concept.competency?.subject?.id}`"
        class="gt-sm"
      />
      <q-breadcrumbs-el
        :label="concept.competency?.name"
        :to="`/competency/${concept.competency?.id}`"
      />
    </q-breadcrumbs>
    <editable-text
      :value="concept.name"
      :enable-editing="teacherMode"
      class="text-h3 q-px-sm"
      @update="(text) => $emit('update-concept', 'name', text)"
    />
    <editable-text
      v-if="showIntro || teacherMode"
      :value="concept.description"
      :enable-editing="teacherMode"
      type="textarea"
      class="q-px-md"
      use-rich-text
      @update="(text) => $emit('update-concept', 'description', text)"
    />
  </div>
</template>
<script setup>
defineProps({
  concept: Object,
  teacherMode: Boolean,
  showIntro: Boolean,
});
defineEmits(['update-concept']);
</script>
