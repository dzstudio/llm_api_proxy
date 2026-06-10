import request from './request'
import type { ApiResponse } from './auth'

export interface ApiKeyItem {
  id: number
  userId: number
  username: string
  apiKey: string
  defaultModelId: number | null
  status: number
  createTime: string
  updateTime: string
}

export interface ApiKeyCreated {
  id: number
  userId: number
  apiKey: string
  status: number
  createTime: string
}

export const apiKeyApi = {
  list() {
    return request.get<ApiResponse<{ list: ApiKeyItem[] }>>('/api-keys')
  },
  create(targetUserId: number) {
    return request.post<ApiResponse<ApiKeyCreated>>('/api-keys', { targetUserId })
  },
  reset(id: number) {
    return request.post<ApiResponse<ApiKeyCreated>>(`/api-keys/${id}/reset`)
  },
  toggleStatus(id: number) {
    return request.patch<ApiResponse<{ id: number; userId: number; status: number }>>(`/api-keys/${id}/status`)
  },
  delete(id: number) {
    return request.delete<ApiResponse<null>>(`/api-keys/${id}`)
  },
}
