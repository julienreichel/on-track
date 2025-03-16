<template>
  <div class="row">
    <div class="q-pa-xs q-py-md">
      <q-btn
        label="Help me to chose"
        to="/subject/wizard"
        />
    </div>
    <q-space />
    <div class="q-pa-xs q-py-md col-12 col-sm-6 col-md-4">
      <q-input
        v-model="searchTerm"
        dense
        debounce="300"
      > 
      <template #append>
          <q-icon name="search" />
        </template>
      </q-input>
    </div>
    <div class="row q-col-gutter-md">
      <div
        v-for="(subject, idx) in filteredSubjects"
        :key="idx"
        class="col-12 col-sm-6 col-md-4"
      >
        <q-card
          flat
          bordered
          class="cursor-pointer"
          @click="$router.push(`/subject/${subject.id}`)"
        >
          <q-card-section>
            <div class="text-h6 text-bold">{{ subject.name }}</div>
            <div class="q-mt-sm truncated-description">
              {{ subject.description }}
            </div>
          </q-card-section>
          <q-card-actions>
            <q-space />
            <q-btn
              v-if="allowDelete"
              icon="delete"
              flat
              dense
              @click.stop.prevent="$emit('delete', subject)"
            />
          </q-card-actions>
        </q-card>
      </div>
    </div>
  </div>
</template>

<script setup>

const props = defineProps({
  subjects: { type: Array, required: true },
  allowDelete: { type: Boolean, default: false },
});

defineEmits(["delete"]);

const searchTerm = ref('');

const filteredSubjects = computed(() => {
  return props.subjects.filter(subject =>
  subject.name.toLowerCase().includes(searchTerm.value.toLowerCase()) || subject.description.toLowerCase().includes(searchTerm.value.toLowerCase())
  );
});
</script>
