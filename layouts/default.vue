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
          <q-icon name="map" />
        </q-item-section>
        <q-item-section>Subject list</q-item-section>
      </q-item>

      <!-- Create New Lecture Section -->
      <q-item clickabl to="/add">
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
        <q-item clickable>
          <q-item-section avatar>
            <q-icon name="account_circle" />
          </q-item-section>
          <q-item-section>Profile</q-item-section>
        </q-item>

        <q-item clickable>
          <q-item-section avatar>
            <q-icon name="settings" />
          </q-item-section>
          <q-item-section>Settings</q-item-section>
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

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value;
}

function toggleRightDrawer() {
  rightDrawerOpen.value = !rightDrawerOpen.value;
}

const userName = ref("");
const userEmail = ref("");

onMounted(async () => {
  try {
    const userAttributes = await fetchUserAttributes();
    userName.value = userAttributes.name;
    userEmail.value = userAttributes.email;
  } catch (error) {
    console.error("Failed to fetch section:", error);
  }
  console.log("Layout mounted");
});

const logout = async () => {
  notify({
    color: "secondary",
    position: "top",
    message: "Loggin out",
    icon: "logout",
  });
  signOut();
};
</script>

<style>
h1 {
  font-size: 3.25rem;
  line-height: 3.25rem;
  margin-block-start: 0.5em;
  margin-block-end: 0.5em;
}
h2 {
  font-size: 2.75rem;
  line-height: 2.75rem;
  margin-block-start: 0.5em;
  margin-block-end: 0.5em;
}
h3 {
  font-size: 2.25rem;
  line-height: 2.25rem;
  margin-block-start: 0.5em;
  margin-block-end: 0.5em;
}
h4 {
  font-size: 2rem;
  margin: 0;
  margin-block-start: 0.5em;
  margin-block-end: 0.5em;
}
h5 {
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
