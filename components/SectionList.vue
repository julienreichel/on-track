<template>
  <q-list>
    <q-item
      v-for="(section, idx) in sections"
      :key="idx"
      class="q-pa-none"
    >
      <q-item-section>{{ section.name[locale] }}</q-item-section>
    </q-item>
  </q-list>
</template>


<script setup>
defineProps({
  sections: { type: Array, required: true },
  locale: { type: String, default: "en" },
});

</script>
