<template>
  <div>
    <h1>Subjects</h1>
    <subject-list :subjects="subjects" allow-delete @delete="deleteSubject"/>
  </div>
</template>


<script setup lang="js">
const subjectService = useSubject();

const subjects = ref([]);

onMounted(async () => {
  subjects.value = await subjectService.list();
  console.log("load", subjects.value);
});

const deleteSubject = async (subject) => {
  await subjectService.delete(subject);

  subjects.value = subjects.value.filter((s) => s.id !== subject.id);
}

</script>

<style>

</style>
