import request from './request'
import type { ApiResponse } from './auth'

export interface ReportItem {
  id: number
  userId: number
  username: string
  reportDate: string
  summary: string
  promptCount: number
  tokenCount: number
  score: number | null
  createTime: string
}

export interface ReportDetail extends ReportItem {
  reviewContent: string | null
}

export interface ReportStats {
  totalReports: number
  totalPrompts: number
  totalTokens: number
  topUsers: {
    userId: number
    username: string
    reportCount: number
    totalPrompts: number
    totalTokens: number
  }[]
}

export const reportApi = {
  list(params?: { userId?: number; startDate?: string; endDate?: string; page?: number; pageSize?: number }) {
    return request.get<ApiResponse<{ list: ReportItem[]; total: number; page: number; pageSize: number }>>('/reports', { params })
  },
  detail(id: number) {
    return request.get<ApiResponse<ReportDetail>>(`/reports/${id}`)
  },
  stats() {
    return request.get<ApiResponse<ReportStats>>('/reports/stats')
  },
}
