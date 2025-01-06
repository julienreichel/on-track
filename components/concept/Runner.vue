<template>
  <q-card v-if="currentSlide" class="q-pt-sm">
    <q-card-section v-if="title" class="q-pb-none">
      <div class="text-h5 text-center">{{ title }}</div>
    </q-card-section>
    <q-card-section class="q-pt-none">
      <q-linear-progress :value="progress" class="q-mt-md" size="lg" />
    </q-card-section>
    <q-card-section>
      <q-card square>
        <q-card-section>
          <rich-text-renderer :markdown-content="currentSlide" />
        </q-card-section>
      </q-card>
    </q-card-section>
    <q-card-actions class="q-px-none q-py-lg">
      <q-btn v-if="step > 0" square size="md" icon="chevron_left" @click="prevSlide" />
      <q-space />
      <q-btn
        square
        size="md"
        :icon="isLastSlide ? nextActionsIcon : 'chevron_right'"
        color="primary"
        padding="sm 64px"
        @click="nextSlide"
      />
    </q-card-actions>
  </q-card>
</template>

<script setup>
import { ref, computed, watch } from "vue";

const props = defineProps({
  markdownContent: { type: String, required: true },
  nextActionsIcon: { type: String, default: "check" },
  title: { type: String, default: null },
});
const emit = defineEmits(["finished"]);

const step = ref(0);
const slides = ref([]);

// Process markdown content into slides
watch(
  () => props.markdownContent,
  (newContent) => {
    slides.value = newContent
      .split(/\n(?=#)/) // Split by lines starting with `#`
      .map((slide) => slide.trim())
      .filter((slide) => slide !== "");
    step.value = 0;
  },
  { immediate: true }
);

const currentSlide = computed(() => slides.value[step.value]);
const progress = computed(() => (slides.value.length > 0 ? ( step.value + 1) / slides.value.length : 0));
const isLastSlide = computed(() => step.value === slides.value.length - 1);

const nextSlide = () => {
  if (step.value < slides.value.length - 1) {
    step.value++;
  } else {
    emit("finished");
  }
};

const prevSlide = () => {
  if (step.value > 0) {
    step.value--;
  }
};
</script>
