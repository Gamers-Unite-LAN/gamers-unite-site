import type { RouteRecordRaw } from "vue-router";

import LandingPage from "@/pages/LandingPage.vue";
import CorePrinciplesPage from "@/pages/CorePrinciplesPage.vue";
import ImportantDocumentsPage from "@/pages/ImportantDocumentsPage.vue";
import SafeguardingPolicy from "@/components/ImportantDocuments/SafeguardingPolicy.vue";
import ExpensePolicy from "@/components/ImportantDocuments/ExpensePolicy.vue";
import GalleryPage from "@/pages/GalleryPage.vue";
import AdminPage from "@/pages/AdminPage.vue";

import { externalRoutes } from "./externalRedirects";

export const routes: RouteRecordRaw[] = [
  {
    path: "/",
    component: LandingPage,
  },
  {
    path: "/core-principles",
    component: CorePrinciplesPage,
  },
  {
    path: "/gallery",
    component: GalleryPage,
  },
  {
    path: "/admin",
    component: AdminPage,
  },
  {
    path: "/documents",
    component: ImportantDocumentsPage,
    children: [
      {
        path: "expense-policy",
        component: ExpensePolicy,
      },
      {
        path: "safeguarding-policy",
        component: SafeguardingPolicy,
      },
    ],
  },
  ...externalRoutes,
];
