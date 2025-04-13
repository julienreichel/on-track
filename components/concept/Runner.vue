<template>
  <q-card v-if="currentSlide" class="q-pt-xs">
    <q-card-section v-if="title" class="q-pb-none">
      <div class="text-h5 text-center">{{ title }}</div>
    </q-card-section>
    <q-card-section class="q-pt-none q-px-sm">
      <q-linear-progress :value="progress" class="q-mt-md" size="lg" />
    </q-card-section>
    <q-card-section class="q-pa-sm">
      <q-card square>
        <q-card-section horizontal>        
          <q-card-section class="q-pt-md gt-sm" style="width: 20%;">
            <q-list bordered>
              <q-item 
                v-for="(item, index) in slidesTitles" 
                :key="index" 
                clickable 
                @click="goToSlide(index)"
              >
                <q-item-section>
                  {{ item }}
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
          <q-card-section>
            <rich-text-renderer :markdown-content="currentSlide" />
          </q-card-section>
      </q-card-section>
      </q-card>
    </q-card-section>
    <q-card-actions class="q-px-none q-py-lg">
      <q-btn v-if="step > 0" square size="md" icon="chevron_left" @click="prevSlide" />
      <q-space />
      <q-btn
        ref="nextButton"
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

const props = defineProps({
  markdownContent: { type: String, required: true },
  nextActionsIcon: { type: String, default: "check" },
  title: { type: String, default: null },
});
const emit = defineEmits(["finished"]);

const step = ref(0);
const slides = computed(() => props.markdownContent
  .split(/\n(?=#)/) // Split by lines starting with `#`
  .map((slide) => slide.trim())
  .filter((slide) => slide !== "")
);

const focusNextButton = () => {
  nextTick(() => {
    if (nextButton.value?.$el) {
      nextButton.value.$el.focus();
    }
  });
};

// Process markdown content into slides
watch(
  () => props.markdownContent,
  () => {    
    step.value = 0;
    focusNextButton();
  },
  { immediate: true }
);
const slidesTitles = computed(() =>
  slides.value.map((slide) => {
    let title = slide.split("\n")[0].replaceAll("#", "").trim();
    // cut after the first . for long titles
    const dotIndex = title.indexOf(".");
    if (dotIndex !== -1 && title.length > 55) {
      title = title.slice(0, dotIndex + 1).trim();
    }
    return title.length > 55 ? title.slice(0, 52) + "..." : title;
  })
);

const currentSlide = computed(() => slides.value[step.value]);
const progress = computed(() => (slides.value.length > 0 ? ( step.value ) / (slides.value.length - 1) : 0));
const isLastSlide = computed(() => step.value === slides.value.length - 1);

const nextButton = ref(null);



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

const goToSlide = (index) => {
  step.value = index;
};
</script>
