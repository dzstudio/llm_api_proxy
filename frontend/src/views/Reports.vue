<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { reportApi, type ReportItem, type ReportDetail, type ReportStats } from '@/api/report'
import { userApi, type UserItem } from '@/api/user'

const reports = ref<ReportItem[]>([])
const loading = ref(false)
const error = ref('')
const total = ref(0)
const page = ref(1)
const pageSize = 20

const stats = ref<ReportStats | null>(null)
const showDetail = ref(false)
const detail = ref<ReportDetail | null>(null)
const detailLoading = ref(false)

const users = ref<UserItem[]>([])
const filters = ref({
  userId: undefined as number | undefined,
  startDate: '',
  endDate: '',
})

async function fetchStats() {
  try {
    const res = await reportApi.stats()
    if (res.data.code === 0) stats.value = res.data.data
  } catch { /* non-critical */ }
}

async function fetchReports() {
  loading.value = true
  try {
    const params: any = { page: page.value, pageSize }
    if (filters.value.userId) params.userId = filters.value.userId
    if (filters.value.startDate) params.startDate = filters.value.startDate
    if (filters.value.endDate) params.endDate = filters.value.endDate

    const res = await reportApi.list(params)
    if (res.data.code === 0) {
      reports.value = res.data.data.list
      total.value = res.data.data.total
    }
  } catch (err: any) {
    error.value = err.response?.data?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function fetchUsers() {
  try {
    const res = await userApi.list({})
    if (res.data.code === 0) users.value = res.data.data.list
  } catch { /* non-critical */ }
}

async function openDetail(r: ReportItem) {
  showDetail.value = true
  detailLoading.value = true
  detail.value = null
  try {
    const res = await reportApi.detail(r.id)
    if (res.data.code === 0) detail.value = res.data.data
  } catch (err: any) {
    error.value = err.response?.data?.message || '加载详情失败'
    showDetail.value = false
  } finally {
    detailLoading.value = false
  }
}

function applyFilters() {
  page.value = 1
  fetchReports()
}

function resetFilters() {
  filters.value.userId = undefined
  filters.value.startDate = ''
  filters.value.endDate = ''
  page.value = 1
  fetchReports()
}

function formatDate(t: string) {
  if (!t) return '-'
  const d = new Date(t)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatFullTime(t: string) {
  return t ? new Date(t).toLocaleString('zh-CN') : '-'
}

function formatTokens(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return String(n)
}

function getScoreColor(score: number | null) {
  if (score === null) return 'text-slate-400'
  if (score >= 80) return 'text-emerald-600'
  if (score >= 60) return 'text-amber-600'
  return 'text-red-600'
}

watch([page], () => {
  fetchReports()
})

watch(showDetail, (val) => {
  if (!val) detail.value = null
})

onMounted(() => {
  fetchReports()
  fetchStats()
  fetchUsers()
})
</script>

<template>
  <div>
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-2xl font-semibold tracking-tight text-slate-900">工作记录</h1>
      <p class="mt-1 text-sm text-slate-500">每日自动生成的 AI 使用报告</p>
    </div>

    <!-- Stats Cards -->
    <div v-if="stats" class="mb-6 grid grid-cols-3 gap-4">
      <div class="rounded-xl border border-slate-200 bg-white p-4">
        <p class="text-xs font-medium text-slate-500">累计报告</p>
        <p class="mt-1 text-2xl font-semibold text-slate-900">{{ stats.totalReports }}</p>
      </div>
      <div class="rounded-xl border border-slate-200 bg-white p-4">
        <p class="text-xs font-medium text-slate-500">累计 Prompt</p>
        <p class="mt-1 text-2xl font-semibold text-slate-900">{{ formatTokens(stats.totalPrompts) }}</p>
      </div>
      <div class="rounded-xl border border-slate-200 bg-white p-4">
        <p class="text-xs font-medium text-slate-500">累计 Token</p>
        <p class="mt-1 text-2xl font-semibold text-slate-900">{{ formatTokens(stats.totalTokens) }}</p>
      </div>
    </div>

    <!-- Filters -->
    <div class="mb-4 flex flex-wrap items-end gap-3">
      <div>
        <label class="mb-1 block text-xs font-medium text-slate-500">用户</label>
        <select v-model="filters.userId" class="rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <option :value="undefined">全部</option>
          <option v-for="u in users" :key="u.id" :value="u.id">{{ u.realName || u.username }}</option>
        </select>
      </div>
      <div>
        <label class="mb-1 block text-xs font-medium text-slate-500">开始日期</label>
        <input v-model="filters.startDate" type="date" class="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
      </div>
      <div>
        <label class="mb-1 block text-xs font-medium text-slate-500">结束日期</label>
        <input v-model="filters.endDate" type="date" class="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
      </div>
      <button class="rounded-lg bg-[#005d9c] px-4 py-2 text-sm font-medium text-white hover:bg-[#004b80]" @click="applyFilters">搜索</button>
      <button class="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50" @click="resetFilters">重置</button>
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
              <th class="px-6 py-3 text-xs font-medium text-slate-500">日期</th>
              <th class="px-6 py-3 text-xs font-medium text-slate-500">用户</th>
              <th class="px-6 py-3 text-xs font-medium text-slate-500">摘要</th>
              <th class="px-6 py-3 text-xs font-medium text-slate-500">Prompt</th>
              <th class="px-6 py-3 text-xs font-medium text-slate-500">Token</th>
              <th class="px-6 py-3 text-xs font-medium text-slate-500">评分</th>
              <th class="px-6 py-3 text-xs font-medium text-slate-500">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in reports" :key="r.id" class="border-b border-slate-50 text-sm hover:bg-slate-50/50">
              <td class="px-6 py-3 text-slate-700">{{ formatDate(r.reportDate) }}</td>
              <td class="px-6 py-3 text-slate-600">{{ r.username }}</td>
              <td class="px-6 py-3 max-w-[300px] truncate text-slate-500">{{ r.summary }}</td>
              <td class="px-6 py-3 font-mono text-xs text-slate-500">{{ r.promptCount }}</td>
              <td class="px-6 py-3 font-mono text-xs text-slate-500">{{ formatTokens(r.tokenCount) }}</td>
              <td class="px-6 py-3">
                <span :class="['font-mono text-xs font-medium', getScoreColor(r.score)]">
                  {{ r.score !== null ? r.score : '-' }}
                </span>
              </td>
              <td class="px-6 py-3">
                <button class="rounded-lg px-2.5 py-1 text-xs font-medium text-[#005d9c] hover:bg-[#005d9c]/10" @click="openDetail(r)">查看</button>
              </td>
            </tr>
            <tr v-if="reports.length === 0 && !loading">
              <td colspan="7" class="px-6 py-12 text-center text-sm text-slate-400">暂无日报记录</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="total > pageSize" class="flex items-center justify-between border-t border-slate-100 px-6 py-3">
        <span class="text-xs text-slate-500">共 {{ total }} 条</span>
        <div class="flex items-center gap-2">
          <button
            :disabled="page <= 1"
            class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            @click="page--"
          >
            上一页
          </button>
          <span class="text-xs text-slate-500">{{ page }} / {{ Math.ceil(total / pageSize) }}</span>
          <button
            :disabled="page >= Math.ceil(total / pageSize)"
            class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            @click="page++"
          >
            下一页
          </button>
        </div>
      </div>
    </div>

    <!-- Top Users -->
    <div v-if="stats && stats.topUsers.length > 0" class="mt-6">
      <div class="rounded-xl border border-slate-200 bg-white p-5">
        <h3 class="mb-4 text-sm font-semibold text-slate-900">用户工作排行</h3>
        <div v-for="(u, i) in stats.topUsers" :key="u.userId" class="flex items-center justify-between border-b border-slate-50 py-2.5 last:border-0">
          <div class="flex items-center gap-3">
            <span class="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-500">{{ i + 1 }}</span>
            <span class="text-sm text-slate-700">{{ u.username }}</span>
          </div>
          <div class="flex items-center gap-4 text-xs text-slate-500">
            <span>{{ u.reportCount }} 份报告</span>
            <span class="font-mono">{{ formatTokens(u.totalPrompts) }} prompts</span>
            <span class="font-mono">{{ formatTokens(u.totalTokens) }} tokens</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Detail Dialog -->
    <div v-if="showDetail" class="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]">
      <div class="absolute inset-0 bg-black/30" @click="showDetail = false" />
      <div class="relative w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <div v-if="detailLoading" class="flex items-center justify-center py-12">
          <div class="h-6 w-6 animate-spin rounded-full border-2 border-[#005d9c] border-t-transparent" />
        </div>

        <template v-else-if="detail">
          <div class="mb-5 flex items-start justify-between">
            <div>
              <h2 class="text-lg font-semibold text-slate-900">{{ detail.username }} 的工作日报</h2>
              <p class="mt-1 text-xs text-slate-500">{{ formatDate(detail.reportDate) }}</p>
            </div>
            <button class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" @click="showDetail = false">
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div class="mb-5 grid grid-cols-3 gap-4">
            <div class="rounded-lg bg-slate-50 p-3 text-center">
              <p class="text-xs text-slate-500">Prompt</p>
              <p class="mt-1 text-lg font-semibold text-slate-900">{{ detail.promptCount }}</p>
            </div>
            <div class="rounded-lg bg-slate-50 p-3 text-center">
              <p class="text-xs text-slate-500">Token</p>
              <p class="mt-1 text-lg font-semibold text-slate-900">{{ formatTokens(detail.tokenCount) }}</p>
            </div>
            <div class="rounded-lg bg-slate-50 p-3 text-center">
              <p class="text-xs text-slate-500">评分</p>
              <p :class="['mt-1 text-lg font-semibold', getScoreColor(detail.score)]">{{ detail.score !== null ? detail.score : '-' }}</p>
            </div>
          </div>

          <div class="mb-5">
            <h4 class="mb-2 text-xs font-semibold uppercase text-slate-500">工作总结</h4>
            <p class="text-sm leading-relaxed text-slate-700">{{ detail.summary || '暂无总结' }}</p>
          </div>

          <div v-if="detail.reviewContent">
            <h4 class="mb-2 text-xs font-semibold uppercase text-slate-500">评价内容</h4>
            <p class="text-sm leading-relaxed text-slate-700">{{ detail.reviewContent }}</p>
          </div>

          <p class="mt-5 text-xs text-slate-400">生成时间：{{ formatFullTime(detail.createTime) }}</p>
        </template>
      </div>
    </div>
  </div>
</template>
