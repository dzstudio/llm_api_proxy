import request from './request'

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  token: string
  username: string
  realName: string
  role: string
  requirePasswordChange: boolean
}

export interface UserInfo {
  username: string
  realName: string
  role: string
}

export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

export const authApi = {
  login(data: LoginRequest) {
    return request.post<ApiResponse<LoginResponse>>('/auth/login', data)
  },
  getCurrentUser() {
    return request.get<ApiResponse<UserInfo>>('/auth/me')
  },
}
