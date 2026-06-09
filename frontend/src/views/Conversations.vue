<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { conversationApi, type ConversationItem, type ConversationDetail, type ConversationStats } from '@/api/conversation'
import { userApi, type UserItem } from '@/api/user'
import { modelApi, type ModelItem } from '@/api/model'
import { reviewApi, type ReviewItem } from '@/api/review'

const conversations = ref<ConversationItem[]>([])
const loading = ref(false)
const error = ref('')
const total = ref(0)
const page = ref(1)
const pageSize = 20

const stats = ref<ConversationStats | null>(null)
const showDetail = ref(false)
const detail = ref<ConversationDetail | null>(null)
const detailLoading = ref(false)

const users = ref<UserItem[]>([])
const models = ref<ModelItem[]>([])
const review = ref<ReviewItem | null>(null)
const evaluating = ref(false)
const reviewError = ref('')

const filters = reactive({
  userId: undefined as number | undefined,
  modelId: undefined as number | undefined,
  keyword: '',
  startDate: '',
  endDate: '',
})

async function fetchStats() {
  try {
    const res = await conversationApi.stats()
    if (res.data.code === 0) stats.value = res.data.data
  } catch { /* non-critical */ }
}

async function fetchConversations() {
  loading.value = true
  try {
    const params: any = { page: page.value, pageSize }
    if (filters.userId) params.userId = filters.userId
    if (filters.modelId) params.modelId = filters.modelId
    if (filters.keyword) params.keyword = filters.keyword
    if (filters.startDate) params.startDate = filters.startDate
    if (filters.endDate) params.endDate = filters.endDate

    const res = await conversationApi.list(params)
    if (res.data.code === 0) {
      conversations.value = res.data.data.list
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

async function fetchModels() {
  try {
    const res = await modelApi.list()
    if (res.data.code === 0) models.value = res.data.data.list
  } catch { /* non-critical */ }
}

async function fetchReview(conversationId: number) {
  try {
    const res = await reviewApi.getByConversation(conversationId)
    if (res.data.code === 0) review.value = res.data.data
  } catch { review.value = null }
}

async function openDetail(conv: ConversationItem) {
  showDetail.value = true
  detailLoading.value = true
  detail.value = null
  review.value = null
  reviewError.value = ''
  try {
    const res = await conversationApi.detail(conv.id)
    if (res.data.code === 0) {
      detail.value = res.data.data
      fetchReview(conv.id)
    }
  } catch (err: any) {
    error.value = err.response?.data?.message || '加载详情失败'
    showDetail.value = false
  } finally {
    detailLoading.value = false
  }
}

async function handleEvaluate() {
  if (!detail.value) return
  evaluating.value = true
  reviewError.value = ''
  try {
    const res = await reviewApi.evaluate(detail.value.id)
    if (res.data.code === 0) review.value = res.data.data
  } catch (err: any) {
    reviewError.value = err.response?.data?.message || '评价失败'
  } finally {
    evaluating.value = false
  }
}

function getScoreColor(score: number) {
  if (score >= 80) return 'text-emerald-600'
  if (score >= 60) return 'text-amber-600'
  return 'text-red-600'
}

function applyFilters() {
  page.value = 1
  fetchConversations()
}

function resetFilters() {
  filters.userId = undefined
  filters.modelId = undefined
  filters.keyword = ''
  filters.startDate = ''
  filters.endDate = ''
  page.value = 1
  fetchConversations()
}

function formatTime(t: string) {
  return t ? new Date(t).toLocaleString('zh-CN') : '-'
}

function formatTokens(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return String(n)
}

watch([page], () => {
  fetchConversations()
})

watch(showDetail, (val) => {
  if (!val) detail.value = null
})

onMounted(() => {
  fetchConversations()
  fetchStats()
  fetchUsers()
  fetchModels()
})
</script>

<template>
  <div>
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-2xl font-semibold tracking-tight text-slate-900">对话审计</h1>
      <p class="mt-1 text-sm text-slate-500">查看所有通过 API Gateway 的对话记录</p>
    </div>

    <!-- Stats Cards -->
    <div v-if="stats" class="mb-6 grid grid-cols-3 gap-4">
      <div class="rounded-xl border border-slate-200 bg-white p-4">
        <p class="text-xs font-medium text-slate-500">总会话数</p>
        <p class="mt-1 text-2xl font-semibold text-slate-900">{{ stats.totalConversations }}</p>
      </div>
      <div class="rounded-xl border border-slate-200 bg-white p-4">
        <p class="text-xs font-medium text-slate-500">总 Token 数</p>
        <p class="mt-1 text-2xl font-semibold text-slate-900">{{ formatTokens(stats.totalTokens) }}</p>
      </div>
      <div class="rounded-xl border border-slate-200 bg-white p-4">
        <p class="text-xs font-medium text-slate-500">总消息数</p>
        <p class="mt-1 text-2xl font-semibold text-slate-900">{{ stats.totalMessages }}</p>
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
        <label class="mb-1 block text-xs font-medium text-slate-500">模型</label>
        <select v-model="filters.modelId" class="rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <option :value="undefined">全部</option>
          <option v-for="m in models" :key="m.id" :value="m.id">{{ m.name }}</option>
        </select>
      </div>
      <div>
        <label class="mb-1 block text-xs font-medium text-slate-500">关键词</label>
        <input v-model="filters.keyword" placeholder="标题搜索" class="rounded-lg border border-slate-200 px-3 py-2 text-sm w-40" @keyup.enter="applyFilters" />
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
              <th class="px-6 py-3 text-xs font-medium text-slate-500">标题</th>
              <th class="px-6 py-3 text-xs font-medium text-slate-500">用户</th>
              <th class="px-6 py-3 text-xs font-medium text-slate-500">模型</th>
              <th class="px-6 py-3 text-xs font-medium text-slate-500">消息数</th>
              <th class="px-6 py-3 text-xs font-medium text-slate-500">Token</th>
              <th class="px-6 py-3 text-xs font-medium text-slate-500">评分</th>
              <th class="px-6 py-3 text-xs font-medium text-slate-500">时间</th>
              <th class="px-6 py-3 text-xs font-medium text-slate-500">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in conversations" :key="c.id" class="border-b border-slate-50 text-sm hover:bg-slate-50/50">
              <td class="px-6 py-3 max-w-[260px] truncate font-medium text-slate-900">{{ c.title }}</td>
              <td class="px-6 py-3 text-slate-600">{{ c.username }}</td>
              <td class="px-6 py-3">
                <span class="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{{ c.modelName }}</span>
              </td>
              <td class="px-6 py-3 text-slate-500">{{ c.messageCount }}</td>
              <td class="px-6 py-3 font-mono text-xs text-slate-500">{{ formatTokens(c.tokenCount) }}</td>
              <td class="px-6 py-3 text-xs text-slate-400">-</td>
              <td class="px-6 py-3 text-xs text-slate-400">{{ formatTime(c.createTime) }}</td>
              <td class="px-6 py-3">
                <button class="rounded-lg px-2.5 py-1 text-xs font-medium text-[#005d9c] hover:bg-[#005d9c]/10" @click="openDetail(c)">查看</button>
              </td>
            </tr>
            <tr v-if="conversations.length === 0 && !loading">
              <td colspan="8" class="px-6 py-12 text-center text-sm text-slate-400">暂无对话记录</td>
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

    <!-- Stats Sections -->
    <div v-if="stats" class="mt-6 grid grid-cols-2 gap-6">
      <!-- Top Users -->
      <div class="rounded-xl border border-slate-200 bg-white p-5">
        <h3 class="mb-4 text-sm font-semibold text-slate-900">用户使用排行</h3>
        <div v-if="stats.topUsers.length === 0" class="text-sm text-slate-400">暂无数据</div>
        <div v-for="(u, i) in stats.topUsers" :key="u.userId" class="flex items-center justify-between border-b border-slate-50 py-2.5 last:border-0">
          <div class="flex items-center gap-3">
            <span class="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-500">{{ i + 1 }}</span>
            <span class="text-sm text-slate-700">{{ u.username }}</span>
          </div>
          <div class="flex items-center gap-4 text-xs text-slate-500">
            <span>{{ u.conversationCount }} 会话</span>
            <span class="font-mono">{{ formatTokens(u.tokenCount) }} tokens</span>
          </div>
        </div>
      </div>

      <!-- Model Usage -->
      <div class="rounded-xl border border-slate-200 bg-white p-5">
        <h3 class="mb-4 text-sm font-semibold text-slate-900">模型使用分布</h3>
        <div v-if="stats.modelUsage.length === 0" class="text-sm text-slate-400">暂无数据</div>
        <div v-for="m in stats.modelUsage" :key="m.modelId" class="flex items-center justify-between border-b border-slate-50 py-2.5 last:border-0">
          <span class="text-sm text-slate-700">{{ m.modelName }}</span>
          <div class="flex items-center gap-4 text-xs text-slate-500">
            <span>{{ m.conversationCount }} 会话</span>
            <span class="font-mono">{{ formatTokens(m.tokenCount) }} tokens</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Detail Dialog -->
    <div v-if="showDetail" class="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]">
      <div class="absolute inset-0 bg-black/30" @click="showDetail = false" />
      <div class="relative w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <div v-if="detailLoading" class="flex items-center justify-center py-12">
          <div class="h-6 w-6 animate-spin rounded-full border-2 border-[#005d9c] border-t-transparent" />
        </div>

        <template v-else-if="detail">
          <div class="mb-5 flex items-start justify-between">
            <div>
              <h2 class="text-lg font-semibold text-slate-900">{{ detail.title }}</h2>
              <p class="mt-1 text-xs text-slate-500">
                {{ detail.username }} · {{ detail.modelName }} ({{ detail.provider }}) · {{ formatTime(detail.createTime) }}
              </p>
            </div>
            <button class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" @click="showDetail = false">
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div class="space-y-3">
            <div
              v-for="msg in detail.messages"
              :key="msg.id"
              :class="[
                'rounded-xl p-4',
                msg.role === 'user' ? 'bg-slate-50 border border-slate-100' : 'bg-[#005d9c]/5 border border-[#005d9c]/10',
              ]"
            >
              <div class="mb-1.5 flex items-center justify-between">
                <span
                  :class="[
                    'text-xs font-semibold uppercase tracking-wide',
                    msg.role === 'user' ? 'text-slate-600' : 'text-[#005d9c]',
                  ]"
                >
                  {{ msg.role === 'user' ? '用户输入' : msg.role === 'assistant' ? 'AI 回复' : msg.role }}
                </span>
                <span class="text-xs text-slate-400">{{ formatTokens(msg.tokens) }} tokens</span>
              </div>
              <pre class="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700 font-sans">{{ msg.content }}</pre>
            </div>
          </div>

          <!-- Review Section -->
          <div class="mt-5 border-t border-slate-100 pt-5">
            <div class="mb-3 flex items-center justify-between">
              <h4 class="text-sm font-semibold text-slate-900">Prompt 评价</h4>
              <button
                v-if="!review"
                :disabled="evaluating"
                class="rounded-lg bg-[#0ea5e9] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#0284c7] disabled:opacity-50"
                @click="handleEvaluate"
              >
                {{ evaluating ? '评价中...' : '开始评价' }}
              </button>
              <button
                v-else
                class="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200"
                :disabled="evaluating"
                @click="handleEvaluate"
              >
                {{ evaluating ? '重新评价中...' : '重新评价' }}
              </button>
            </div>

            <div v-if="reviewError" class="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{{ reviewError }}</div>

            <div v-if="review" class="space-y-4">
              <div class="flex items-center gap-3">
                <span :class="['text-3xl font-bold', getScoreColor(review.score)]">{{ review.score }}</span>
                <span class="text-xs text-slate-500">总分 / 100</span>
                <span class="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">评价模型：{{ review.reviewModelName }}</span>
              </div>

              <div v-if="review.strengths">
                <h5 class="mb-1 text-xs font-semibold text-emerald-600">优点</h5>
                <p class="text-sm leading-relaxed text-slate-600">{{ review.strengths }}</p>
              </div>

              <div v-if="review.weaknesses">
                <h5 class="mb-1 text-xs font-semibold text-amber-600">缺点</h5>
                <p class="text-sm leading-relaxed text-slate-600">{{ review.weaknesses }}</p>
              </div>

              <div v-if="review.suggestions">
                <h5 class="mb-1 text-xs font-semibold text-[#005d9c]">改进建议</h5>
                <p class="text-sm leading-relaxed text-slate-600">{{ review.suggestions }}</p>
              </div>
            </div>

            <div v-if="!review && !reviewError" class="text-sm text-slate-400">
              点击「开始评价」使用评价模型对该对话的用户 Prompt 进行 AI 评分
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
