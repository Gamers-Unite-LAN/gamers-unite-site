import { createApp } from "vue";
import App from "./App.vue";
import "./assets/index.css";
import { useDark } from '@vueuse/core'

createApp(App).mount("#app");

const isDark = useDark({
    storageKey: 'force-dark-mode', // Custom key to avoid system sync
    onChanged: (value) => console.log(`Dark mode: ${value}`)
  })
  