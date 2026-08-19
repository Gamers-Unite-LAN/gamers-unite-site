import App from "./App.vue";
import "./assets/index.css";

import { useDark } from "@vueuse/core";
import { ViteSSG } from "vite-ssg";

import { routes } from "./router";

export const createApp = ViteSSG(App, {
  routes,

  scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    }

    if (to.hash) {
      return {
        el: to.hash,
        behavior: "smooth",
        top: 80,
      };
    }

    return {
      top: 0,
    };
  },
});

useDark({
  storageKey: "force-dark-mode",
});
