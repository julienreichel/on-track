<template>
  <div class="container">
    <h1>Lectures</h1>
    <ul class="lecture-list">
      <li
        v-for="lecture in lectureList"
        :key="lecture.id"
        @click="fetchPrerequisites(lecture.id)"
        class="lecture-item"
      >
        {{ lecture.name.en }}
      </li>
    </ul>

    <div v-if="selectedLecture" class="prerequisite-container">
      <h3>Prerequisites for {{ selectedLecture.name.en }}</h3>
      <ul class="prerequisite-list">
        <li v-for="{ prerequisite } in selectedLecture.prerequisites" :key="prerequisite.id" class="prerequisite-item">
          {{ prerequisite.name.en }}
        </li>
      </ul>
    </div>

    <div class="add-lecture">
      <h2>Add New Lecture</h2>
      <input v-model="newLecture.name.en" placeholder="Enter lecture name" class="lecture-input" />

      <h3>Select Prerequisites</h3>
      <select v-model="selectedPrerequisites" multiple class="prerequisite-select">
        <option v-for="lecture in lectureList" :key="lecture.id" :value="lecture.id">
          {{ lecture.name.en }}
        </option>
      </select>

      <button @click="addLectureWithPrerequisites" class="add-button">Add Lecture</button>
    </div>
  </div>
</template>

<script setup lang="ts">
const lectureService = useLecture();
const prerequisiteService = useLecturePrerequisite();

const lectureList = ref([]);
const newLecture = ref({
  name: {
    en: "New Lecture",
  }
});
const selectedPrerequisites = ref<string[]>([]);
const selectedLecture = ref(null);

onMounted(async () => {
  lectureList.value = await lectureService.list();
});

const addLectureWithPrerequisites = async (): Promise<void> => {
  const createdLecture = await lectureService.create(newLecture.value);
  lectureList.value.push(createdLecture);

  for (const prerequisiteId of selectedPrerequisites.value) {
    await prerequisiteService.create({
      lectureId: createdLecture.id,
      prerequisiteId: prerequisiteId,
    });
  }

  // Reset the form
  newLecture.value.name.en = "New Lecture";
  selectedPrerequisites.value = [];
};

const fetchPrerequisites = async (lectureId: string): Promise<void> => {
  selectedLecture.value =  await lectureService.get(lectureId);
  console.log(selectedLecture.value);
};
</script>

<style scoped>
.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

h1,
h2,
h3 {
  color: #333;
  margin-bottom: 10px;
}

.lecture-list,
.prerequisite-list {
  list-style-type: none;
  padding: 0;
}

.lecture-item,
.prerequisite-item {
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 5px;
  margin-bottom: 5px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.lecture-item:hover,
.prerequisite-item:hover {
  background-color: #f5f5f5;
}

.add-lecture {
  margin-top: 20px;
}

.lecture-input,
.prerequisite-select {
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 5px;
  width: 100%;
  margin-bottom: 10px;
}

.add-button {
  padding: 10px 20px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.add-button:hover {
  background-color: #0056b3;
}
</style>
