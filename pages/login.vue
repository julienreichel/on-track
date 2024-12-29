<template>
  <div class="auth-container">
    <authenticator
      :social-providers="['google']"
      :sign-up-attributes="['name']"
    />
  </div>
</template>

<script setup>
import { Authenticator, useAuthenticator } from "@aws-amplify/ui-vue";
import "@aws-amplify/ui-vue/styles.css";

definePageMeta({
  layout: 'empty',
});

const auth = useAuthenticator();
const router = useRouter()

watch(auth, () => {
  if (auth.authStatus === "authenticated") {
    router.push("/");
  }
});
</script>

<style>
.auth-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh; /* Full viewport height */
}
</style>
