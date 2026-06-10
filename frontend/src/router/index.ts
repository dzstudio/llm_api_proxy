import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { title: '登录 - LLM API Proxy' },
  },
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: { title: 'Dashboard - LLM API Proxy' },
      },
      {
        path: 'employees',
        name: 'Employees',
        component: () => import('@/views/Employees.vue'),
        meta: { title: '员工管理 - LLM API Proxy' },
      },
      {
        path: 'keys',
        name: 'ApiKeys',
        component: () => import('@/views/ApiKeys.vue'),
        meta: { title: 'API Key管理 - LLM API Proxy' },
      },
      {
        path: 'models',
        name: 'Models',
        component: () => import('@/views/Models.vue'),
        meta: { title: '模型管理 - LLM API Proxy' },
      },
      {
        path: 'audit',
        name: 'Audit',
        component: () => import('@/views/Conversations.vue'),
        meta: { title: '对话审计 - LLM API Proxy' },
      },
      {
        path: 'work-logs',
        name: 'WorkLogs',
        component: () => import('@/views/Reports.vue'),
        meta: { title: '工作记录 - LLM API Proxy' },
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('@/views/Settings.vue'),
        meta: { title: '系统设置 - LLM API Proxy' },
      },
      {
        path: 'my-access',
        name: 'MyAccess',
        component: () => import('@/views/EmployeeAccess.vue'),
        meta: { title: '接入信息 - LLM API Proxy' },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('token')
  if (to.path !== '/login' && !token) {
    next('/login')
  } else if (to.path === '/login' && token) {
    next('/dashboard')
  } else {
    next()
  }
})

export default router
