import App from "./App.vue";
import "./assets/index.css";

import { useDark } from "@vueuse/core";
import { ViteSSG } from "vite-ssg";

import {
  applyHomepageState,
  type HomepageInitialState,
} from "./lib/homepageState";
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
}, async ({ initialState }) => {
  if (import.meta.env.SSR) {
    const { loadHomepageInitialState } = await import("./lib/homepageState.server");
    initialState.homepage = await loadHomepageInitialState();
  }

  applyHomepageState(initialState.homepage as HomepageInitialState | undefined);
});

useDark({
  storageKey: "force-dark-mode",
});
