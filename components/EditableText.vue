<template>
  <div>
    <div v-if="!isEditing && !useRichText" @click="enableEditing">
      {{ editedValue }}
    </div>
    <rich-text-renderer
      v-else-if="!isEditing && useRichText"
      :markdown-content="editedValue"
      @click="enableEditing"
    />
    <div v-else style="max-width: 800px">
      <q-input v-model="editedValue" dense :type="type" />
      <div class="row justify-end q-pa-xs">
        <q-icon
          size="sm"
          name="close"
          class="cursor-pointer"
          @click="cancelEdit"
        />
        <q-icon
          size="sm"
          name="check"
          class="cursor-pointer"
          @click="applyEdit"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  value: {
    type: String,
    required: true,
  },
  enableEditing: {
    type: Boolean,
    default: false,
  },
  useRichText: {
    type: Boolean,
    default: false,
  },
  type: {
    type: String,
    default: "text",
  },
});

const emit = defineEmits(["update"]);

const isEditing = ref(false);
const editedValue = ref(props.value);

watch(
  () => props.value,
  (newValue) => {
    if (!isEditing.value) {
      editedValue.value = newValue;
    }
  }
);

const enableEditing = () => {
  if (!props.enableEditing) return;
  isEditing.value = true;
};

const cancelEdit = () => {
  isEditing.value = false;
  editedValue.value = props.value;
};

const applyEdit = () => {
  isEditing.value = false;
  emit("update", editedValue.value);
};
</script>

<style scoped>
/* Add your styles here */
</style>
