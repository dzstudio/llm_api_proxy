<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { conversationApi } from '@/api/conversation'
import type { ConversationStats } from '@/api/conversation'
import { reportApi } from '@/api/report'
import type { ReportStats } from '@/api/report'
import { reviewApi } from '@/api/review'
import type { ReviewStats } from '@/api/review'

const authStore = useAuthStore()

const convStats = ref<ConversationStats | null>(null)
const reportStats = ref<ReportStats | null>(null)
const reviewStats = ref<ReviewStats | null>(null)

function formatTokens(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return String(n)
}

function getScoreColor(score: number) {
  if (score >= 80) return 'text-emerald-600'
  if (score >= 60) return 'text-amber-600'
  return 'text-red-600'
}

const iconPaths: Record<string, string> = {
  message: 'M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z',
  zap: 'M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z',
  report: 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z',
  star: 'M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z',
  users: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
  cpu: 'M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25zm.75-12h9v9h-9v-9z',
}

onMounted(async () => {
  if (!authStore.userInfo) await authStore.fetchUserInfo()

  const [convRes, reportRes, reviewRes] = await Promise.allSettled([
    conversationApi.stats(),
    reportApi.stats(),
    reviewApi.stats(),
  ])

  if (convRes.status === 'fulfilled' && convRes.value.data.code === 0) {
    convStats.value = convRes.value.data.data
  }
  if (reportRes.status === 'fulfilled' && reportRes.value.data.code === 0) {
    reportStats.value = reportRes.value.data.data
  }
  if (reviewRes.status === 'fulfilled' && reviewRes.value.data.code === 0) {
    reviewStats.value = reviewRes.value.data.data
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

    <!-- Stats Cards -->
    <div class="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-xl border border-slate-200 bg-white p-5">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-xs font-medium text-slate-500">总会话数</p>
            <p class="mt-2 text-2xl font-semibold text-slate-900">{{ convStats?.totalConversations ?? '--' }}</p>
          </div>
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-[#005d9c]/10">
            <svg class="h-5 w-5 text-[#005d9c]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" :d="iconPaths.message" />
            </svg>
          </div>
        </div>
      </div>

      <div class="rounded-xl border border-slate-200 bg-white p-5">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-xs font-medium text-slate-500">总 Token 用量</p>
            <p class="mt-2 text-2xl font-semibold text-slate-900">{{ convStats ? formatTokens(convStats.totalTokens) : '--' }}</p>
          </div>
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0ea5e9]/10">
            <svg class="h-5 w-5 text-[#0ea5e9]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" :d="iconPaths.zap" />
            </svg>
          </div>
        </div>
      </div>

      <div class="rounded-xl border border-slate-200 bg-white p-5">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-xs font-medium text-slate-500">累计日报</p>
            <p class="mt-2 text-2xl font-semibold text-slate-900">{{ reportStats?.totalReports ?? '--' }}</p>
          </div>
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-[#10b981]/10">
            <svg class="h-5 w-5 text-[#10b981]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" :d="iconPaths.report" />
            </svg>
          </div>
        </div>
      </div>

      <div class="rounded-xl border border-slate-200 bg-white p-5">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-xs font-medium text-slate-500">平均 Prompt 评分</p>
            <p class="mt-2 text-2xl font-semibold text-slate-900">
              <span v-if="reviewStats" :class="getScoreColor(reviewStats.avgScore)">{{ reviewStats.avgScore }}</span>
              <span v-else>--</span>
            </p>
          </div>
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f59e0b]/10">
            <svg class="h-5 w-5 text-[#f59e0b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" :d="iconPaths.star" />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Grid -->
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <!-- Employee Ranking -->
      <div class="rounded-xl border border-slate-200 bg-white p-5">
        <h3 class="mb-4 text-sm font-semibold text-slate-900">员工活跃排行</h3>
        <div v-if="!convStats?.topUsers?.length" class="py-8 text-center text-sm text-slate-400">暂无数据</div>
        <div
          v-for="(u, i) in convStats?.topUsers ?? []"
          :key="u.userId"
          class="flex items-center justify-between border-b border-slate-50 py-2.5 last:border-0"
        >
          <div class="flex items-center gap-3">
            <span
              :class="[
                'flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold',
                i < 3 ? 'bg-[#005d9c] text-white' : 'bg-slate-100 text-slate-500',
              ]"
            >{{ i + 1 }}</span>
            <span class="text-sm text-slate-700">{{ u.username }}</span>
          </div>
          <div class="flex items-center gap-4 text-xs text-slate-500">
            <span>{{ u.conversationCount }} 次对话</span>
            <span class="font-mono">{{ formatTokens(u.tokenCount) }} tokens</span>
          </div>
        </div>
      </div>

      <!-- Model Usage -->
      <div class="rounded-xl border border-slate-200 bg-white p-5">
        <h3 class="mb-4 text-sm font-semibold text-slate-900">模型使用分布</h3>
        <div v-if="!convStats?.modelUsage?.length" class="py-8 text-center text-sm text-slate-400">暂无数据</div>
        <div
          v-for="m in convStats?.modelUsage ?? []"
          :key="m.modelId"
          class="flex items-center justify-between border-b border-slate-50 py-2.5 last:border-0"
        >
          <span class="text-sm text-slate-700">{{ m.modelName }}</span>
          <div class="flex items-center gap-4 text-xs text-slate-500">
            <span>{{ m.conversationCount }} 次</span>
            <span class="font-mono">{{ formatTokens(m.tokenCount) }} tokens</span>
          </div>
        </div>
      </div>

      <!-- Review Score Distribution -->
      <div class="rounded-xl border border-slate-200 bg-white p-5">
        <h3 class="mb-4 text-sm font-semibold text-slate-900">Prompt 评分分布</h3>
        <div v-if="!reviewStats" class="py-8 text-center text-sm text-slate-400">暂无数据</div>
        <template v-else>
          <div class="mb-4 grid grid-cols-3 gap-3">
            <div class="rounded-lg bg-emerald-50 p-3 text-center">
              <p class="text-xs text-emerald-600">优秀 (≥80)</p>
              <p class="mt-1 text-lg font-semibold text-emerald-700">{{ reviewStats.scoreDistribution.excellent }}</p>
            </div>
            <div class="rounded-lg bg-amber-50 p-3 text-center">
              <p class="text-xs text-amber-600">良好 (60-79)</p>
              <p class="mt-1 text-lg font-semibold text-amber-700">{{ reviewStats.scoreDistribution.good }}</p>
            </div>
            <div class="rounded-lg bg-red-50 p-3 text-center">
              <p class="text-xs text-red-600">待提升 (&lt;60)</p>
              <p class="mt-1 text-lg font-semibold text-red-700">{{ reviewStats.scoreDistribution.poor }}</p>
            </div>
          </div>
          <div v-if="reviewStats.topRated.length > 0">
            <h4 class="mb-2 text-xs font-medium text-slate-500">最高评分</h4>
            <div v-for="r in reviewStats.topRated" :key="r.conversationId" class="flex items-center justify-between border-b border-slate-50 py-2 last:border-0">
              <span class="text-sm text-slate-700">{{ r.username }}</span>
              <span :class="['text-sm font-semibold', getScoreColor(r.score)]">{{ r.score }}</span>
            </div>
          </div>
        </template>
      </div>

      <!-- Report Overview -->
      <div class="rounded-xl border border-slate-200 bg-white p-5">
        <h3 class="mb-4 text-sm font-semibold text-slate-900">日报概览</h3>
        <div v-if="!reportStats" class="py-8 text-center text-sm text-slate-400">暂无数据</div>
        <template v-else>
          <div class="mb-4 grid grid-cols-2 gap-3">
            <div class="rounded-lg bg-slate-50 p-3 text-center">
              <p class="text-xs text-slate-500">累计 Prompt</p>
              <p class="mt-1 text-lg font-semibold text-slate-900">{{ formatTokens(reportStats.totalPrompts) }}</p>
            </div>
            <div class="rounded-lg bg-slate-50 p-3 text-center">
              <p class="text-xs text-slate-500">累计 Token</p>
              <p class="mt-1 text-lg font-semibold text-slate-900">{{ formatTokens(reportStats.totalTokens) }}</p>
            </div>
          </div>
          <div v-if="reportStats.topUsers.length > 0">
            <h4 class="mb-2 text-xs font-medium text-slate-500">工作最活跃</h4>
            <div v-for="(u, i) in reportStats.topUsers.slice(0, 5)" :key="u.userId" class="flex items-center justify-between border-b border-slate-50 py-2 last:border-0">
              <div class="flex items-center gap-3">
                <span class="text-xs font-medium text-slate-400">#{{ i + 1 }}</span>
                <span class="text-sm text-slate-700">{{ u.username }}</span>
              </div>
              <span class="text-xs text-slate-500">{{ u.reportCount }} 份报告</span>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
