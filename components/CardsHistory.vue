<template>
  <div class="q-mb-lg">
    <q-card flat>
      <q-card-section class="row q-col-gutter-sm">
        <div
          v-for="(day, idx) in history"
          :key="day.date"
          class="col"
          :class="{ 'gt-sm': idx < 7 }"
        >
          <q-card flat bordered class="text-center">
            <div class="text-sm gt-sm">{{ day.shortDate }}</div>
            <div class="text-xs text-gray-6">{{ day.weekday }}</div>
            <q-icon
              v-if="day.hasAction"
              name="check_circle"
              color="green"
              size="md"
              class="q-mt-sm"
            >
              <q-tooltip anchor="bottom middle" self="top middle">
                <div v-for="action in day.actions" :key="action.id" class="row items-center q-pa-sm">
                  <span>{{ action.concept?.name || action.competency?.name }}</span>                             
                </div>
              </q-tooltip>
            </q-icon>
            <q-icon
              v-else
              name="radio_button_unchecked"
              color="grey-6"
              size="md"
              class="q-mt-sm"
            />
          </q-card>
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup lang="js">


defineProps({
  history: {
    type: Array,
    default: () => []
  }
})
</script>

<style scoped></style>
