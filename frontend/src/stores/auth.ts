import { defineStore } from 'pinia'
import { ref } from 'vue'
import { authApi } from '@/api/auth'
import type { LoginRequest, UserInfo } from '@/api/auth'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string>(localStorage.getItem('token') || '')
  const userInfo = ref<UserInfo | null>(null)

  async function login(data: LoginRequest) {
    const res = await authApi.login(data)
    if (res.data.code === 0) {
      token.value = res.data.data.token
      localStorage.setItem('token', res.data.data.token)
      userInfo.value = {
        username: res.data.data.username,
        realName: res.data.data.realName,
        role: res.data.data.role,
      }
      return res.data.data
    }
    throw new Error(res.data.message || '登录失败')
  }

  async function fetchUserInfo() {
    try {
      const res = await authApi.getCurrentUser()
      if (res.data.code === 0) {
        userInfo.value = res.data.data
      }
    } catch {
      logout()
    }
  }

  function logout() {
    token.value = ''
    userInfo.value = null
    localStorage.removeItem('token')
  }

  return { token, userInfo, login, fetchUserInfo, logout }
})
