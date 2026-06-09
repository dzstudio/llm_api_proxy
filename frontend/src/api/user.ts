import request from './request'
import type { ApiResponse } from './auth'

export interface UserItem {
  id: number
  username: string
  realName: string
  email: string
  department: string
  role: string
  status: number
  lastLoginTime: string | null
  createTime: string
  updateTime?: string
}

export interface UserListData {
  list: UserItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface CreateUserData {
  username: string
  password: string
  realName?: string
  email?: string
  department?: string
  role?: string
}

export interface UpdateUserData {
  realName?: string
  email?: string
  department?: string
  role?: string
  status?: number
  password?: string
}

export const userApi = {
  list(params: { page?: number; pageSize?: number; keyword?: string }) {
    return request.get<ApiResponse<UserListData>>('/users', { params })
  },
  create(data: CreateUserData) {
    return request.post<ApiResponse<UserItem>>('/users', data)
  },
  update(id: number, data: UpdateUserData) {
    return request.put<ApiResponse<UserItem>>(`/users/${id}`, data)
  },
  delete(id: number) {
    return request.delete<ApiResponse<null>>(`/users/${id}`)
  },
  toggleStatus(id: number) {
    return request.patch<ApiResponse<{ id: number; username: string; status: number }>>(`/users/${id}/status`)
  },
}
