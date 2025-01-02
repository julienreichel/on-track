<template>
  <div class="q-pa-sm">
    <div class="text-h3 q-mb-md">Subjects</div>
    <subject-cards :subjects="subjects" :allow-delete="teacherMode" @delete="deleteSubject"/>
  </div>
</template>


<script setup lang="js">
const subjectService = useSubject();

const teacherMode = inject('teacherMode');
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
