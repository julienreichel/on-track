<template>
  <div style="height: 90vh; width: 100%">
    <lecture-flow
      :lectures="lectures"
      :prerequisites="prerequisites"
      direction="TB"
    />
  </div>
</template>

<script setup lang="js">
const lectureService = useLecture();
const prerequisiteService = useLecturePrerequisite();

const lectures = ref([]);
const prerequisites = ref([]);

onMounted(async () => {
  lectures.value = await lectureService.list();
  prerequisites.value = await prerequisiteService.list();
});

</script>

<style>

</style>
