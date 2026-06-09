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
  if (e.key === 'Enter') handleLogin()
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-[#f8fafc] px-4">
    <div class="w-full max-w-[400px]">
      <!-- Logo & Title -->
      <div class="mb-10 text-center">
        <div class="mb-4 flex items-center justify-center">
          <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-[#005d9c]">
            <svg class="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
            </svg>
          </div>
        </div>
        <h1 class="text-xl font-semibold tracking-tight text-slate-900">
          LLM API Proxy
        </h1>
        <p class="mt-2 text-sm text-slate-500">企业级 AI Gateway + 工作审计平台</p>
      </div>

      <!-- Login Card -->
      <div class="rounded-xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <!-- Error Message -->
        <div v-if="error" class="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          {{ error }}
        </div>

        <div class="space-y-5">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">用户名</label>
            <input
              v-model="form.username"
              type="text"
              placeholder="请输入用户名"
              class="block w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#005d9c] focus:outline-none focus:ring-1 focus:ring-[#005d9c] transition-colors"
              @keydown="handleKeydown"
            />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">密码</label>
            <input
              v-model="form.password"
              type="password"
              placeholder="请输入密码"
              class="block w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#005d9c] focus:outline-none focus:ring-1 focus:ring-[#005d9c] transition-colors"
              @keydown="handleKeydown"
            />
          </div>
          <button
            :disabled="loading"
            class="flex w-full items-center justify-center rounded-lg bg-[#005d9c] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#004b80] disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            @click="handleLogin"
          >
            <svg v-if="loading" class="mr-2 h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {{ loading ? '登录中...' : '登录' }}
          </button>
        </div>
      </div>

      <!-- Footer -->
      <p class="mt-8 text-center text-xs text-slate-400">
        LLM API Proxy &copy; 2026
      </p>
    </div>
  </div>
</template>
