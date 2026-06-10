<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { modelApi, type ModelItem, type CreateModelData } from '@/api/model'

const models = ref<ModelItem[]>([])
const loading = ref(false)
const error = ref('')

// Dialog
const showDialog = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const editingId = ref<number | null>(null)
const submitting = ref(false)
const dialogError = ref('')

// Delete
const showDeleteConfirm = ref(false)
const deletingModel = ref<ModelItem | null>(null)

const providers = ['DeepSeek', 'Kimi', 'MiniMax', 'Xiaomi']

const form = reactive<CreateModelData>({
  name: '',
  provider: 'DeepSeek',
  modelName: '',
  baseUrl: '',
  apiKey: '',
  timeoutSeconds: 60,
})

async function fetchModels() {
  loading.value = true
  try {
    const res = await modelApi.list()
    if (res.data.code === 0) models.value = res.data.data.list
  } finally {
    loading.value = false
  }
}

function openCreate() {
  dialogMode.value = 'create'
  editingId.value = null
  form.name = ''
  form.provider = 'DeepSeek'
  form.modelName = ''
  form.baseUrl = ''
  form.apiKey = ''
  form.timeoutSeconds = 60
  dialogError.value = ''
  showDialog.value = true
}

function openEdit(m: ModelItem) {
  dialogMode.value = 'edit'
  editingId.value = m.id
  form.name = m.name
  form.provider = m.provider
  form.modelName = m.modelName
  form.baseUrl = m.baseUrl
  form.apiKey = m.apiKey
  form.timeoutSeconds = m.timeoutSeconds
  dialogError.value = ''
  showDialog.value = true
}

function copyModel(m: ModelItem) {
  dialogMode.value = 'create'
  editingId.value = null
  form.name = `${m.name} (副本)`
  form.provider = m.provider
  form.modelName = m.modelName
  form.baseUrl = m.baseUrl
  form.apiKey = m.apiKey
  form.timeoutSeconds = m.timeoutSeconds
  dialogError.value = ''
  showDialog.value = true
}

async function handleSubmit() {
  dialogError.value = ''
  if (!form.name || !form.modelName || !form.baseUrl || !form.apiKey) {
    dialogError.value = '请填写名称、模型标识、Base URL 和 API Key'
    return
  }
  submitting.value = true
  try {
    if (dialogMode.value === 'create') {
      await modelApi.create(form)
    } else if (editingId.value) {
      await modelApi.update(editingId.value, form)
    }
    showDialog.value = false
    fetchModels()
  } catch (err: any) {
    dialogError.value = err.response?.data?.message || '操作失败'
  } finally {
    submitting.value = false
  }
}

async function handleToggle(m: ModelItem) {
  try {
    await modelApi.toggleStatus(m.id)
    fetchModels()
  } catch (err: any) {
    error.value = err.response?.data?.message || '操作失败'
  }
}

async function handleSetReview(m: ModelItem) {
  try {
    await modelApi.setReview(m.id)
    fetchModels()
  } catch (err: any) {
    error.value = err.response?.data?.message || '操作失败'
  }
}

function confirmDelete(m: ModelItem) {
  deletingModel.value = m
  showDeleteConfirm.value = true
}

async function handleDelete() {
  if (!deletingModel.value) return
  try {
    await modelApi.delete(deletingModel.value.id)
    showDeleteConfirm.value = false
    deletingModel.value = null
    fetchModels()
  } catch (err: any) {
    error.value = err.response?.data?.message || '删除失败'
    showDeleteConfirm.value = false
  }
}

onMounted(fetchModels)
</script>

<template>
  <div>
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight text-slate-900">模型管理</h1>
        <p class="mt-1 text-sm text-slate-500">配置 AI 模型供应商和参数</p>
      </div>
      <button
        class="inline-flex items-center gap-2 rounded-lg bg-[#111827] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1F2937] transition-colors"
        @click="openCreate"
      >
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        添加模型
      </button>
    </div>

    <!-- Error -->
    <div v-if="error" class="mb-4 flex items-center justify-between rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
      <span>{{ error }}</span>
      <button class="text-red-400 hover:text-red-600" @click="error = ''">
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    </div>

    <!-- Table -->
    <div class="rounded-xl border border-slate-200 bg-white">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-slate-100 text-left">
              <th class="px-6 py-3 text-xs font-medium text-slate-500">名称</th>
              <th class="px-6 py-3 text-xs font-medium text-slate-500">供应商</th>
              <th class="px-6 py-3 text-xs font-medium text-slate-500">模型标识</th>
              <th class="px-6 py-3 text-xs font-medium text-slate-500">Base URL</th>
              <th class="px-6 py-3 text-xs font-medium text-slate-500">状态</th>
              <th class="px-6 py-3 text-xs font-medium text-slate-500">评价模型</th>
              <th class="px-6 py-3 text-xs font-medium text-slate-500">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in models" :key="m.id" class="border-b border-slate-50 text-sm hover:bg-slate-50/50">
              <td class="px-6 py-3 font-medium text-slate-900">{{ m.name }}</td>
              <td class="px-6 py-3">
                <span class="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                  {{ m.provider }}
                </span>
              </td>
              <td class="px-6 py-3 font-mono text-xs text-slate-500">{{ m.modelName }}</td>
              <td class="px-6 py-3 max-w-[200px] truncate text-xs text-slate-400">{{ m.baseUrl || '-' }}</td>
              <td class="px-6 py-3">
                <button
                  :class="[
                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors',
                    m.enabled === 1 ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200',
                  ]"
                  @click="handleToggle(m)"
                >
                  <span :class="['h-1.5 w-1.5 rounded-full', m.enabled === 1 ? 'bg-emerald-500' : 'bg-slate-400']" />
                  {{ m.enabled === 1 ? '启用' : '禁用' }}
                </button>
              </td>
              <td class="px-6 py-3">
                <button
                  :class="[
                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors',
                    m.isReviewModel === 1 ? 'bg-[#3B82F6]/10 text-[#3B82F6]' : 'bg-slate-100 text-slate-500 hover:bg-slate-200',
                  ]"
                  @click="handleSetReview(m)"
                >
                  {{ m.isReviewModel === 1 ? '评价模型' : '设为评价' }}
                </button>
              </td>
              <td class="px-6 py-3">
                <div class="flex items-center gap-1.5">
                  <button class="rounded-lg px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100" @click="openEdit(m)">编辑</button>
                  <button class="rounded-lg px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50" @click="copyModel(m)">复制</button>
                  <button class="rounded-lg px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50" @click="confirmDelete(m)">删除</button>
                </div>
              </td>
            </tr>
            <tr v-if="models.length === 0 && !loading">
              <td colspan="7" class="px-6 py-12 text-center text-sm text-slate-400">暂无模型，点击上方添加</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Dialog -->
    <div v-if="showDialog" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/30" @click="showDialog = false" />
      <div class="relative w-full max-w-lg rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <h2 class="mb-5 text-lg font-semibold text-slate-900">
          {{ dialogMode === 'create' ? '添加模型' : '编辑模型' }}
        </h2>

        <div v-if="dialogError" class="mb-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{{ dialogError }}</div>

        <div class="space-y-4">
          <div>
            <label class="mb-1 block text-xs font-medium text-slate-600">显示名称</label>
            <input v-model="form.name" placeholder="如 DeepSeek V4" class="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#111827] focus:outline-none focus:ring-1 focus:ring-[#111827]" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-slate-600">供应商</label>
            <select v-model="form.provider" class="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#111827] focus:outline-none focus:ring-1 focus:ring-[#111827]">
              <option v-for="p in providers" :key="p" :value="p">{{ p }}</option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-slate-600">模型标识 (model name)</label>
            <input v-model="form.modelName" placeholder="如 deepseek-chat" class="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono focus:border-[#111827] focus:outline-none focus:ring-1 focus:ring-[#111827]" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-slate-600">Base URL</label>
            <input v-model="form.baseUrl" placeholder="如 https://api.deepseek.com/v1" class="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono focus:border-[#111827] focus:outline-none focus:ring-1 focus:ring-[#111827]" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-slate-600">API Key</label>
            <input v-model="form.apiKey" type="password" placeholder="供应商 API Key" class="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#111827] focus:outline-none focus:ring-1 focus:ring-[#111827]" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-slate-600">超时(秒)</label>
            <input v-model.number="form.timeoutSeconds" type="number" class="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#111827] focus:outline-none focus:ring-1 focus:ring-[#111827]" />
          </div>
        </div>

        <div class="mt-6 flex justify-end gap-3">
          <button class="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50" @click="showDialog = false">取消</button>
          <button :disabled="submitting" class="rounded-lg bg-[#111827] px-4 py-2 text-sm font-medium text-white hover:bg-[#1F2937] disabled:opacity-50" @click="handleSubmit">{{ submitting ? '提交中...' : '确认' }}</button>
        </div>
      </div>
    </div>

    <!-- Delete -->
    <div v-if="showDeleteConfirm" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/30" @click="showDeleteConfirm = false" />
      <div class="relative w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h2 class="mb-2 text-lg font-semibold text-slate-900">确认删除</h2>
        <p class="mb-5 text-sm text-slate-500">确定要删除模型「{{ deletingModel?.name }}」吗？</p>
        <div class="flex justify-end gap-3">
          <button class="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50" @click="showDeleteConfirm = false">取消</button>
          <button class="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700" @click="handleDelete">确认删除</button>
        </div>
      </div>
    </div>
  </div>
</template>
