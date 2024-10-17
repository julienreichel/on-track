<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn
          flat
          dense
          round
          icon="menu"
          aria-label="Menu"
          @click="toggleLeftDrawer"
        />

        <q-toolbar-title> On-track </q-toolbar-title>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" bordered>
      Empty
    </q-drawer>

    <q-page-container>
      <slot />
    </q-page-container>
  </q-layout>
</template>
<script setup lang="ts">

const leftDrawerOpen = ref(false);

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value;
}
</script>

<style>
h1 {
  font-size: 3.25rem;
  line-height: 3.25rem;
  margin-block-start: 0.5em;
  margin-block-end: 0.5em;
}
h2 {
  font-size: 2.75rem;
  line-height: 2.75rem;
  margin-block-start: 0.5em;
  margin-block-end: 0.5em;
}
h3 {
  font-size: 2.25rem;
  line-height: 2.25rem;
  margin-block-start: 0.5em;
  margin-block-end: 0.5em;
}
h4 {
  font-size: 2rem;
  margin: 0;
  margin-block-start: 0.5em;
  margin-block-end: 0.5em;
}
h5 {
  font-size: 1.5em;
  margin: 0;
  margin-block-start: 0.5em;
  margin-block-end: 0.5em;
}
</style>

