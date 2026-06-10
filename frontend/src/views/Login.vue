<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const form = ref({ username: '', password: '' })
const loading = ref(false)
const error = ref('')

async function handleLogin() {
  if (!form.value.username || !form.value.password) {
    error.value = '请输入用户名和密码'
    return
  }
  loading.value = true
  error.value = ''
  try {
    await authStore.login(form.value)
    router.push('/dashboard')
  } catch (e: any) {
    error.value = e.message || '登录失败，请重试'
  } finally {
    loading.value = false
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !loading.value) handleLogin()
}
</script>

<template>
  <div class="flex min-h-screen w-full bg-[#F8FAFC]">
    <!-- Left: Login Form -->
    <div class="flex flex-col items-center justify-center w-full max-w-md px-12 py-16 bg-white border-r border-gray-100" style="min-height:100vh;">
      <!-- Logo -->
      <div class="mb-10 flex flex-col items-center gap-3">
        <img src="/logo.png" alt="LLM API Proxy" class="w-16 h-16 rounded-2xl object-contain" />
        <div>
          <div class="text-xl font-bold text-gray-900 tracking-tight text-center">AI Workspace</div>
          <div class="text-xs text-gray-400 text-center mt-0.5">企业 AI 工作平台</div>
        </div>
      </div>

      <!-- Form -->
      <div class="w-full">
        <h1 class="text-2xl font-semibold text-gray-900 mb-1">欢迎回来</h1>
        <p class="text-sm text-gray-500 mb-8">登录以继续使用 AI Workspace</p>

        <!-- Error Message -->
        <div v-if="error" class="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          {{ error }}
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">账号</label>
            <input
              v-model="form.username"
              type="text"
              placeholder="请输入用户名"
              class="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:border-[#3B82F6] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] outline-none transition-all"
              @keydown="handleKeydown"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">密码</label>
            <input
              v-model="form.password"
              type="password"
              placeholder="请输入密码"
              class="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:border-[#3B82F6] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] outline-none transition-all"
              @keydown="handleKeydown"
            />
          </div>
        </div>

        <button
          :disabled="loading"
          class="flex w-full items-center justify-center gap-2 mt-6 rounded-lg bg-[#111827] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1F2937] disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
          @click="handleLogin"
        >
          <svg v-if="loading" class="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {{ loading ? '登录中...' : '登录' }}
        </button>

        <div class="mt-6 pt-6 border-t border-gray-100 text-center">
          <p class="text-xs text-gray-400">LLM API Proxy &copy; 2026</p>
        </div>
      </div>
    </div>

    <!-- Right: Feature Intro -->
    <div class="flex-1 flex flex-col justify-center px-20 py-16" style="background: linear-gradient(135deg,#F8FAFC 0%,#EFF6FF 100%);">
      <div class="max-w-lg">
        <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-8 bg-[#DBEAFE] text-[#1D4ED8]">
          <div class="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
          Enterprise · AI Gateway
        </div>
        <h2 class="text-3xl font-bold text-gray-900 leading-tight mb-4">统一管理你的<br/>企业 AI 工作流</h2>
        <p class="text-gray-500 text-sm leading-relaxed mb-10">
          LLM API Proxy 作为企业级 AI Gateway，统一接入 DeepSeek、Kimi、MiniMax 等大模型服务，管理员工的 AI Coding 工具使用，分析工作效率与 Prompt 质量。
        </p>

        <div class="space-y-4">
          <div class="flex items-start gap-3">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 bg-[#DBEAFE]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" stroke-width="2.5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div>
              <p class="text-sm font-semibold text-gray-800">员工管理与访问控制</p>
              <p class="text-xs text-gray-500 mt-0.5">细粒度管理员工权限、API Key 及模型访问策略</p>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 bg-[#D1FAE5]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.5">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
            </div>
            <div>
              <p class="text-sm font-semibold text-gray-800">AI 工作记录与效率分析</p>
              <p class="text-xs text-gray-500 mt-0.5">追踪每位员工的 AI 使用情况，自动生成工作总结与质量评分</p>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 bg-[#F3E8FF]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9333EA" stroke-width="2.5">
                <circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3 M4.93 4.93l2.12 2.12 M16.95 16.95l2.12 2.12 M4.93 19.07l2.12-2.12 M16.95 7.05l2.12-2.12"/>
              </svg>
            </div>
            <div>
              <p class="text-sm font-semibold text-gray-800">多模型统一接入</p>
              <p class="text-xs text-gray-500 mt-0.5">DeepSeek、Kimi、MiniMax 等主流大模型一键切换</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
