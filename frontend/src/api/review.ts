import request from './request'
import type { ApiResponse } from './auth'

export interface ReviewItem {
  id: number
  conversationId: number
  conversationTitle: string
  username: string
  reviewModelName: string
  score: number
  strengths: string
  weaknesses: string
  suggestions: string
  createTime: string
}

export const reviewApi = {
  evaluate(conversationId: number) {
    return request.post<ApiResponse<ReviewItem>>(`/reviews/evaluate/${conversationId}`)
  },
  getByConversation(conversationId: number) {
    return request.get<ApiResponse<ReviewItem | null>>(`/reviews/${conversationId}`)
  },
}
