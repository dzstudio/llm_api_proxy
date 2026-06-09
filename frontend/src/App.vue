<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

onMounted(async () => {
  if (authStore.token) {
    try {
      await authStore.fetchUserInfo()
    } catch {
      authStore.logout()
      router.push('/login')
    }
  }
})
</script>

<template>
  <router-view />
</template>
