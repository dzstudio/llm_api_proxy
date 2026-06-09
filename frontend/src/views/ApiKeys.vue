<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { apiKeyApi, type ApiKeyItem, type ApiKeyCreated } from '@/api/apiKey'

const keys = ref<ApiKeyItem[]>([])
const loading = ref(false)
const error = ref('')

// Generate dialog
const showGenerateDialog = ref(false)
const generatedKey = ref<ApiKeyCreated | null>(null)
const copied = ref(false)

// Reset dialog
const showResetConfirm = ref(false)
const resettingKey = ref<ApiKeyItem | null>(null)
const resetKey = ref<ApiKeyCreated | null>(null)

// Delete confirmation
const showDeleteConfirm = ref(false)
const deletingKey = ref<ApiKeyItem | null>(null)

async function fetchKeys() {
  loading.value = true
  try {
    const res = await apiKeyApi.list()
    if (res.data.code === 0) {
      keys.value = res.data.data.list
    }
  } finally {
    loading.value = false
  }
}

// Generate
async function handleGenerate() {
  error.value = ''
  try {
    const res = await apiKeyApi.create()
    if (res.data.code === 0) {
      generatedKey.value = res.data.data
      copied.value = false
      showGenerateDialog.value = true
      fetchKeys()
    }
  } catch (err: any) {
    error.value = err.response?.data?.message || '生成失败'
  }
}

function copyKey() {
  if (!generatedKey.value) return
  navigator.clipboard.writeText(generatedKey.value.apiKey)
  copied.value = true
  setTimeout(() => { copied.value = false }, 3000)
}

// Reset
function confirmReset(item: ApiKeyItem) {
  resettingKey.value = item
  resetKey.value = null
  showResetConfirm.value = true
}

async function handleReset() {
  if (!resettingKey.value) return
  try {
    const res = await apiKeyApi.reset(resettingKey.value.id)
    if (res.data.code === 0) {
      resetKey.value = res.data.data
      fetchKeys()
    }
  } catch (err: any) {
    error.value = err.response?.data?.message || '重置失败'
    showResetConfirm.value = false
  }
}

// Toggle status
async function handleToggle(item: ApiKeyItem) {
  try {
    await apiKeyApi.toggleStatus(item.id)
    fetchKeys()
  } catch (err: any) {
    error.value = err.response?.data?.message || '操作失败'
  }
}

// Delete
function confirmDelete(item: ApiKeyItem) {
  deletingKey.value = item
  showDeleteConfirm.value = true
}

async function handleDelete() {
  if (!deletingKey.value) return
  try {
    await apiKeyApi.delete(deletingKey.value.id)
    showDeleteConfirm.value = false
    deletingKey.value = null
    fetchKeys()
  } catch (err: any) {
    error.value = err.response?.data?.message || '删除失败'
    showDeleteConfirm.value = false
  }
}

function formatTime(t: string) {
  if (!t) return '-'
  return new Date(t).toLocaleString('zh-CN')
}

const statusLabel = (s: number) => (s === 1 ? '启用' : '禁用')

onMounted(fetchKeys)
</script>

<template>
  <div>
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight text-slate-900">API Key 管理</h1>
        <p class="mt-1 text-sm text-slate-500">生成和管理团队成员的 API Key</p>
      </div>
      <button
        class="inline-flex items-center gap-2 rounded-lg bg-[#005d9c] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#004b80] transition-colors"
        @click="handleGenerate"
      >
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        生成 API Key
      </button>
    </div>

    <!-- Error -->
    <div v-if="error" class="mb-4 flex items-center justify-between rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
      <span>{{ error }}</span>
      <button class="text-red-400 hover:text-red-600" @click="error = ''">
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Table -->
    <div class="rounded-xl border border-slate-200 bg-white">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-slate-100 text-left">
              <th class="px-6 py-3 text-xs font-medium text-slate-500">所属用户</th>
              <th class="px-6 py-3 text-xs font-medium text-slate-500">API Key</th>
              <th class="px-6 py-3 text-xs font-medium text-slate-500">状态</th>
              <th class="px-6 py-3 text-xs font-medium text-slate-500">创建时间</th>
              <th class="px-6 py-3 text-xs font-medium text-slate-500">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="key in keys"
              :key="key.id"
              class="border-b border-slate-50 text-sm hover:bg-slate-50/50 transition-colors"
            >
              <td class="px-6 py-3 font-medium text-slate-900">{{ key.username }}</td>
              <td class="px-6 py-3 font-mono text-xs text-slate-500">{{ key.apiKey }}</td>
              <td class="px-6 py-3">
                <button
                  :class="[
                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors',
                    key.status === 1
                      ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                      : 'bg-red-50 text-red-600 hover:bg-red-100',
                  ]"
                  @click="handleToggle(key)"
                >
                  <span :class="['h-1.5 w-1.5 rounded-full', key.status === 1 ? 'bg-emerald-500' : 'bg-red-500']" />
                  {{ statusLabel(key.status) }}
                </button>
              </td>
              <td class="px-6 py-3 text-slate-500">{{ formatTime(key.createTime) }}</td>
              <td class="px-6 py-3">
                <div class="flex items-center gap-2">
                  <button
                    class="rounded-lg px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                    @click="confirmReset(key)"
                  >
                    重置
                  </button>
                  <button
                    class="rounded-lg px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                    @click="confirmDelete(key)"
                  >
                    删除
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="keys.length === 0 && !loading">
              <td colspan="5" class="px-6 py-12 text-center text-sm text-slate-400">
                暂无 API Key，点击上方按钮生成
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Generate Success Dialog -->
    <div v-if="showGenerateDialog" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/30" @click="showGenerateDialog = false" />
      <div class="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div class="mb-4 flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
            <svg class="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <div>
            <h2 class="text-lg font-semibold text-slate-900">API Key 已生成</h2>
            <p class="text-xs text-red-500">请立即复制保存，关闭后将无法再次查看</p>
          </div>
        </div>

        <div class="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div class="flex items-center justify-between gap-3">
            <code class="flex-1 break-all text-sm font-mono text-slate-900">{{ generatedKey?.apiKey }}</code>
            <button
              class="flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
              :class="copied ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'"
              @click="copyKey"
            >
              {{ copied ? '已复制' : '复制' }}
            </button>
          </div>
        </div>

        <button
          class="w-full rounded-lg bg-[#005d9c] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#004b80] transition-colors"
          @click="showGenerateDialog = false"
        >
          我已保存，关闭
        </button>
      </div>
    </div>

    <!-- Reset Dialog -->
    <div v-if="showResetConfirm" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/30" @click="showResetConfirm = false" />
      <div class="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <template v-if="!resetKey">
          <h2 class="mb-2 text-lg font-semibold text-slate-900">确认重置</h2>
          <p class="mb-5 text-sm text-slate-500">
            重置后原 Key 将立即失效，生成新的 API Key。
          </p>
          <div class="flex justify-end gap-3">
            <button
              class="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              @click="showResetConfirm = false"
            >
              取消
            </button>
            <button
              class="rounded-lg bg-[#f59e0b] px-4 py-2 text-sm font-medium text-white hover:bg-[#d97706] transition-colors"
              @click="handleReset"
            >
              确认重置
            </button>
          </div>
        </template>
        <template v-else>
          <div class="mb-4 flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
              <svg class="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <div>
              <h2 class="text-lg font-semibold text-slate-900">新 Key 已生成</h2>
              <p class="text-xs text-red-500">请立即复制保存</p>
            </div>
          </div>
          <div class="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <code class="break-all text-sm font-mono text-slate-900">{{ resetKey.apiKey }}</code>
          </div>
          <button
            class="w-full rounded-lg bg-[#005d9c] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#004b80] transition-colors"
            @click="showResetConfirm = false"
          >
            我已保存，关闭
          </button>
        </template>
      </div>
    </div>

    <!-- Delete Confirmation -->
    <div v-if="showDeleteConfirm" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/30" @click="showDeleteConfirm = false" />
      <div class="relative w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h2 class="mb-2 text-lg font-semibold text-slate-900">确认删除</h2>
        <p class="mb-5 text-sm text-slate-500">
          确定要删除此 API Key 吗？删除后立即失效，此操作不可撤销。
        </p>
        <div class="flex justify-end gap-3">
          <button
            class="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            @click="showDeleteConfirm = false"
          >
            取消
          </button>
          <button
            class="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
            @click="handleDelete"
          >
            确认删除
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
