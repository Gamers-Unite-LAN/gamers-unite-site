import { createMemoryHistory, createRouter } from 'vue-router'

import LandingPage from '@/pages/LandingPage.vue'
import CorePrinciplesPage from '@/pages/CorePrinciplesPage.vue'
import ImportantDocumentsPage from '@/pages/ImportantDocumentsPage.vue';
import SafeguardingPolicy from '@/components/ImportantDocuments/SafeguardingPolicy.vue';
import ExpensePolicy from '@/components/ImportantDocuments/ExpensePolicy.vue';

export const routes = [
  { path: '/', component: LandingPage },
  { path: '/core-principles', component: CorePrinciplesPage },
  {
    path: '/documents', 
    component: ImportantDocumentsPage,
    children: [
      { path: 'expense-policy', component: ExpensePolicy },
      { path: 'safeguarding-policy', component: SafeguardingPolicy },
    ]
  }
];

export const router = createRouter({
  history: createMemoryHistory(),
  routes
})