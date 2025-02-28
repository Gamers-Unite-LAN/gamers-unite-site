import { createMemoryHistory, createRouter } from 'vue-router'

import LandingPage from './pages/LandingPage.vue'
import CorePrincaplesPage from './pages/CorePrincaplesPage.vue'

export const routes = [
    { path: '/', component: LandingPage },
    { path: '/core-princaples', component: CorePrincaplesPage },
  ];
  
export const router = createRouter({
    history: createMemoryHistory(),
    routes
  })