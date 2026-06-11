<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { modelApi, type ModelItem } from '@/api/model'
import { apiKeyApi, type ApiKeyItem } from '@/api/apiKey'

const authStore = useAuthStore()
const userInfo = computed(() => authStore.userInfo)

const baseUrl = computed(() => {
  if (typeof window !== 'undefined') return window.location.origin
  return 'http://localhost:8080'
})

const models = ref<ModelItem[]>([])
const apiKeys = ref<ApiKeyItem[]>([])
const loading = ref(false)

const activeApiKey = computed(() => apiKeys.value.find(k => k.status === 1))
const maskedApiKey = computed(() => {
  const key = activeApiKey.value?.apiKey
  if (!key || key.length < 24) return key || ''
  return `${key.substring(0, 14)}...${key.substring(key.length - 8)}`
})
const toast = ref('')
let toastTimer: ReturnType<typeof setTimeout> | null = null

async function fetchData() {
  loading.value = true
  try {
    const [modelRes, keyRes] = await Promise.all([
      modelApi.list().catch(() => null),
      apiKeyApi.list().catch(() => null),
    ])
    if (modelRes?.data?.code === 0) {
      models.value = modelRes.data.data.list
    }
    if (keyRes?.data?.code === 0) {
      const allKeys = Array.isArray(keyRes.data.data) ? keyRes.data.data : keyRes.data.data.list
      if (allKeys) {
        apiKeys.value = allKeys.filter((k: ApiKeyItem) => k.userId === userInfo.value?.id)
      }
    }
  } finally {
    loading.value = false
  }
}

async function copyText(text: string) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
    } else {
      // Fallback for HTTP (non-secure context)
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.left = '-9999px'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    showToast('复制成功')
  } catch {
    showToast('复制失败')
  }
}

async function copyApiKey() {
  if (!activeApiKey.value) return
  await copyText(activeApiKey.value.apiKey)
}

function copyBaseUrl() {
  copyText(`${baseUrl.value}/api/llm`)
}

function showToast(msg: string) {
  toast.value = msg
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value = '' }, 2000)
}

onMounted(fetchData)
</script>

<template>
  <div>
    <!-- Toast -->
    <Transition name="toast">
      <div v-if="toast" class="fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 shadow-lg border border-emerald-200">
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
        {{ toast }}
      </div>
    </Transition>

    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-xl font-bold text-gray-900">接入信息</h1>
      <p class="text-sm text-gray-500 mt-0.5">LLM Gateway 接入配置和凭证</p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-16">
      <div class="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
    </div>

    <template v-else>
      <!-- Basic Info -->
      <div class="rounded-xl bg-white border border-gray-200 shadow-sm p-6 mb-6">
        <h3 class="text-sm font-semibold text-gray-900 mb-4">基本信息</h3>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div class="rounded-lg bg-gray-50 p-4">
            <p class="text-xs text-gray-500">姓名</p>
            <p class="mt-1 text-sm font-medium text-gray-900">{{ userInfo?.realName || '-' }}</p>
          </div>
          <div class="rounded-lg bg-gray-50 p-4">
            <p class="text-xs text-gray-500">用户名</p>
            <p class="mt-1 text-sm font-medium text-gray-900">{{ userInfo?.username || '-' }}</p>
          </div>
          <div class="rounded-lg bg-gray-50 p-4">
            <p class="text-xs text-gray-500">角色</p>
            <p class="mt-1 text-sm font-medium text-gray-900">{{ userInfo?.role === 'ADMIN' ? '管理员' : '员工' }}</p>
          </div>
          <div class="rounded-lg bg-gray-50 p-4">
            <p class="text-xs text-gray-500">接入状态</p>
            <p class="mt-1 text-sm font-medium" :class="activeApiKey ? 'text-green-600' : 'text-yellow-600'">
              {{ activeApiKey ? '已激活' : '未配置' }}
            </p>
          </div>
        </div>
      </div>

      <!-- LLM Gateway Access -->
      <div class="rounded-xl bg-white border border-gray-200 shadow-sm p-6 mb-6">
        <h3 class="text-sm font-semibold text-gray-900 mb-4">LLM Gateway 接入信息</h3>
        <div class="space-y-4">
          <!-- Endpoint -->
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1.5">接入地址（CC-Switch / Claude Code）</label>
            <div class="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 flex items-center justify-between group">
              <code class="text-sm font-mono text-gray-800 break-all">{{ baseUrl }}/api/llm</code>
              <button
                class="ml-3 flex-shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100"
                @click="copyBaseUrl"
              >
                复制
              </button>
            </div>
            <p class="text-xs text-gray-400 mt-1">此地址可直接填入 CC-Switch 的 ANTHROPIC_BASE_URL 或 Claude Code 配置</p>
          </div>

          <!-- Available Models -->
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1.5">可用模型</label>
            <div class="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3">
              <template v-if="models.length > 0">
                <div class="flex flex-wrap gap-2">
                  <span
                    v-for="m in models"
                    :key="m.id"
                    class="inline-flex items-center rounded-md bg-white border border-gray-300 px-2.5 py-1 text-xs font-mono text-gray-700"
                  >
                    {{ m.modelName }}
                  </span>
                </div>
                <p class="text-xs text-gray-400 mt-2">调用时直接传入以上模型名称</p>
              </template>
              <p v-else class="text-sm text-gray-400">暂无模型</p>
            </div>
          </div>

          <!-- API Key -->
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1.5">API Key</label>
            <div v-if="activeApiKey" class="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3">
              <div class="flex items-center gap-2">
                <code class="flex-1 text-sm font-mono text-gray-800">{{ maskedApiKey }}</code>
                <button
                  class="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0"
                  @click="copyApiKey"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                  复制
                </button>
              </div>
              <p class="text-xs text-gray-400 mt-1.5">创建时间：{{ activeApiKey.createTime }}</p>
            </div>
            <div v-else class="rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3 flex items-start gap-2.5">
              <svg class="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <div>
                <p class="text-sm font-medium text-yellow-800">暂无 API Key</p>
                <p class="text-xs text-yellow-600 mt-0.5">请联系管理员为你创建 API Key，之后即可通过 LLM Gateway 调用模型。</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Usage Guide -->
      <div class="rounded-xl bg-white border border-gray-200 shadow-sm p-6">
        <h3 class="text-sm font-semibold text-gray-900 mb-4">调用示例</h3>
        <div class="space-y-4">
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1.5">Claude Code / Anthropic 兼容（推荐）</label>
            <div class="rounded-lg bg-gray-50 p-4">
              <pre class="text-xs font-mono text-gray-700 whitespace-pre-wrap overflow-x-auto">curl {{ baseUrl }}/api/llm/v1/messages \
  -H "x-api-key: {{ activeApiKey ? activeApiKey.apiKey : '<your-api-key>' }}" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "{{ models.length > 0 ? models[0].modelName : '<model-name>' }}",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 1024
  }'</pre>
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1.5">OpenAI 兼容格式</label>
            <div class="rounded-lg bg-gray-50 p-4">
              <pre class="text-xs font-mono text-gray-700 whitespace-pre-wrap overflow-x-auto">curl {{ baseUrl }}/api/llm/v1/chat/completions \
  -H "Authorization: Bearer {{ activeApiKey ? activeApiKey.apiKey : '<your-api-key>' }}" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "{{ models.length > 0 ? models[0].modelName : '<model-name>' }}",
    "messages": [{"role": "user", "content": "Hello"}]
  }'</pre>
            </div>
          </div>
        </div>      </div>
    </template>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, -12px);
}
</style>
