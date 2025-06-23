<template>
  <div>
    <div class="text-caption q-mb-xs">Let's chat about this concept</div>
    <div class="q-ma-sm">
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
onMounted(async () => {
  try {
    const user = await getCurrentUser();
    userId.value = user.userId;
  } catch (error) {
    console.error('Error fetching user:', error);
  }
});
const sortedPosts = computed(() => {
  return [...props.posts].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
});
function submit() {
  if (model.value.trim()) emit('submit');
}
</script>
