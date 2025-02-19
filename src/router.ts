import { createWebHistory, createRouter, RouteLocationNormalizedGeneric } from 'vue-router'

import LandingPage from './pages/LandingPage.vue'
import CorePrincaplesPage from './pages/CorePrincaplesPage.vue'

export const routes = [
    { path: '/', component: LandingPage },
    { path: '/core-princaples', component: CorePrincaplesPage,
      meta: { scrollToTop: true } },
  ];
  
export const router = createRouter({
    history: createWebHistory(),
    routes,
    scrollBehavior(to: RouteLocationNormalizedGeneric) {
      console.log('scrollBehavior', to)

      if (to.hash) {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              el: `#${to.hash.replace(/^#/, '')}`,
              behavior: 'smooth',
            });
          }, 300); // Adjust timing if needed
        });
      }
    
      return { top: 0, behavior: 'smooth' };
    }
  })