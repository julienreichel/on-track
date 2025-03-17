<template>
  <div class="row q-col-gutter-sm q-pa-sm">
    <!-- Platform Description -->
    <q-card class="col-12 col-md-6">
      <q-card-section>
        <h4>Personalized Learning, Simplified</h4>
        <p>
          Enhance your learning journey with structured knowledge, engaging
          quizzes, and personalized progress tracking.
        </p>
      </q-card-section>
      <q-card-section class="gt-sm">
        <q-carousel
          v-model="currentScreenshot"
          swipeable
          animated
          navigation
          infinite
          autoplay
        >
          <q-carousel-slide
            v-for="(screenshot, index) in screenshots"
            :key="index"
            :name="index"
            :img-src="screenshot"
          />
                  </q-carousel>
      </q-card-section>
    </q-card>

    <!-- Login Authenticator -->
    <q-card class="col-12 col-md-6 flex column flex-center">
      <q-card-section>
        <authenticator
          :social-providers="['google']"
          :sign-up-attributes="['name']"
        />
      </q-card-section>
    </q-card>
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

const currentScreenshot = ref(0);

// Screenshots (add URLs of uploaded screenshots here)
const screenshots = ref([
  "/screenshots/screen_1.png",
  "/screenshots/screen_2.png",
  "/screenshots/screen_3.png",
  "/screenshots/screen_4.png",
  "/screenshots/screen_5.png"
]);
</script>

<style></style>
