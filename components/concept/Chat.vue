<template>
  <div class="q-gutter-y-sm column full-height">
    <div class="text-caption q-mb-xs">Let's chat about this concept</div>
    <div ref="chatContainer" class="q-ma-sm concept-chat-messages col overflow-auto" >
      <q-chat-message
        v-for="post in sortedPosts"
        :key="post.id"
        :text="[post.content]"
        :sent="post.owner === userId && !post.isAIGenerated"
        class="q-mb-xs"
      />
      <div v-if="loading" class="row justify-center q-mt-sm">
        <q-spinner-dots color="primary" size="2em" />
      </div>
    </div>
    <div class="q-mt-sm">
      <q-input
        v-model="model"
        type="textarea"
        autogrow
        dense
        placeholder="Type your message and press Enter…"
        @keyup.enter="submit"
        @keyup.ctrl.enter="submit"
      >
        <template #append>
          <q-btn flat dense icon="send"  :disable="!model.trim()" @click="submit"/>
        </template>
      </q-input>
    </div>
  </div>
</template>

<script setup>
const { getCurrentUser } = useNuxtApp().$Amplify.Auth;

const props = defineProps({
  posts: {type: Array, default: () => []},
  loading: { type: Boolean, default: false }
});
const emit = defineEmits(['submit']);
const model = defineModel({ type: String, default: '' });

const userId = ref(null);
const chatContainer = ref(null);

onMounted(async () => {
  try {
    const user = await getCurrentUser();
    userId.value = user.username;
  } catch (error) {
    console.error('Error fetching user:', error);
  }
  scrollToBottom();
});

const sortedPosts = computed(() => {
  return [...props.posts].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
});

function submit() {
  if (model.value.trim()) emit('submit');
}

function scrollToBottom() {
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
  }
}

watch(
  () => props.posts.length,
  () => {
    nextTick(() => {
      scrollToBottom();
    });
  }
);
</script>

<style scoped>
.concept-chat-messages {
  min-height: 120px;
  max-height: 50vh;
}
</style>
