<template>
  <div class="row q-col-gutter-sm q-pa-sm">
    <div class="col-12 col-md-6">
      <q-card class="full-height">
        <q-card-section>
          <h4>Personalized Learning, Simplified</h4>
          <p>
            Enhance your learning journey with structured knowledge, engaging
            quizzes, and personalized progress tracking.
          </p>
          <p>
            Please log in to continue.
          </p>
        </q-card-section>
      </q-card>
    </div>
    <div class="col-12 col-md-6">
      <q-card>
        <q-card-section>
          <authenticator
            :social-providers="['google']"
            :sign-up-attributes="['name']"
          />
        </q-card-section>
      </q-card>
    </div>
  </div>
</template>

<script setup>
import { Authenticator, useAuthenticator } from "@aws-amplify/ui-vue";
import "@aws-amplify/ui-vue/styles.css";

definePageMeta({
  layout: "empty",
});

const auth = useAuthenticator();
const router = useRouter();

watch(auth, () => {
  if (auth.authStatus === "authenticated") {
    router.push("/");
  }
});
</script>

<style>
.amplify-button--primary {
  background-color: #3993DD;
}
</style>
