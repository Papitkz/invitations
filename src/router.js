import { createRouter, createWebHistory } from 'vue-router'
import HomeView from './views/HomeView.vue'
import AlbumView from './views/AlbumView.vue'

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/album', name: 'album', component: AlbumView },
    { path: '/:pathMatch(.*)*', redirect: '/' }
  ],
  scrollBehavior: () => ({ top: 0 })
})
