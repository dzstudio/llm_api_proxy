<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { userApi, type UserItem } from '@/api/user'
import { conversationApi, type ConversationItem, type ConversationDetail } from '@/api/conversation'
import { reviewApi, type ReviewItem } from '@/api/review'

const authStore = useAuthStore()
const isAdmin = computed(() => authStore.userInfo?.role === 'ADMIN')

// ── State ──
const users = ref<UserItem[]>([])
const userSearch = ref('')

// Selected user
const selectedUserId = ref<number | null>(null)
const selectedUser = computed(() => users.value.find(u => u.id === selectedUserId.value))

// Conversations for selected user
const conversations = ref<ConversationItem[]>([])
const convLoading = ref(false)

// Group by date
interface DateGroup {
  date: string
  label: string
  count: number
  conversations: ConversationItem[]
}
const dateGroups = computed<DateGroup[]>(() => {
  const map = new Map<string, ConversationItem[]>()
  conversations.value.forEach(c => {
    const d = formatDate(c.createTime)
    if (!map.has(d)) map.set(d, [])
    map.get(d)!.push(c)
  })
  return Array.from(map.entries()).map(([date, convs]) => ({
    date,
    label: formatDateLabel(date),
    count: convs.length,
    conversations: convs,
  })).sort((a, b) => b.date.localeCompare(a.date))
})

// Selected date
const selectedDate = ref<string | null>(null)
const selectedDateGroup = computed(() => dateGroups.value.find(d => d.date === selectedDate.value))

// Chat detail
const showChatDetail = ref(false)
const chatDetail = ref<ConversationDetail | null>(null)
const reviewData = ref<ReviewItem | null>(null)
const detailLoading = ref(false)

// ── Computed ──
const filteredUsers = computed(() => {
  if (!userSearch.value) return users.value.filter(u => u.status === 1)
  const q = userSearch.value.toLowerCase()
  return users.value.filter(u =>
    u.status === 1 && (
      (u.realName || u.username).toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q)
    ),
  )
})

// ── Methods ──
function formatDate(t: string) {
  if (!t) return ''
  return t.slice(0, 10)
}

function formatDateLabel(dateStr: string) {
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  if (dateStr === today) return `今天 · ${dateStr}`
  if (dateStr === yesterday) return `昨天 · ${dateStr}`
  return dateStr
}

function formatFullDate(t: string) {
  if (!t) return '-'
  return new Date(t).toLocaleString('zh-CN')
}

function formatTokens(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return String(n)
}

function getScoreColor(score: number | null) {
  if (score === null) return 'text-gray-400'
  if (score >= 80) return 'text-green-600'
  if (score >= 60) return 'text-yellow-600'
  return 'text-red-600'
}

function getScoreBadge(score: number) {
  if (score >= 80) return 'bg-green-50 text-green-600'
  if (score >= 60) return 'bg-yellow-50 text-yellow-600'
  return 'bg-red-50 text-red-600'
}

function getScoreLabel(score: number) {
  if (score >= 80) return '优秀 Prompt'
  if (score >= 60) return '良好 Prompt'
  return '需改进 Prompt'
}

function getScoreRingDash(score: number) {
  const circumference = 226 // 2 * PI * 36 ≈ 226
  return `${(score / 100) * circumference} ${circumference}`
}

function getScoreRingColor(score: number) {
  if (score >= 80) return '#10B981'
  if (score >= 60) return '#3B82F6'
  return '#F59E0B'
}

function getProgressColor(val: number) {
  if (val >= 90) return '#10B981'
  if (val >= 75) return '#3B82F6'
  if (val >= 60) return '#F59E0B'
  return '#EF4444'
}

function getAvatarColor(name: string) {
  const colors = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#6366F1', '#14B8A6']
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

async function fetchUsers() {
  try {
    const res = await userApi.list({ pageSize: 999 })
    if (res.data.code === 0) {
      users.value = res.data.data.list
      // Auto-select current user for non-admin
      if (!isAdmin.value && authStore.userInfo) {
        const currentUser = users.value.find(
          u => u.username === authStore.userInfo!.username,
        )
        if (currentUser) {
          selectUser(currentUser.id)
        }
      }
    }
  } catch { /* non-critical */ }
}

async function selectUser(userId: number) {
  selectedUserId.value = userId
  selectedDate.value = null
  showChatDetail.value = false
  chatDetail.value = null
  conversations.value = []

  convLoading.value = true
  try {
    const res = await conversationApi.list({ userId, pageSize: 200 })
    if (res.data.code === 0) {
      conversations.value = res.data.data.list
    }
  } catch { /* handled */ }
  finally { convLoading.value = false }
}

async function selectDate(date: string) {
  selectedDate.value = date
  showChatDetail.value = false
  chatDetail.value = null
}

async function openChatDetail(conv: ConversationItem) {
  showChatDetail.value = true
  chatDetail.value = null
  reviewData.value = null
  detailLoading.value = true

  try {
    const [detailRes, reviewRes] = await Promise.all([
      conversationApi.detail(conv.id),
      reviewApi.getByConversation(conv.id).catch(() => ({ data: { code: 0, data: null } })),
    ])
    if (detailRes.data.code === 0) chatDetail.value = detailRes.data.data
    if (reviewRes.data.code === 0 && reviewRes.data.data) reviewData.value = reviewRes.data.data
  } catch { /* handled */ }
  finally { detailLoading.value = false }
}

function goBackToRecords() {
  showChatDetail.value = false
  chatDetail.value = null
  reviewData.value = null
}

onMounted(fetchUsers)
</script>

<template>
  <div class="flex -m-6" style="height:calc(100vh - 64px);">
    <!-- ═══ Left: Employee List ═══ -->
    <div v-if="isAdmin" class="w-56 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col overflow-hidden">
      <div class="p-3 border-b border-gray-100">
        <div class="relative">
          <input
            v-model="userSearch"
            type="text"
            placeholder="搜索员工..."
            class="w-full border border-gray-200 rounded-lg pl-8 py-1.5 text-xs bg-gray-50 text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] outline-none transition-all"
          />
          <svg class="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
        </div>
      </div>
      <div class="flex-1 overflow-y-auto py-2">
        <div class="px-2 mb-1">
          <div class="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 py-1">员工列表</div>
        </div>
        <button
          v-for="u in filteredUsers"
          :key="u.id"
          :class="[
            'w-full flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-lg mx-1 transition-colors',
            selectedUserId === u.id
              ? 'bg-blue-50 text-blue-700 font-medium'
              : 'hover:bg-gray-50 text-gray-700',
          ]"
          style="width:calc(100% - 8px);"
          @click="selectUser(u.id)"
        >
          <div
            class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            :style="{ background: getAvatarColor(u.realName || u.username) }"
          >
            {{ (u.realName || u.username).charAt(0) }}
          </div>
          <div class="text-left min-w-0">
            <div class="text-xs font-semibold truncate">{{ u.realName || u.username }}</div>
            <div :class="['text-xs', selectedUserId === u.id ? 'text-blue-400' : 'text-gray-400']">
              {{ u.department || '未分组' }}
            </div>
          </div>
        </button>
        <div v-if="filteredUsers.length === 0" class="px-3 py-6 text-center text-xs text-gray-400">
          无匹配员工
        </div>
      </div>
    </div>

    <!-- ═══ Middle: Date List ═══ -->
    <div class="w-44 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col overflow-hidden">
      <template v-if="selectedUser">
        <div class="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div class="text-xs font-semibold text-gray-500">{{ selectedUser.realName || selectedUser.username }} · 工作日历</div>
          <button
            class="inline-flex items-center justify-center w-6 h-6 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            :class="{ 'animate-spin': convLoading }"
            @click="selectedUserId && selectUser(selectedUserId)"
            title="刷新"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </button>
        </div>
        <div class="flex-1 overflow-y-auto py-2 px-2">
          <div v-if="convLoading" class="px-3 py-8 text-center">
            <div class="h-5 w-5 mx-auto animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          </div>
          <button
            v-for="dg in dateGroups"
            :key="dg.date"
            :class="[
              'w-full text-left px-3 py-2.5 rounded-lg mb-1 transition-colors',
              selectedDate === dg.date
                ? 'bg-blue-50 text-blue-700'
                : 'hover:bg-gray-50 text-gray-700',
            ]"
            @click="selectDate(dg.date)"
          >
            <div class="text-xs font-semibold">{{ dg.label }}</div>
            <div :class="['text-xs mt-0.5', selectedDate === dg.date ? 'text-blue-400' : 'text-gray-400']">
              {{ dg.count }} 对话
            </div>
          </button>
          <div v-if="!convLoading && dateGroups.length === 0" class="px-3 py-8 text-center text-xs text-gray-400">
            暂无对话记录
          </div>
        </div>
      </template>
      <template v-else>
        <div class="flex items-center justify-center h-full text-xs text-gray-400">
          请选择员工
        </div>
      </template>
    </div>

    <!-- ═══ Right: Content Area ═══ -->
    <div class="flex-1 flex flex-col overflow-hidden bg-gray-50">

      <!-- ── Chat Detail View ── -->
      <template v-if="showChatDetail">
        <div class="flex flex-1 overflow-hidden">
          <!-- Messages -->
          <div class="flex-1 flex flex-col overflow-hidden" style="background:#F8FAFC;">
            <!-- Chat Header -->
            <div class="flex items-center gap-3 px-6 py-3.5 border-b border-gray-200 bg-white flex-shrink-0">
              <button class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 border border-gray-200 transition-colors" @click="goBackToRecords">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5 M12 19l-7-7 7-7"/></svg>
                返回
              </button>
              <div class="w-px h-4 bg-gray-200"></div>
              <div>
                <div class="text-sm font-semibold text-gray-900">{{ chatDetail?.title || '对话详情' }}</div>
                <div class="text-xs text-gray-400">
                  {{ chatDetail?.username }} · {{ formatFullDate(chatDetail?.createTime || '') }} · {{ chatDetail?.modelName }} · {{ chatDetail?.messages?.length || 0 }} 轮
                </div>
              </div>
              <div class="ml-auto flex items-center gap-2 text-xs text-gray-400">
                <span>{{ formatTokens(chatDetail?.tokenCount || 0) }} tokens</span>
                <span v-if="reviewData" :class="['px-2 py-0.5 rounded-full text-xs font-semibold', getScoreBadge(reviewData.score)]">
                  AI 评分 {{ reviewData.score }}
                </span>
              </div>
            </div>

            <!-- Messages -->
            <div class="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div v-if="detailLoading" class="flex items-center justify-center py-16">
                <div class="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              </div>
              <template v-else-if="chatDetail">
                <template v-for="msg in chatDetail.messages" :key="msg.id">
                  <!-- User message -->
                  <div v-if="msg.role === 'user'" class="flex justify-end">
                    <div>
                      <div class="max-w-2xl px-4 py-3 rounded-xl text-sm text-gray-800 leading-relaxed bg-gray-100 break-all" style="border-radius:12px 12px 4px 12px;">
                        {{ msg.content }}
                      </div>
                      <div class="text-right text-xs text-gray-400 mt-1 mr-1">{{ formatFullDate(msg.createTime) }}</div>
                    </div>
                  </div>
                  <!-- AI message -->
                  <div v-else class="flex items-start gap-3">
                    <div class="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-gray-900">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="white"/>
                      </svg>
                    </div>
                    <div>
                      <div class="flex-1 max-w-2xl px-4 py-3 rounded-xl text-sm text-gray-800 leading-relaxed bg-white border border-gray-200 break-all" style="border-radius:12px 12px 12px 4px;">
                        <div v-html="msg.content.replace(/\n/g, '<br>')" />
                      </div>
                      <div class="text-xs text-gray-400 mt-1 ml-2">{{ formatFullDate(msg.createTime) }}</div>
                    </div>
                  </div>
                </template>
              </template>
            </div>
          </div>

          <!-- Right Analysis Panel -->
          <div class="w-72 flex-shrink-0 border-l border-gray-200 bg-white overflow-y-auto">
            <div class="px-5 py-4 border-b border-gray-100">
              <div class="text-sm font-semibold text-gray-900">Prompt 质量分析</div>
              <div class="text-xs text-gray-400 mt-0.5">AI 自动评估</div>
            </div>

            <template v-if="reviewData">
              <!-- Score Ring -->
              <div class="flex flex-col items-center py-5 border-b border-gray-100">
                <div class="relative">
                  <svg width="88" height="88" viewBox="0 0 88 88">
                    <circle cx="44" cy="44" r="36" fill="none" stroke="#F3F4F6" stroke-width="8"/>
                    <circle cx="44" cy="44" r="36" fill="none" :stroke="getScoreRingColor(reviewData.score)" stroke-width="8"
                      :stroke-dasharray="getScoreRingDash(reviewData.score)" stroke-dashoffset="0" transform="rotate(-90 44 44)"/>
                  </svg>
                  <div class="absolute inset-0 flex flex-col items-center justify-center">
                    <div class="text-2xl font-bold text-gray-900">{{ reviewData.score }}</div>
                    <div class="text-xs text-gray-400">分</div>
                  </div>
                </div>
                <div :class="['text-xs font-semibold mt-1', getScoreColor(reviewData.score)]">
                  {{ getScoreLabel(reviewData.score) }}
                </div>
              </div>

              <!-- Strengths -->
              <div v-if="reviewData.strengths" class="px-5 py-4 border-b border-gray-100">
                <div class="text-xs font-semibold text-green-700 mb-2 flex items-center gap-1">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  优点
                </div>
                <ul class="space-y-1.5">
                  <li v-for="(s, i) in reviewData.strengths.split('\n').filter(Boolean)" :key="i" class="text-xs text-gray-600 flex items-start gap-1.5">
                    <div class="w-1 h-1 rounded-full bg-green-500 mt-1.5 flex-shrink-0"></div>
                    {{ s.replace(/^[•\-\d.]+\s*/, '') }}
                  </li>
                </ul>
              </div>

              <!-- Weaknesses -->
              <div v-if="reviewData.weaknesses" class="px-5 py-4 border-b border-gray-100">
                <div class="text-xs font-semibold text-yellow-700 mb-2 flex items-center gap-1">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  可改进
                </div>
                <ul class="space-y-1.5">
                  <li v-for="(w, i) in reviewData.weaknesses.split('\n').filter(Boolean)" :key="i" class="text-xs text-gray-600 flex items-start gap-1.5">
                    <div class="w-1 h-1 rounded-full bg-yellow-400 mt-1.5 flex-shrink-0"></div>
                    {{ w.replace(/^[•\-\d.]+\s*/, '') }}
                  </li>
                </ul>
              </div>

              <!-- Suggestions -->
              <div v-if="reviewData.suggestions" class="px-5 py-4">
                <div class="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4 M12 8h.01"/></svg>
                  建议
                </div>
                <ul class="space-y-1.5">
                  <li v-for="(s, i) in reviewData.suggestions.split('\n').filter(Boolean)" :key="i" class="text-xs text-gray-600 flex items-start gap-1.5">
                    <div class="w-1 h-1 rounded-full bg-blue-400 mt-1.5 flex-shrink-0"></div>
                    {{ s.replace(/^[•\-\d.]+\s*/, '') }}
                  </li>
                </ul>
              </div>
            </template>
            <template v-else-if="!detailLoading">
              <div class="flex flex-col items-center justify-center py-16 text-xs text-gray-400">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" stroke-width="1.5" class="mb-2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                暂无评价数据
              </div>
            </template>
          </div>
        </div>
      </template>

      <!-- ── Work Records for Selected Date ── -->
      <template v-else-if="selectedDateGroup">
        <div class="flex-1 overflow-y-auto p-5">
          <!-- Header Row -->
          <div class="mb-4 flex items-center justify-between">
            <div>
              <div class="text-sm font-bold text-gray-900">{{ selectedUser?.realName || selectedUser?.username }} · {{ selectedDateGroup.label }}</div>
              <div class="text-xs text-gray-500 mt-0.5">工作记录 · {{ selectedDateGroup.count }} 次对话</div>
            </div>
            <div class="flex items-center gap-2">
              <div class="text-xs text-gray-400">共 {{ formatTokens(selectedDateGroup.conversations.reduce((s, c) => s + c.tokenCount, 0)) }} tokens</div>
            </div>
          </div>

          <!-- Conversation Cards -->
          <div class="space-y-2">
            <button
              v-for="conv in selectedDateGroup.conversations"
              :key="conv.id"
              class="w-full text-left bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-300 transition-all shadow-sm"
              @click="openChatDetail(conv)"
            >
              <div class="flex items-start justify-between mb-2">
                <div class="flex-1">
                  <div class="text-sm font-medium text-gray-800">{{ conv.title || '无标题' }}</div>
                  <div class="text-xs text-gray-400 mt-0.5">
                    {{ formatFullDate(conv.createTime) }} · {{ conv.modelName }} · {{ conv.messageCount }} 轮
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-3 mt-2 text-xs text-gray-400">
                <span>{{ formatTokens(conv.tokenCount) }} tokens</span>
                <span>·</span>
                <span>{{ conv.messageCount }} 轮</span>
                <span>·</span>
                <span class="text-blue-500 font-medium">查看详情 →</span>
              </div>
            </button>
          </div>
        </div>
      </template>

      <!-- ── No Selection State ── -->
      <template v-else>
        <div class="flex items-center justify-center h-full text-sm text-gray-400">
          <div class="text-center">
            <svg class="mx-auto mb-3 text-gray-300" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            {{ selectedUser ? '请选择日期查看工作记录' : '请选择员工并点击日期查看工作记录' }}
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
