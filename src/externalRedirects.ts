import { RouteRecordRaw } from "vue-router";
import ExternalGameServerRedirect from "./components/ExternalGameServerRedirect.vue";

export const externalRoutes: RouteRecordRaw[] = [
  {
    path: "/servers/community/rust",
    component: ExternalGameServerRedirect,
    props: {
      url: "steam://run/252490//+connect%20community.rust.gamersunitelan.com/",
      serverDescription: "Rust community server",
      gameName: "Rust",
      isCommunity: true,
    },
  },
];
