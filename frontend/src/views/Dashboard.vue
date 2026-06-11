<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { conversationApi } from '@/api/conversation'
import type { ConversationStats } from '@/api/conversation'
import { reviewApi } from '@/api/review'
import type { ReviewStats } from '@/api/review'

const router = useRouter()
const authStore = useAuthStore()

const convStats = ref<ConversationStats | null>(null)
const reviewStats = ref<ReviewStats | null>(null)

function formatTokens(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return String(n)
}

function formatCost(n: number): string {
  if (n >= 100) return `¥${n.toFixed(0)}`
  if (n >= 1) return `¥${n.toFixed(2)}`
  return `¥${n.toFixed(4)}`
}

function formatFullDate(t: string) {
  if (!t) return '-'
  const d = new Date(t)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function getScoreColor(score: number) {
  if (score >= 80) return 'text-green-600'
  if (score >= 60) return 'text-yellow-600'
  return 'text-red-600'
}

function getScoreBadge(score: number) {
  if (score >= 80) return 'bg-green-50 text-green-600'
  if (score >= 60) return 'bg-yellow-50 text-yellow-600'
  return 'bg-red-50 text-red-600'
}

function getRankClass(i: number) {
  if (i === 0) return 'bg-amber-50 text-amber-600'
  if (i === 1) return 'bg-slate-100 text-slate-500'
  if (i === 2) return 'bg-red-50 text-red-600'
  return 'bg-gray-100 text-gray-500'
}

function getAvatarColor(name: string) {
  const colors = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#6366F1', '#14B8A6']
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

const today = new Date()
const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日，${weekdays[today.getDay()]}`

onMounted(async () => {
  try {
    if (!authStore.userInfo) await authStore.fetchUserInfo()
  } catch { /* non-critical */ }

  const [convRes, reviewRes] = await Promise.allSettled([
    conversationApi.stats(),
    reviewApi.stats(),
  ])

  if (convRes.status === 'fulfilled' && convRes.value.data.code === 0) {
    convStats.value = convRes.value.data.data
  }
  if (reviewRes.status === 'fulfilled' && reviewRes.value.data.code === 0) {
    reviewStats.value = reviewRes.value.data.data
  }
})

function goToRecords() {
  router.push('/work-logs')
}

// ── Pie chart helpers ──
const chartColors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#6366F1', '#14B8A6']

const circumference = 2 * Math.PI * 56 // ~352

const totalConvCount = computed(() =>
  convStats.value?.modelUsage?.reduce((s, m) => s + m.conversationCount, 0) ?? 0,
)

function pct(count: number) {
  return totalConvCount.value > 0 ? Math.round((count / totalConvCount.value) * 100) : 0
}

function getSliceDash(_m: any, i: number) {
  const p = pct(convStats.value!.modelUsage[i].conversationCount)
  const len = (p / 100) * circumference
  return `${len} ${circumference - len}`
}

function getSliceOffset(i: number) {
  let offset = 0
  for (let j = 0; j < i; j++) {
    const p = pct(convStats.value!.modelUsage[j].conversationCount)
    offset += (p / 100) * circumference
  }
  return offset
}
</script>

<template>
  <div>
    <!-- Greeting -->
    <div class="mb-6">
      <h1 class="text-xl font-bold text-gray-900">工作台</h1>
      <p class="text-sm text-gray-500 mt-0.5">
        今天是 {{ dateStr }}，<span class="text-green-600 font-medium">系统运行正常</span>
      </p>
    </div>

    <!-- Stat Cards -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-6">
      <div class="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <div class="text-xs font-medium text-gray-500 mb-2">今日会话数</div>
        <div class="text-2xl font-bold text-gray-900">{{ convStats?.todayConversations ?? '--' }}</div>
        <div class="text-xs text-gray-400 mt-1">今日</div>
      </div>
      <div class="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <div class="text-xs font-medium text-gray-500 mb-2">今日 Token</div>
        <div class="text-2xl font-bold text-gray-900">{{ convStats ? formatTokens(convStats.todayTokens) : '--' }}</div>
        <div class="text-xs text-gray-400 mt-1">
          平均 {{ convStats?.todayConversations ? formatTokens(Math.round(convStats.todayTokens / convStats.todayConversations)) : '--' }} / 会话
        </div>
      </div>
      <div class="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <div class="text-xs font-medium text-gray-500 mb-2">昨日会话数</div>
        <div class="text-2xl font-bold text-gray-900">{{ convStats?.yesterdayConversations ?? '--' }}</div>
        <div class="text-xs text-gray-400 mt-1">昨日</div>
      </div>
      <div class="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <div class="text-xs font-medium text-gray-500 mb-2">昨日 Token</div>
        <div class="text-2xl font-bold text-gray-900">{{ convStats ? formatTokens(convStats.yesterdayTokens) : '--' }}</div>
        <div class="text-xs text-gray-400 mt-1">
          平均 {{ convStats?.yesterdayConversations ? formatTokens(Math.round(convStats.yesterdayTokens / convStats.yesterdayConversations)) : '--' }} / 会话
        </div>
      </div>
      <div class="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <div class="text-xs font-medium text-gray-500 mb-2">本月 Token</div>
        <div class="text-2xl font-bold text-gray-900">{{ convStats ? formatTokens(convStats.monthTokens) : '--' }}</div>
        <div class="text-xs text-gray-400 mt-1">本月累计</div>
      </div>
      <div class="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <div class="text-xs font-medium text-gray-500 mb-2">活跃员工</div>
        <div class="text-2xl font-bold text-gray-900">{{ convStats?.activeUsersToday ?? '--' }}</div>
        <div class="text-xs text-gray-400 mt-1">今日使用过 LLM</div>
      </div>
    </div>

    <!-- Cost Cards -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-6">
      <div class="bg-white border border-green-200 rounded-xl p-5 shadow-sm">
        <div class="text-xs font-medium text-gray-500 mb-2">今日预估费用</div>
        <div class="text-2xl font-bold text-green-700">{{ convStats ? formatCost(convStats.todayCost) : '--' }}</div>
        <div class="text-xs text-gray-400 mt-1">基于 {{ convStats?.todayTokens ? formatTokens(convStats.todayTokens) : '--' }} tokens 估算</div>
      </div>
      <div class="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <div class="text-xs font-medium text-gray-500 mb-2">昨日预估费用</div>
        <div class="text-2xl font-bold text-gray-900">{{ convStats ? formatCost(convStats.yesterdayCost) : '--' }}</div>
        <div class="text-xs text-gray-400 mt-1">基于 {{ convStats?.yesterdayTokens ? formatTokens(convStats.yesterdayTokens) : '--' }} tokens 估算</div>
      </div>
    </div>

    <!-- Middle Row -->
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-3 mb-4">
      <!-- Employee Rank -->
      <div class="lg:col-span-2 bg-white border border-gray-200 rounded-xl shadow-sm">
        <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <div class="text-sm font-semibold text-gray-900">员工活跃排行</div>
            <div class="text-xs text-gray-400 mt-0.5">历史累计</div>
          </div>
        </div>
        <div v-if="!convStats?.topUsers?.length" class="px-5 py-8 text-center text-sm text-gray-400">暂无数据</div>
        <table v-else class="w-full">
          <thead>
            <tr>
              <th class="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-2.5 border-b border-gray-100 bg-gray-50/50">排名</th>
              <th class="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-2.5 border-b border-gray-100 bg-gray-50/50">员工</th>
              <th class="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-2.5 border-b border-gray-100 bg-gray-50/50">会话数</th>
              <th class="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-2.5 border-b border-gray-100 bg-gray-50/50">Token</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(u, i) in convStats.topUsers" :key="u.userId" class="border-b border-gray-50 hover:bg-gray-50/50">
              <td class="px-5 py-3">
                <span :class="['inline-flex w-6 h-6 rounded-full text-xs font-bold items-center justify-center', getRankClass(i)]">
                  {{ i + 1 }}
                </span>
              </td>
              <td class="px-5 py-3">
                <div class="flex items-center gap-2">
                  <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" :style="{ background: getAvatarColor(u.username) }">
                    {{ u.username.charAt(0) }}
                  </div>
                  <span class="text-sm font-medium text-gray-900">{{ u.username }}</span>
                </div>
              </td>
              <td class="px-5 py-3 text-sm text-gray-600 font-mono">{{ u.conversationCount }}</td>
              <td class="px-5 py-3 text-sm text-gray-600 font-mono">{{ formatTokens(u.tokenCount) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Model Usage -->
      <div class="bg-white border border-gray-200 rounded-xl shadow-sm">
        <div class="px-5 py-4 border-b border-gray-100">
          <div class="text-sm font-semibold text-gray-900">模型使用分布</div>
          <div class="text-xs text-gray-400 mt-0.5">历史累计</div>
        </div>
        <div class="p-5">
          <div v-if="!convStats?.modelUsage?.length" class="py-8 text-center text-sm text-gray-400">暂无数据</div>
          <template v-else>
            <!-- Donut Chart -->
            <div class="flex items-center gap-5">
              <div class="relative flex-shrink-0" style="width:140px;height:140px">
                <svg viewBox="0 0 140 140" width="140" height="140" style="transform:rotate(-90deg)">
                  <circle cx="70" cy="70" r="56" fill="none" stroke="#F3F4F6" stroke-width="24" />
                  <template v-for="(m, i) in convStats.modelUsage" :key="m.modelId">
                    <circle
                      cx="70" cy="70" r="56"
                      fill="none"
                      :stroke="chartColors[i % chartColors.length]"
                      stroke-width="24"
                      :stroke-dasharray="getSliceDash(m, i)"
                      :stroke-dashoffset="getSliceOffset(i)"
                    />
                  </template>
                </svg>
                <div class="absolute inset-0 flex flex-col items-center justify-center">
                  <div class="text-2xl font-bold text-gray-900">{{ totalConvCount }}</div>
                  <div class="text-xs text-gray-400">总会话</div>
                </div>
              </div>
              <div class="flex-1 space-y-2 min-w-0">
                <div v-for="(m, i) in convStats.modelUsage" :key="m.modelId" class="flex items-center justify-between text-xs">
                  <div class="flex items-center gap-1.5 min-w-0">
                    <div class="w-2.5 h-2.5 rounded-full flex-shrink-0" :style="{ background: chartColors[i % chartColors.length] }"></div>
                    <span class="text-gray-600 truncate">{{ m.modelName }}</span>
                  </div>
                  <span class="text-gray-800 font-semibold flex-shrink-0 ml-2">{{ pct(m.conversationCount) }}%</span>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Recent Records Timeline -->
    <div class="bg-white border border-gray-200 rounded-xl shadow-sm px-5 py-4">
      <div class="flex items-center justify-between mb-4">
        <div class="text-sm font-semibold text-gray-900">最近工作记录</div>
        <button class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 border border-gray-200 transition-colors" @click="goToRecords">
          查看全部 →
        </button>
      </div>
      <div v-if="!convStats?.recentRecords?.length" class="py-6 text-center text-sm text-gray-400">暂无记录</div>
      <div v-else class="pl-5 border-l-2 border-gray-100 space-y-5">
        <div v-for="r in convStats.recentRecords" :key="r.id" class="relative" style="margin-left:-0;">
          <div class="absolute left-[-24px] top-1.5 w-2 h-2 rounded-full bg-blue-500 border-2 border-white ring-2 ring-blue-100"></div>
          <div class="flex items-start justify-between">
            <div>
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-gray-800">{{ r.username }}</span>
                <span class="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600">{{ r.modelName }}</span>
              </div>
              <p class="text-xs text-gray-500 mt-1">{{ r.title || '无标题' }}</p>
              <div class="flex items-center gap-3 mt-1 text-xs text-gray-400">
                <span>{{ r.messageCount }} 轮对话</span>
                <span>·</span>
                <span class="font-mono">{{ formatTokens(r.tokenCount) }} tokens</span>
              </div>
            </div>
            <span class="text-xs text-gray-400 flex-shrink-0 ml-4">{{ formatFullDate(r.createTime) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
