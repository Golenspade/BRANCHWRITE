import { createRouter, createWebHashHistory } from 'vue-router'

const BookSelector = () => import('../components/BookSelector.vue')
const BookWorkspace = () => import('../components/workspace/BookWorkspace.vue')

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: BookSelector },
    { path: '/workspace', name: 'workspace', component: BookWorkspace },
  ],
})

export default router

