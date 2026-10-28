import App from "./App.vue";
import "./assets/index.css";

import { useDark } from "@vueuse/core";
import { ViteSSG } from "vite-ssg";

import {
  applyHomepageState,
  loadHomepageStateForDev,
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

  // Keep the plain Vite dev server working; production hydrates the baked value.
  if (import.meta.env.DEV && !import.meta.env.SSR) {
    loadHomepageStateForDev().catch(() => {});
  }
});

useDark({
  storageKey: "force-dark-mode",
});
