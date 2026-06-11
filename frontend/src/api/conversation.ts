import request from './request'
import type { ApiResponse } from './auth'

export interface MessageItem {
  id: number
  role: string
  content: string
  tokens: number
  createTime: string
}

export interface ConversationItem {
  id: number
  userId: number
  username: string
  modelId: number | null
  modelName: string
  title: string
  tokenCount: number
  messageCount: number
  createTime: string
  updateTime: string
}

export interface ConversationDetail extends ConversationItem {
  provider: string
  sessionId: string | null
  cost: number
  messages: MessageItem[]
}

export interface RecentRecord {
  id: number
  username: string
  modelName: string
  title: string
  tokenCount: number
  messageCount: number
  createTime: string
}

export interface ConversationStats {
  totalConversations: number
  totalTokens: number
  totalMessages: number
  todayConversations: number
  todayTokens: number
  yesterdayConversations: number
  yesterdayTokens: number
  monthTokens: number
  activeUsersToday: number
  topUsers: {
    userId: number
    username: string
    conversationCount: number
    tokenCount: number
  }[]
  modelUsage: {
    modelId: number
    modelName: string
    conversationCount: number
    tokenCount: number
  }[]
  recentRecords: RecentRecord[]
}

export interface ListQuery {
  userId?: number
  modelId?: number
  keyword?: string
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
}

export const conversationApi = {
  list(params?: ListQuery) {
    return request.get<ApiResponse<{ list: ConversationItem[]; total: number; page: number; pageSize: number }>>('/conversations', { params })
  },
  detail(id: number) {
    return request.get<ApiResponse<ConversationDetail>>(`/conversations/${id}`)
  },
  stats() {
    return request.get<ApiResponse<ConversationStats>>('/conversations/stats')
  },
}
