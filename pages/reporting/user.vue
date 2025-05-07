<template>
  <reporting-data :user-id="userId" :username="username" />
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
    console.error("Failed to fetch concept action:", error);
  }
});

</script>
