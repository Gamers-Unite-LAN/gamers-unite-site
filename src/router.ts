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
      if (to.hash) {
        return {
          el: to.hash,
          behavior: 'smooth',
        }
      } 
      
      // Always scroll to top for routes with meta.scrollToTop
      if (to.meta.scrollToTop) {
        return {
          top: 0,
          behavior: 'smooth'
        }
      }
    }
  })