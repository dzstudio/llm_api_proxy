<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const stats = ref([
  { label: '活跃员工', value: '--', icon: 'users', color: '#005d9c' },
  { label: 'API Key 数量', value: '--', icon: 'key', color: '#0ea5e9' },
  { label: '接入模型', value: '--', icon: 'cpu', color: '#10b981' },
  { label: '今日 Token 用量', value: '--', icon: 'zap', color: '#f59e0b' },
])

const iconPaths: Record<string, string> = {
  users: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
  key: 'M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z',
  cpu: 'M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25zm.75-12h9v9h-9v-9z',
  zap: 'M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z',
}

onMounted(async () => {
  if (!authStore.userInfo) {
    await authStore.fetchUserInfo()
  }
})
</script>

<template>
  <div>
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-2xl font-semibold tracking-tight text-slate-900">Dashboard</h1>
      <p class="mt-1 text-sm text-slate-500">
        欢迎回来，{{ authStore.userInfo?.realName || '管理员' }}
      </p>
    </div>

    <!-- Stats Grid -->
    <div class="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      <div
        v-for="stat in stats"
        :key="stat.label"
        class="rounded-xl border border-slate-200 bg-white p-6 transition-shadow hover:shadow-sm"
      >
        <div class="flex items-start justify-between">
          <div>
            <p class="text-sm text-slate-500">{{ stat.label }}</p>
            <p class="mt-2 text-2xl font-semibold text-slate-900">{{ stat.value }}</p>
          </div>
          <div
            class="flex h-10 w-10 items-center justify-center rounded-lg"
            :style="{ backgroundColor: stat.color + '12' }"
          >
            <svg class="h-5 w-5" :style="{ color: stat.color }" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" :d="iconPaths[stat.icon]" />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="rounded-xl border border-slate-200 bg-white p-6">
      <h2 class="text-base font-semibold text-slate-900">快速开始</h2>
      <p class="mt-1 text-sm text-slate-500">LLM API Proxy 企业级 AI Gateway + 工作审计平台</p>
      <div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div class="rounded-lg border border-slate-100 bg-slate-50 p-4">
          <h3 class="text-sm font-medium text-slate-900">管理员工</h3>
          <p class="mt-1 text-xs text-slate-500">添加和管理团队成员的账号信息</p>
        </div>
        <div class="rounded-lg border border-slate-100 bg-slate-50 p-4">
          <h3 class="text-sm font-medium text-slate-900">配置模型</h3>
          <p class="mt-1 text-xs text-slate-500">接入 DeepSeek、Kimi 等 AI 模型供应商</p>
        </div>
        <div class="rounded-lg border border-slate-100 bg-slate-50 p-4">
          <h3 class="text-sm font-medium text-slate-900">管理 API Key</h3>
          <p class="mt-1 text-xs text-slate-500">为团队成员生成和管理 API Key</p>
        </div>
      </div>
    </div>
  </div>
</template>
