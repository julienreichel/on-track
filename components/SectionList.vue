<template>
  <q-list>
    <q-item
      v-for="(section, idx) in sections"
      :key="idx"
      class="q-pa-none"
      clickable
      @click="navigateTo(`/section/${section.id}`)"
    >
      <q-item-section>{{ section.name[locale] }}</q-item-section>
      <q-item-section avatar>
        <div class="row q-gutter-sm">
          <q-btn
            v-if="allowDelete && !section.introduction"
            label="delete"
            @click="$emit('delete', section)"
          />
        </div>
      </q-item-section>
    </q-item>
  </q-list>
</template>

<script setup>
defineProps({
  sections: { type: Array, required: true },
  locale: { type: String, default: "en" },
  allowDelete: { type: Boolean, default: false },
});

defineEmits(["delete"]);
</script>
