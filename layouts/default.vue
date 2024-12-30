<template>
  <q-layout view="hHh LPR lFr">
    <q-header elevated>
      <q-toolbar>
        <q-btn
          flat
          dense
          round
          icon="menu"
          aria-label="Menu"
          @click="toggleLeftDrawer"
        />

        <q-toolbar-title> On-track </q-toolbar-title>
        <q-space />
        <q-btn
          dense
          flat
          round
          icon="person"
          aria-label="User Profile"
          @click="toggleRightDrawer"
        />
      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" bordered>
      <q-item clickable to="/">
        <q-item-section avatar>
          <q-icon name="home" />
        </q-item-section>
        <q-item-section>Home</q-item-section>
      </q-item>
      <q-item clickable to="/subjects">
        <q-item-section avatar>
          <q-icon name="map" />
        </q-item-section>
        <q-item-section>Subjects</q-item-section>
      </q-item>

      <!-- Create New Lecture Section -->
      <q-item v-if="teacherMode" clickable to="/add">
        <q-item-section avatar>
          <q-icon name="create" />
        </q-item-section>
        <q-item-section>Create New Subject</q-item-section>
      </q-item>
    </q-drawer>

    <q-drawer v-model="rightDrawerOpen" side="right" bordered>
      <q-list padding>
        <!-- User Profile Section -->
        <q-item clickable>
          <q-item-section avatar>
            <q-avatar>
              <q-icon name="account_circle" size="lg" />
            </q-avatar>
          </q-item-section>
          <q-item-section>
            <q-item-label>{{ userName }}</q-item-label>
            <q-item-label caption>{{ userEmail }}</q-item-label>
          </q-item-section>
        </q-item>

        <q-separator />

        <!-- Profile Links -->
        <q-item>
          <q-toggle v-model="teacherMode" label="Teacher Mode" />
        </q-item>

        <!-- Logout Button -->
        <q-item clickable @click="logout">
          <q-item-section avatar>
            <q-icon name="logout" />
          </q-item-section>
          <q-item-section>Logout</q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container>
      <slot />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
const { notify } = useQuasar();
const { fetchUserAttributes, signOut } = useNuxtApp().$Amplify.Auth;

const leftDrawerOpen = ref(false);
const rightDrawerOpen = ref(false);
const teacherMode = ref(false);
const userName = ref("");
const userEmail = ref("");

provide('teacherMode', teacherMode)

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value;
}

function toggleRightDrawer() {
  rightDrawerOpen.value = !rightDrawerOpen.value;
}

watch(teacherMode, handleTeacherModeToggle);
function handleTeacherModeToggle() {
  notify({
    color: "positive",
    position: "top",
    message: teacherMode.value ? "Teacher Mode Activated" : "Teacher Mode Deactivated",
  });
  LocalStorage.set('teacherMode', teacherMode.value);
}

onMounted(async () => {
  try {
    const userAttributes = await fetchUserAttributes();
    userName.value = userAttributes.name || "";
    userEmail.value = userAttributes.email || "";
    // Load stored teacher mode setting
    teacherMode.value = LocalStorage.getItem('teacherMode') || false;
  } catch (error) {
    console.error("Failed to fetch user attributes:", error);
  }
  console.log("Layout mounted");
});

const logout = async () => {
  notify({
    color: "secondary",
    position: "top",
    message: "Logging out",
    icon: "logout",
  });
  signOut();
};
</script>

<style>
h1, .text-h1 {
  font-size: 3.25rem;
  line-height: 3.25rem;
  margin-block-start: 0.5em;
  margin-block-end: 0.5em;
}
h2, .text-h2 {
  font-size: 2.75rem;
  line-height: 2.75rem;
  margin-block-start: 0.5em;
  margin-block-end: 0.5em;
}
h3, .text-h3 {
  font-size: 2.25rem;
  line-height: 2.25rem;
  margin-block-start: 0.5em;
  margin-block-end: 0.5em;
}
h4, .text-h4 {
  font-size: 2rem;
  margin: 0;
  margin-block-start: 0.5em;
  margin-block-end: 0.5em;
}
h5, .text-h5 {
  font-size: 1.5em;
  margin: 0;
  margin-block-start: 0.5em;
  margin-block-end: 0.5em;
}
ul,
ol {
  margin: 0 0 16px;
}

.rich-text th {
  min-width: 100px;
  text-align: center;
  border: 1px solid;
  background: lightgray;
}

.rich-text td {
  min-width: 100px;
  text-align: center;
  border: 1px solid;
}

.rich-text table {
  border-collapse: collapse;
  margin: 0 0 16px;
}
</style>
