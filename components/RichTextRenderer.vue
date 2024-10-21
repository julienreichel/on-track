<template>
  <!-- eslint-disable vue/no-v-html -->
  <div ref="contentContainer" class="rich-text" style="max-width:800px" v-html="renderedHtml" />
</template>

<script setup>
import mermaid from "mermaid";
const { renderKatex, renderMarkdown } = useFormatter();

const props = defineProps({
  markdownContent: {
    type: String,
    required: true,
  },
});

const renderedHtml = ref();
mermaid.initialize({ startOnLoad: true, theme: "forest" });
// Function to decode HTML entities
function decodeHTMLEntities(text) {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = text;
  return textarea.value;
}

const contentContainer = ref(null);
const render = async () => {
  if (!props.markdownContent) {
    return;
  }
  const htmlContent = await renderMarkdown(props.markdownContent);
  const html = renderKatex(htmlContent);

  // Extract the SVG code from the string and render it
  renderedHtml.value = html.replace(
    /<code class="language-svg">([\s\S]*?)<\/code>/g,
    (match, code) => {
      return decodeHTMLEntities(code);
    }
  );

  // Render mermaid diagrams
  nextTick(async () => {
    await mermaid.run({
      querySelector: "mermaid, .language-mermaid",
    });
  });
};

watch(() => props.markdownContent, render, { immediate: true });
</script>

<style scoped>
.content-container {
  overflow: auto;
}
</style>
