import App from "./App.vue";
import "./assets/index.css";
import { useDark } from '@vueuse/core'
import { ViteSSG } from 'vite-ssg'
import { routes } from "./router";

export const createApp = ViteSSG(
  App,
  { routes }
)

// forces dark mode???
useDark({
  storageKey: 'force-dark-mode', // Custom key to avoid system sync
})
  