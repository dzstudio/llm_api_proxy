<script setup lang="ts">
import { ref, computed } from 'vue'
import { authApi } from '@/api/auth'

const baseUrl = computed(() => {
  if (typeof window !== 'undefined') return window.location.origin
  return 'http://localhost:8080'
})

// Password change
const showPasswordForm = ref(false)
const passwordForm = ref({ currentPassword: '', newPassword: '', confirmPassword: '' })
const passwordLoading = ref(false)
const passwordError = ref('')
const passwordSuccess = ref('')

async function handleChangePassword() {
  passwordError.value = ''
  passwordSuccess.value = ''

  if (!passwordForm.value.currentPassword || !passwordForm.value.newPassword) {
    passwordError.value = '请填写所有密码字段'
    return
  }
  if (passwordForm.value.newPassword.length < 6) {
    passwordError.value = '新密码至少6位'
    return
  }
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    passwordError.value = '两次输入的新密码不一致'
    return
  }

  passwordLoading.value = true
  try {
    await authApi.changePassword(passwordForm.value.currentPassword, passwordForm.value.newPassword)
    passwordSuccess.value = '密码修改成功'
    passwordForm.value = { currentPassword: '', newPassword: '', confirmPassword: '' }
    showPasswordForm.value = false
    setTimeout(() => { passwordSuccess.value = '' }, 3000)
  } catch (err: any) {
    passwordError.value = err.response?.data?.message || '修改失败'
  } finally {
    passwordLoading.value = false
  }
}
</script>

<template>
  <div>
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-xl font-bold text-gray-900">系统设置</h1>
      <p class="text-sm text-gray-500 mt-0.5">管理系统配置和查看系统信息</p>
    </div>

    <!-- Success Message -->
    <div v-if="passwordSuccess" class="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-600">
      {{ passwordSuccess }}
    </div>

    <!-- System Info Card -->
    <div class="rounded-xl bg-white border border-gray-200 shadow-sm p-6 mb-6">
      <h3 class="text-sm font-semibold text-gray-900 mb-4">系统信息</h3>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div class="rounded-lg bg-gray-50 p-4">
          <p class="text-xs text-gray-500">应用名称</p>
          <p class="mt-1 text-sm font-medium text-gray-900">LLM API Proxy</p>
        </div>
        <div class="rounded-lg bg-gray-50 p-4">
          <p class="text-xs text-gray-500">版本</p>
          <p class="mt-1 text-sm font-medium text-gray-900">1.0.0</p>
        </div>
        <div class="rounded-lg bg-gray-50 p-4">
          <p class="text-xs text-gray-500">技术栈</p>
          <p class="mt-1 text-sm font-medium text-gray-900">Vue 3 + Express + Prisma + SQLite</p>
        </div>
        <div class="rounded-lg bg-gray-50 p-4">
          <p class="text-xs text-gray-500">部署方式</p>
          <p class="mt-1 text-sm font-medium text-gray-900">Docker / 源码部署</p>
        </div>
      </div>
    </div>

    <!-- Password Change Card -->
    <div class="rounded-xl bg-white border border-gray-200 shadow-sm p-6 mb-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-sm font-semibold text-gray-900">安全设置</h3>
        <button
          v-if="!showPasswordForm"
          class="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          @click="showPasswordForm = true"
        >
          修改密码
        </button>
      </div>

      <div v-if="showPasswordForm" class="max-w-sm space-y-3">
        <div v-if="passwordError" class="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{{ passwordError }}</div>
        <div>
          <label class="block text-xs font-medium text-gray-700 mb-1">当前密码</label>
          <input
            v-model="passwordForm.currentPassword"
            type="password"
            class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-blue-400 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] outline-none transition-all"
            placeholder="输入当前密码"
          />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-700 mb-1">新密码</label>
          <input
            v-model="passwordForm.newPassword"
            type="password"
            class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-blue-400 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] outline-none transition-all"
            placeholder="输入新密码（至少6位）"
          />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-700 mb-1">确认新密码</label>
          <input
            v-model="passwordForm.confirmPassword"
            type="password"
            class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-blue-400 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] outline-none transition-all"
            placeholder="再次输入新密码"
          />
        </div>
        <div class="flex items-center gap-2 pt-1">
          <button
            :disabled="passwordLoading"
            class="rounded-lg bg-[#111827] px-4 py-2 text-sm font-medium text-white hover:bg-[#1F2937] disabled:opacity-50 transition-colors"
            @click="handleChangePassword"
          >
            {{ passwordLoading ? '修改中...' : '确认修改' }}
          </button>
          <button
            class="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            @click="showPasswordForm = false"
          >
            取消
          </button>
        </div>
      </div>
      <p v-else class="text-sm text-gray-400">定期更新密码以保障账户安全</p>
    </div>

    <!-- API Key Usage Guide -->
    <div class="rounded-xl bg-white border border-gray-200 shadow-sm p-6">
      <h3 class="text-sm font-semibold text-gray-900 mb-4">API Key 使用说明</h3>
      <div class="space-y-3 text-sm text-gray-600">
        <p>获取 API Key 后，可通过以下方式调用模型：</p>
        <div class="rounded-lg bg-gray-50 p-4">
          <pre class="text-xs font-mono text-gray-700 whitespace-pre-wrap">curl {{ baseUrl }}/api/llm/v1/chat/completions \
  -H "Authorization: Bearer &lt;your-api-key&gt;" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "&lt;model-name&gt;",
    "messages": [{"role": "user", "content": "Hello"}]
  }'</pre>
        </div>
        <p>其中 <code class="rounded bg-gray-100 px-1 py-0.5 text-xs">model</code> 参数使用后台配置的模型标识（modelName），系统会自动匹配对应的模型配置。</p>
      </div>
    </div>
  </div>
</template>
