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
      <q-separator spaced />
      <q-item-label header>Learnings</q-item-label>
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
      <!-- Create New Subject Section -->
      <q-item v-if="teacherMode" clickable to="/add">
        <q-item-section avatar>
          <q-icon name="create" />
        </q-item-section>
        <q-item-section>Add Subject</q-item-section>
      </q-item>
      <q-item clickable to="/kanban">
        <q-item-section avatar>
          <q-icon name="table_chart" />
        </q-item-section>
        <q-item-section>Kanban</q-item-section>
      </q-item>

      <q-separator spaced />
      <q-item-label header>Your Subjects</q-item-label>
      <q-list v-if="userSubjects.length">
        <q-expansion-item
          v-for="subject in userSubjects"
          :key="subject.id"
          :content-inset-level="0.2"
          :label="subject.name"
          expand-separator
          dense
        >
          <q-list v-if="subject.startedCompetencies && subject.startedCompetencies.length">
            <q-item
              v-for="comp in subject.startedCompetencies.filter(c => ['started', 'ready_for_final', 'mastered'].includes(c.state))"
              :key="comp.id"
              clickable
              :to="`/competency/${comp.id}`"
            >
              <q-item-section>{{ comp.name }}</q-item-section>
              <q-item-section side>
                <q-badge
                  v-if="typeof comp.revisionOrMasteredCount === 'number' && typeof comp.totalConcepts === 'number'"
                  :label="`${comp.revisionOrMasteredCount}/${comp.totalConcepts}`"
                  color="secondary"
                  style="min-width: 32px; justify-content: center; font-size: 0.85em;"
                />
              </q-item-section>
            </q-item>
          </q-list>
        </q-expansion-item>
        <q-item clickable to="/subjects/current">
          <q-item-section>All Your Subjects</q-item-section>
        </q-item>
      </q-list>

      <q-separator spaced />
      <q-item-label header>Language</q-item-label>
      <q-item clickable to="/language/evaluate">
        <q-item-section avatar>
          <q-icon name="language" />
        </q-item-section>
        <q-item-section>Evaluate level</q-item-section>
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

        <q-item clickable to="/history">
          <q-item-section avatar>
            <q-icon name="history" />
          </q-item-section>
          <q-item-section>History</q-item-section>
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
// @ts-expect-error: NuxtApp type is unknown, but $Amplify.Auth is present in runtime
const { fetchUserAttributes, signOut } = useNuxtApp().$Amplify.Auth;
const router = useRouter();

const leftDrawerOpen = ref(false);
const rightDrawerOpen = ref(false);
const teacherMode = ref(false);
const userName = ref("");
const userEmail = ref("");

const subjectService = useSubject();
const userSubjects = ref([]);

async function fetchAndSetUserSubjects() {
  userSubjects.value = await subjectService.fetchUserSubjects(5);
}

onMounted(async () => {
  try {
    const userAttributes = await fetchUserAttributes();
    userName.value = userAttributes.name || "";
    userEmail.value = userAttributes.email || "";
    // Load stored teacher mode setting
    const stored = LocalStorage.getItem('teacherMode');
    teacherMode.value = stored === true || stored === 'true';
  } catch (error) {
    console.error("Failed to fetch user attributes:", error);
  }
  await fetchAndSetUserSubjects();
});

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
    message: teacherMode.value ? "Teacher Mode Activated" : "Teacher Mode Deactivated",
  });
  LocalStorage.set('teacherMode', teacherMode.value);
}

const logout = async () => {
  notify({
    message: "Logging out",
    icon: "logout",
  });
  try {
    await signOut();
  } catch (error) {
    console.error("Failed to logout:", error);
  }
  router.push("/login");
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

.truncated-description {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: normal;
}

.primary-card {
  border-color: var(--q-primary);
}
</style>
