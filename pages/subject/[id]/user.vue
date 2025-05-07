<template>
  <reporting-data v-if="userId && username" :subject-id="$route.params.id" :user-id="userId" :username="username" />
</template>

<script setup>
const { getCurrentUser } = useNuxtApp().$Amplify.Auth;

const userId = ref(null);
const username = ref(null);

onMounted(async () => {
  try {
    const user = await getCurrentUser();
    userId.value = user.userId;
    username.value = user.username;    
  } catch (error) {
    console.error("Failed to fetch user:", error);
  }
});

</script>
