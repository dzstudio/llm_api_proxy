<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const navSections = [
  {
    label: '总览',
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: 'grid' },
    ],
  },
  {
    label: '管理',
    items: [
      { path: '/employees', label: '员工管理', icon: 'users' },
      { path: '/models', label: '模型管理', icon: 'cpu' },
      { path: '/keys', label: 'API Key 管理', icon: 'key' },
      { path: '/my-access', label: '接入信息', icon: 'link' },
    ],
  },
  {
    label: '分析',
    items: [
      { path: '/work-logs', label: '工作记录', icon: 'file-text' },
      { path: '/audit', label: '对话审计', icon: 'message-square' },
    ],
  },
  {
    label: '系统',
    items: [
      { path: '/settings', label: '系统设置', icon: 'settings' },
    ],
  },
]

const isAdmin = computed(() => authStore.userInfo?.role === 'ADMIN')
const adminOnlyPaths = ['/employees', '/models', '/keys', '/audit']
const employeeOnlyPaths = ['/my-access']

function isVisible(path: string) {
  if (adminOnlyPaths.includes(path)) return isAdmin.value
  if (employeeOnlyPaths.includes(path)) return !isAdmin.value
  return true
}

const activePath = computed(() => route.path)

function goTo(path: string) {
  router.push(path)
}

function handleLogout() {
  authStore.logout()
  router.push('/login')
}

const pageTitle = computed(() => {
  for (const section of navSections) {
    for (const item of section.items) {
      if (item.path === activePath.value) return item.label
    }
  }
  return ''
})

const iconPaths: Record<string, string> = {
  grid: 'M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z',
  users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
  cpu: 'M12 2v3m0 14v3M2 12h3m14 0h3 M4.93 4.93l2.12 2.12 M16.95 16.95l2.12 2.12 M4.93 19.07l2.12-2.12 M16.95 7.05l2.12-2.12',
  key: 'M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4',
  'file-text': 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H9H8',
  'message-square': 'M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
  link: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71 M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
}
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-[#F8FAFC]">
    <!-- Sidebar -->
    <aside class="flex w-[240px] flex-shrink-0 flex-col border-r border-gray-200 bg-white" style="height:100vh; position:sticky; top:0; overflow-y:auto;">
      <!-- Logo -->
      <div class="flex items-center gap-2.5 px-5 py-5 border-b border-gray-100">
        <img src="/logo.png" alt="LLM API Proxy" class="w-8 h-8 rounded-lg object-contain" />
        <div>
          <div class="text-sm font-bold text-gray-900">AI Workspace</div>
          <div class="text-xs text-gray-400">LLM API Proxy</div>
        </div>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 px-3 py-4 space-y-0.5">
        <template v-for="section in navSections" :key="section.label">
          <div class="text-xs font-semibold text-gray-400 uppercase tracking-widest px-3 mt-3 mb-1 first:mt-0">
            {{ section.label }}
          </div>
          <button
            v-for="item in section.items"
            v-show="isVisible(item.path)"
            :key="item.path"
            :class="[
              'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              activePath === item.path
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900',
            ]"
            @click="goTo(item.path)"
          >
            <svg class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" :d="iconPaths[item.icon]" />
            </svg>
            {{ item.label }}
          </button>
        </template>
      </nav>

      <!-- User Section -->
      <div class="px-3 py-4 border-t border-gray-100">
        <div class="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer">
          <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 bg-[#3B82F6]">
            {{ authStore.userInfo?.realName?.charAt(0) || 'A' }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-xs font-semibold text-gray-800 truncate">
              {{ authStore.userInfo?.realName || '管理员' }}
            </div>
            <div class="text-xs text-gray-400 truncate">
              {{ authStore.userInfo?.role === 'ADMIN' ? '管理员' : '用户' }}
            </div>
          </div>
        </div>
        <button
          class="w-full mt-1 flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
          @click="handleLogout"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9"/>
          </svg>
          退出登录
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <div class="flex-1 min-w-0 flex flex-col">
      <!-- Top Header -->
      <header class="sticky top-0 z-20 flex items-center justify-between px-8 border-b border-gray-200" style="background:rgba(255,255,255,0.92); backdrop-filter:blur(12px); height:64px;">
        <div class="text-sm font-semibold text-gray-900">{{ pageTitle }}</div>
        <div class="flex items-center gap-3">
          <button class="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </button>
        </div>
      </header>

      <!-- Page Content -->
      <main class="flex-1 overflow-y-auto p-6">
        <router-view />
      </main>
    </div>
  </div>
</template>
