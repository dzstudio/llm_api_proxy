<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { userApi, type UserItem, type CreateUserData, type UpdateUserData } from '@/api/user'

// --- State ---
const users = ref<UserItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const keyword = ref('')
const loading = ref(false)

// Dialog state
const showDialog = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const editingUser = ref<UserItem | null>(null)
const submitting = ref(false)
const dialogError = ref('')

// Delete confirmation
const showDeleteConfirm = ref(false)
const deletingUser = ref<UserItem | null>(null)
const actionError = ref('')

// Form
const form = reactive({
  username: '',
  password: '',
  realName: '',
  email: '',
  department: '',
  role: 'USER',
})

const totalPages = computed(() => Math.ceil(total.value / pageSize.value))
const roleLabel = (role: string) => (role === 'ADMIN' ? '管理员' : '普通用户')
const statusLabel = (status: number) => (status === 1 ? '正常' : '已禁用')

// --- Data ---
async function fetchUsers() {
  loading.value = true
  try {
    const res = await userApi.list({ page: page.value, pageSize: pageSize.value, keyword: keyword.value })
    if (res.data.code === 0) {
      users.value = res.data.data.list
      total.value = res.data.data.total
    }
  } finally {
    loading.value = false
  }
}

// --- Actions ---
function openCreateDialog() {
  dialogMode.value = 'create'
  editingUser.value = null
  form.username = ''
  form.password = ''
  form.realName = ''
  form.email = ''
  form.department = ''
  form.role = 'USER'
  dialogError.value = ''
  showDialog.value = true
}

function openEditDialog(user: UserItem) {
  dialogMode.value = 'edit'
  editingUser.value = user
  form.username = user.username
  form.password = ''
  form.realName = user.realName
  form.email = user.email
  form.department = user.department
  form.role = user.role
  dialogError.value = ''
  showDialog.value = true
}

async function handleSubmit() {
  dialogError.value = ''
  if (dialogMode.value === 'create' && !form.username) {
    dialogError.value = '请输入用户名'
    return
  }
  if (dialogMode.value === 'create' && !form.password) {
    dialogError.value = '请输入密码'
    return
  }
  if (!form.realName) {
    dialogError.value = '请输入姓名'
    return
  }

  submitting.value = true
  try {
    if (dialogMode.value === 'create') {
      const data: CreateUserData = {
        username: form.username,
        password: form.password,
        realName: form.realName,
        email: form.email,
        department: form.department,
        role: form.role,
      }
      await userApi.create(data)
    } else if (editingUser.value) {
      const data: UpdateUserData = {
        realName: form.realName,
        email: form.email,
        department: form.department,
        role: form.role,
      }
      if (form.password) {
        data.password = form.password
      }
      await userApi.update(editingUser.value.id, data)
    }
    showDialog.value = false
    fetchUsers()
  } catch (err: any) {
    dialogError.value = err.response?.data?.message || '操作失败'
  } finally {
    submitting.value = false
  }
}

function confirmDelete(user: UserItem) {
  deletingUser.value = user
  showDeleteConfirm.value = true
}

async function handleDelete() {
  if (!deletingUser.value) return
  try {
    await userApi.delete(deletingUser.value.id)
    showDeleteConfirm.value = false
    deletingUser.value = null
    fetchUsers()
  } catch (err: any) {
    actionError.value = err.response?.data?.message || '删除失败'
    showDeleteConfirm.value = false
  }
}

async function handleToggleStatus(user: UserItem) {
  try {
    await userApi.toggleStatus(user.id)
    fetchUsers()
  } catch (err: any) {
    actionError.value = err.response?.data?.message || '操作失败'
  }
}

function goPage(p: number) {
  page.value = p
  fetchUsers()
}

function handleSearch() {
  page.value = 1
  fetchUsers()
}

onMounted(fetchUsers)
</script>

<template>
  <div>
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight text-slate-900">员工管理</h1>
        <p class="mt-1 text-sm text-slate-500">管理团队成员的账号和权限</p>
      </div>
      <button
        class="inline-flex items-center gap-2 rounded-lg bg-[#005d9c] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#004b80] transition-colors"
        @click="openCreateDialog"
      >
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        新增员工
      </button>
    </div>

    <!-- Action Error -->
    <div v-if="actionError" class="mb-4 flex items-center justify-between rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
      <span>{{ actionError }}</span>
      <button class="text-red-400 hover:text-red-600" @click="actionError = ''">
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Search -->
    <div class="mb-4 flex gap-3">
      <input
        v-model="keyword"
        type="text"
        placeholder="搜索用户名、姓名、邮箱..."
        class="block w-full max-w-xs rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#005d9c] focus:outline-none focus:ring-1 focus:ring-[#005d9c]"
        @keydown.enter="handleSearch"
      />
      <button
        class="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
        @click="handleSearch"
      >
        搜索
      </button>
    </div>

    <!-- Table -->
    <div class="rounded-xl border border-slate-200 bg-white">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-slate-100 text-left">
              <th class="px-6 py-3 text-xs font-medium text-slate-500">用户名</th>
              <th class="px-6 py-3 text-xs font-medium text-slate-500">姓名</th>
              <th class="px-6 py-3 text-xs font-medium text-slate-500">邮箱</th>
              <th class="px-6 py-3 text-xs font-medium text-slate-500">部门</th>
              <th class="px-6 py-3 text-xs font-medium text-slate-500">角色</th>
              <th class="px-6 py-3 text-xs font-medium text-slate-500">状态</th>
              <th class="px-6 py-3 text-xs font-medium text-slate-500">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="user in users"
              :key="user.id"
              class="border-b border-slate-50 text-sm hover:bg-slate-50/50 transition-colors"
            >
              <td class="px-6 py-3 font-medium text-slate-900">{{ user.username }}</td>
              <td class="px-6 py-3 text-slate-700">{{ user.realName || '-' }}</td>
              <td class="px-6 py-3 text-slate-500">{{ user.email || '-' }}</td>
              <td class="px-6 py-3 text-slate-700">{{ user.department || '-' }}</td>
              <td class="px-6 py-3">
                <span
                  :class="[
                    'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                    user.role === 'ADMIN'
                      ? 'bg-[#005d9c]/10 text-[#005d9c]'
                      : 'bg-slate-100 text-slate-600',
                  ]"
                >
                  {{ roleLabel(user.role) }}
                </span>
              </td>
              <td class="px-6 py-3">
                <button
                  :class="[
                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors',
                    user.status === 1
                      ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                      : 'bg-red-50 text-red-600 hover:bg-red-100',
                  ]"
                  @click="handleToggleStatus(user)"
                >
                  <span :class="['h-1.5 w-1.5 rounded-full', user.status === 1 ? 'bg-emerald-500' : 'bg-red-500']" />
                  {{ statusLabel(user.status) }}
                </button>
              </td>
              <td class="px-6 py-3">
                <div class="flex items-center gap-2">
                  <button
                    class="rounded-lg px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                    @click="openEditDialog(user)"
                  >
                    编辑
                  </button>
                  <button
                    v-if="user.username !== 'admin'"
                    class="rounded-lg px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                    @click="confirmDelete(user)"
                  >
                    删除
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="users.length === 0 && !loading">
              <td colspan="7" class="px-6 py-12 text-center text-sm text-slate-400">
                暂无数据
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="total > 0" class="flex items-center justify-between border-t border-slate-100 px-6 py-3">
        <span class="text-xs text-slate-500">共 {{ total }} 条记录</span>
        <div class="flex items-center gap-1">
          <button
            :disabled="page <= 1"
            class="rounded-lg px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
            @click="goPage(page - 1)"
          >
            上一页
          </button>
          <span class="px-2 text-xs text-slate-500">{{ page }} / {{ totalPages }}</span>
          <button
            :disabled="page >= totalPages"
            class="rounded-lg px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
            @click="goPage(page + 1)"
          >
            下一页
          </button>
        </div>
      </div>
    </div>

    <!-- Create/Edit Dialog -->
    <div v-if="showDialog" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/30" @click="showDialog = false" />
      <div class="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 class="mb-5 text-lg font-semibold text-slate-900">
          {{ dialogMode === 'create' ? '新增员工' : '编辑员工' }}
        </h2>

        <div v-if="dialogError" class="mb-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
          {{ dialogError }}
        </div>

        <div class="space-y-4">
          <div>
            <label class="mb-1 block text-xs font-medium text-slate-600">用户名</label>
            <input
              v-model="form.username"
              type="text"
              :disabled="dialogMode === 'edit'"
              placeholder="请输入用户名"
              class="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#005d9c] focus:outline-none focus:ring-1 focus:ring-[#005d9c] disabled:bg-slate-50"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-slate-600">
              密码
              <span v-if="dialogMode === 'edit'" class="text-slate-400">（留空则不修改）</span>
            </label>
            <input
              v-model="form.password"
              type="password"
              :placeholder="dialogMode === 'create' ? '请输入密码' : '留空则不修改'"
              class="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#005d9c] focus:outline-none focus:ring-1 focus:ring-[#005d9c]"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-slate-600">姓名</label>
            <input
              v-model="form.realName"
              type="text"
              placeholder="请输入真实姓名"
              class="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#005d9c] focus:outline-none focus:ring-1 focus:ring-[#005d9c]"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-slate-600">邮箱</label>
            <input
              v-model="form.email"
              type="email"
              placeholder="请输入邮箱"
              class="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#005d9c] focus:outline-none focus:ring-1 focus:ring-[#005d9c]"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-slate-600">部门</label>
            <input
              v-model="form.department"
              type="text"
              placeholder="请输入部门"
              class="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#005d9c] focus:outline-none focus:ring-1 focus:ring-[#005d9c]"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-slate-600">角色</label>
            <select
              v-model="form.role"
              class="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#005d9c] focus:outline-none focus:ring-1 focus:ring-[#005d9c]"
            >
              <option value="USER">普通用户</option>
              <option value="ADMIN">管理员</option>
            </select>
          </div>
        </div>

        <div class="mt-6 flex justify-end gap-3">
          <button
            class="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            @click="showDialog = false"
          >
            取消
          </button>
          <button
            :disabled="submitting"
            class="rounded-lg bg-[#005d9c] px-4 py-2 text-sm font-medium text-white hover:bg-[#004b80] disabled:opacity-50 transition-colors"
            @click="handleSubmit"
          >
            {{ submitting ? '提交中...' : '确认' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation -->
    <div v-if="showDeleteConfirm" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/30" @click="showDeleteConfirm = false" />
      <div class="relative w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h2 class="mb-2 text-lg font-semibold text-slate-900">确认删除</h2>
        <p class="mb-5 text-sm text-slate-500">
          确定要删除员工「{{ deletingUser?.realName || deletingUser?.username }}」吗？此操作不可撤销。
        </p>
        <div class="flex justify-end gap-3">
          <button
            class="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            @click="showDeleteConfirm = false"
          >
            取消
          </button>
          <button
            class="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
            @click="handleDelete"
          >
            确认删除
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
