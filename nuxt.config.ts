// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2024-04-03",
  devtools: { enabled: true },
  modules: ["@nuxt/eslint", "nuxt-quasar-ui"],
  ssr: false, // Disable server-side rendering
  imports: {
    presets: [
      {
        from: "vue-i18n",
        imports: ["useI18n"],
      },
    ],
  },
  quasar: {
    // Configurable Component Defaults
    plugins: [
      'BottomSheet',
      'Dialog',
      'Loading',
      'LoadingBar',
      'Notify',
      'Dark',
      'LocalStorage'
    ],
    components: {
      defaults: {
        QBtn: {
          dense: false,
          flat: false,
        },
        QInput: {
          dense: false,
          outlined: true
        },
        QPage: {
        }
      }
    }
  }
});
