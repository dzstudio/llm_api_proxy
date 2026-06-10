import request from './request'
import type { ApiResponse } from './auth'

export interface ModelItem {
  id: number
  name: string
  provider: string
  modelName: string
  baseUrl: string
  apiKey: string
  enabled: number
  timeoutSeconds: number
  isReviewModel: number
  createTime: string
  updateTime: string
}

export interface CreateModelData {
  name: string
  provider: string
  modelName: string
  baseUrl?: string
  apiKey?: string
  timeoutSeconds?: number
  isReviewModel?: number
}

export type UpdateModelData = Partial<CreateModelData>

export const modelApi = {
  list() {
    return request.get<ApiResponse<{ list: ModelItem[] }>>('/models')
  },
  create(data: CreateModelData) {
    return request.post<ApiResponse<ModelItem>>('/models', data)
  },
  update(id: number, data: UpdateModelData) {
    return request.put<ApiResponse<ModelItem>>(`/models/${id}`, data)
  },
  delete(id: number) {
    return request.delete<ApiResponse<null>>(`/models/${id}`)
  },
  toggleStatus(id: number) {
    return request.patch<ApiResponse<ModelItem>>(`/models/${id}/status`)
  },
  setReview(id: number) {
    return request.patch<ApiResponse<ModelItem>>(`/models/${id}/review`)
  },
}
