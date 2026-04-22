import { createMemoryHistory, createRouter, RouteRecordRaw } from "vue-router";

import LandingPage from "@/pages/LandingPage.vue";
import CorePrinciplesPage from "@/pages/CorePrinciplesPage.vue";
import ImportantDocumentsPage from "@/pages/ImportantDocumentsPage.vue";
import SafeguardingPolicy from "@/components/ImportantDocuments/SafeguardingPolicy.vue";
import ExpensePolicy from "@/components/ImportantDocuments/ExpensePolicy.vue";
import ExternalRedirect from "./components/ExternalRedirect.vue";

export const routes: RouteRecordRaw[] = [
  { path: "/", component: LandingPage },
  { path: "/core-principles", component: CorePrinciplesPage },
  {
    path: "/documents",
    component: ImportantDocumentsPage,
    children: [
      { path: "expense-policy", component: ExpensePolicy },
      { path: "safeguarding-policy", component: SafeguardingPolicy },
    ],
  },
  {
    path: "/servers/community/rust",
    component: ExternalRedirect,
    props: {
      url: "steam://run/252490//+connect%20community.rust.gamersunitelan.com/",
      serverDescription: "Rust community server",
      gameName: "Rust",
      isCommunity: true,
    },
  },
];

export const router = createRouter({
  history: createMemoryHistory(),
  routes,
});
