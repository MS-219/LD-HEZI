<template>
  <div class="layout">
    <el-container>
      <el-aside width="240px" class="aside">
        <div class="logo">
          <div class="logo-icon-wrap">
            <svg viewBox="0 0 48 48" class="logo-mark" aria-hidden="true">
              <path d="M36 20a10 10 0 0 0-19.4-3.3A8 8 0 0 0 12 32h23a7 7 0 0 0 1-12z"
                fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round" />
              <rect x="19" y="17" width="10" height="10" rx="2" fill="currentColor" opacity="0.9" />
            </svg>
          </div>
          <div class="logo-text-wrap">
            <span class="logo-text">全球云智算</span>
            <span class="logo-subtitle">CLOUD CONSOLE</span>
          </div>
        </div>
        <el-menu
          :default-active="activeMenu"
          router
          class="menu"
          background-color="transparent"
          text-color="#51637f"
          active-text-color="#0e7bd4"
        >
          <template v-for="group in visibleGroups" :key="group.name">
            <div class="menu-group-label">{{ group.name }}</div>
            <el-menu-item
              v-for="item in group.items"
              :key="item.index"
              :index="item.index"
            >
              <el-icon><component :is="item.icon" /></el-icon>
              <span :style="item.badge ? 'flex: 1;' : undefined">{{ menuLabel(item) }}</span>
              <el-badge v-if="item.badge && pendingApplyCount > 0" :value="pendingApplyCount" :max="99" class="menu-badge" />
            </el-menu-item>
          </template>
        </el-menu>
        
        <!-- 侧边栏底部 -->
        <div class="aside-footer">
          <div class="system-status">
            <span class="status-dot online"></span>
            <span class="status-text">系统运行正常</span>
          </div>
        </div>
      </el-aside>
      
      <el-container>
        <el-header class="header">
          <div class="header-left">
            <el-breadcrumb separator="/">
              <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
              <el-breadcrumb-item>{{ $route.meta.title || '管理后台' }}</el-breadcrumb-item>
            </el-breadcrumb>
          </div>
          <div class="header-right">
            <div class="header-actions">
              <el-badge v-if="!isFactoryUser" :value="3" :max="99" class="notification-badge">
                <el-button :icon="Bell" circle class="action-btn" />
              </el-badge>
              <el-button :icon="FullScreen" circle class="action-btn" @click="toggleFullscreen" />
            </div>
            <el-dropdown @command="handleCommand">
              <span class="user-info">
                <el-avatar :size="36" class="avatar">
                  <span>{{ userAvatarText }}</span>
                </el-avatar>
                <div class="user-text">
                  <span class="username">{{ displayUsername }}</span>
                  <span class="role">{{ displayRole }}</span>
                </div>
                <el-icon><ArrowDown /></el-icon>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item v-if="!isFactoryUser" command="profile">
                    <el-icon><User /></el-icon>个人信息
                  </el-dropdown-item>
                  <el-dropdown-item v-if="!isFactoryUser" command="password">
                    <el-icon><Lock /></el-icon>修改密码
                  </el-dropdown-item>
                  <el-dropdown-item divided command="logout">
                    <el-icon><SwitchButton /></el-icon>退出登录
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </el-header>
        <el-main class="main">
          <router-view></router-view>
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import { 
  DataAnalysis, Monitor, User, ArrowDown, Bell, Wallet,
  Money, Setting, Lock, SwitchButton, FullScreen, Message, List, UserFilled, Postcard, UploadFilled
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()

const activeMenu = computed(() => route.path)
const pendingApplyCount = ref(0)
let pollTimer = null

const userRole = computed(() => localStorage.getItem('userRole') || 'admin')
const isFactoryUser = computed(() => userRole.value === 'factory')

const readUserInfo = () => {
  try {
    return JSON.parse(localStorage.getItem('userInfo') || '{}')
  } catch (e) {
    return {}
  }
}

const userInfo = computed(readUserInfo)
const displayUsername = computed(() => {
  if (isFactoryUser.value) {
    return userInfo.value.username || '工厂账号'
  }
  return userInfo.value.username || '管理员'
})
const displayRole = computed(() => (isFactoryUser.value ? '工厂' : '超级管理员'))
const userAvatarText = computed(() => (isFactoryUser.value ? '厂' : 'A'))

const menuGroups = [
  {
    name: '总览',
    items: [
      { index: '/statistics', label: '数据统计', icon: DataAnalysis, adminOnly: true },
    ],
  },
  {
    name: '业务管理',
    items: [
      { index: '/device', label: '设备管理', factoryLabel: '设备二维码', icon: Monitor, adminOnly: true, factory: true },
      { index: '/user', label: '用户管理', icon: User, adminOnly: true },
      { index: '/notice', label: '公告管理', icon: Bell, adminOnly: true },
      { index: '/feedback', label: '意见反馈', icon: Message, adminOnly: true },
    ],
  },
  {
    name: '财务管理',
    items: [
      { index: '/withdraw', label: '提现管理', icon: Wallet, adminOnly: true },
      { index: '/payment-apply', label: '账户变更审核', icon: Postcard, badge: true, adminOnly: true },
      { index: '/earnings', label: '收益管理', icon: Money, adminOnly: true },
      { index: '/reward', label: '分润流水', icon: List, adminOnly: true },
    ],
  },
  {
    name: '系统',
    items: [
      { index: '/settings', label: '系统设置', icon: Setting, adminOnly: true },
      { index: '/app-version', label: 'App版本管理', icon: UploadFilled, adminOnly: true },
      { index: '/team', label: '团队管理', icon: UserFilled, adminOnly: true },
    ],
  },
]

const visibleGroups = computed(() => {
  return menuGroups
    .map((group) => ({
      name: group.name,
      items: group.items.filter((item) =>
        isFactoryUser.value ? item.factory : item.adminOnly
      ),
    }))
    .filter((group) => group.items.length > 0)
})

const menuLabel = (item) => {
  return isFactoryUser.value && item.factoryLabel ? item.factoryLabel : item.label
}

const fetchPendingApplyCount = async () => {
  try {
    const res = await axios.get('/api/admin/payment-apply/list', { 
      params: { page: 1, size: 1, status: 0 } 
    })
    if (res.data.code === 200 && res.data.data) {
      pendingApplyCount.value = res.data.data.total || 0
    }
  } catch (e) {
    console.error('Failed to fetch pending apply count')
  }
}

onMounted(() => {
  if (!isFactoryUser.value) {
    fetchPendingApplyCount()
    // 每60秒轮询一次
    pollTimer = setInterval(fetchPendingApplyCount, 60000)
  }
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})

const handleCommand = (command) => {
  if (command === 'logout') {
    localStorage.removeItem('token')
    localStorage.removeItem('userInfo')
    localStorage.removeItem('userRole')
    ElMessage.success('已退出登录')
    router.push('/login')
  } else if (command === 'profile') {
    router.push('/settings?tab=profile')
  } else if (command === 'password') {
    router.push('/settings?tab=security')
  }
}

const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen()
  } else {
    document.exitFullscreen()
  }
}
</script>

<style scoped>
.layout {
  height: 100vh;
  overflow: hidden;
  background: #f1f5f9;
  display: flex;
}

:deep(.el-container) {
  height: 100%;
}

.aside {
  background: #ffffff;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #e3e9f2;
  box-shadow: none;
  z-index: 100;
}

.logo {
  height: 72px;
  display: flex;
  align-items: center;
  padding: 0 20px;
  gap: 12px;
  border-bottom: 1px solid #e3e9f2;
}

.logo-icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, #0b1f4b 0%, #0e7bd4 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #7fe3f7;
}

.logo-mark {
  width: 28px;
  height: 28px;
}

.logo-text-wrap {
  display: flex;
  flex-direction: column;
}

.logo-text {
  font-size: 18px;
  font-weight: 800;
  color: #0f2a5c;
  letter-spacing: 1.5px;
  line-height: 1.2;
}

.logo-subtitle {
  font-size: 10px;
  color: #8296b3;
  letter-spacing: 2px;
  text-transform: uppercase;
}

.menu {
  flex: 1;
  border-right: none;
  padding: 8px 14px 20px;
  overflow-y: auto;
}

/* 滚动条美化 */
.menu::-webkit-scrollbar { width: 4px; }
.menu::-webkit-scrollbar-thumb { background: #e3e9f2; border-radius: 4px; }

/* 分组小标题 */
.menu-group-label {
  font-size: 11px;
  letter-spacing: 2px;
  color: #9aa9c2;
  padding: 18px 12px 6px;
  user-select: none;
}

:deep(.el-menu-item) {
  height: 42px;
  margin: 2px 0;
  border-radius: 8px;
  transition: background 0.2s, color 0.2s;
  color: #51637f !important;
  position: relative;
}

:deep(.el-menu-item:hover) {
  background: #f2f6fb !important;
  color: #0f2a5c !important;
}

:deep(.el-menu-item.is-active) {
  background: #e7f2fb !important;
  color: #0e7bd4 !important;
  font-weight: 700;
  box-shadow: none;
}

:deep(.el-menu-item.is-active::before) {
  content: '';
  position: absolute;
  left: -14px;
  top: 8px;
  bottom: 8px;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: #0e7bd4;
}

:deep(.el-menu-item) {
  display: flex;
  align-items: center;
}

.menu-badge {
  margin-left: auto;
  margin-right: 8px;
}
.menu-badge :deep(.el-badge__content) {
  background-color: #f56c6c;
  border: none;
}

:deep(.el-menu-item .el-icon) {
  font-size: 20px;
  margin-right: 12px;
}

.aside-footer {
  padding: 14px 20px;
  border-top: 1px solid #e3e9f2;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.system-status {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: #f2f6fb;
  border-radius: 8px;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  position: relative;
}

.status-dot.online {
  background: #10b981;
  box-shadow: 0 0 10px #10b981;
}

.status-dot.online::after {
  content: '';
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  border-radius: 50%;
  border: 2px solid #10b981;
  animation: pulse-ring 1.5s infinite;
}

@keyframes pulse-ring {
  0% { transform: scale(0.8); opacity: 1; }
  100% { transform: scale(2); opacity: 0; }
}

.status-text {
  font-size: 12px;
  color: #51637f;
  font-weight: 500;
}

.record-no {
  display: block;
  text-align: center;
  font-size: 12px;
  color: rgba(148, 163, 184, 0.88);
  line-height: 1.5;
  text-decoration: none;
  transition: color 0.2s ease;
}

.record-no:hover {
  color: #cbd5e1;
}

.header {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 28px;
  height: 72px;
  position: sticky;
  top: 0;
  z-index: 99;
}

.header-left {
  display: flex;
  align-items: center;
}

:deep(.el-breadcrumb__inner) {
  color: #64748b;
  font-weight: 500;
}

:deep(.el-breadcrumb__item:last-child .el-breadcrumb__inner) {
  color: #1e293b;
  font-weight: 700;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 32px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.action-btn {
  border: 1px solid #e2e8f0;
  color: #64748b;
  background: #fff;
  transition: all 0.2s;
}

.action-btn:hover {
  background: #f8fafc;
  color: #0e7bd4;
  border-color: #c7d2fe;
  transform: translateY(-2px);
}

.notification-badge :deep(.el-badge__content) {
  background: linear-gradient(135deg, #f43f5e 0%, #e11d48 100%);
  border: 2px solid #fff;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 14px;
  cursor: pointer;
  padding: 6px 14px;
  border-radius: 12px;
  transition: all 0.3s;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.user-info:hover {
  background: #fff;
  border-color: #cbd5e1;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.avatar {
  background: linear-gradient(135deg, #0e7bd4 0%, #22d3ee 100%);
  font-weight: 800;
  border: 2px solid #fff;
  box-shadow: 0 4px 8px rgba(99, 102, 241, 0.2);
}

.user-text {
  display: flex;
  flex-direction: column;
}

.username {
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
}

.role {
  font-size: 11px;
  color: #64748b;
  font-weight: 600;
}

.main {
  background: #f1f5f9;
  padding: 28px;
  overflow-y: auto;
  flex: 1;
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
