import App from "./App.vue";
import "./assets/index.css";
import { useDark } from '@vueuse/core'
import { ViteSSG } from 'vite-ssg/single-page'

export const createApp = ViteSSG(App)

// forces dark mode???
useDark({
  storageKey: 'force-dark-mode', // Custom key to avoid system sync
  onChanged: (value) => console.log(`Dark mode: ${value}`)
})
  