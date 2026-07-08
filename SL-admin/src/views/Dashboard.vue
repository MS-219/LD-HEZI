<template>
  <div class="app-container">
    <!-- 侧边栏：采用经典 Ant Design 深色风格，对比度最高 -->
    <div class="sidebar">
      <div class="logo">
        <el-icon :size="24"><Cpu /></el-icon>
        <span class="logo-text">全球云智算</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        class="el-menu-vertical"
        background-color="transparent"
        text-color="#ffffffa6"
        active-text-color="#fff"
        router
      >
        <el-menu-item index="/overview">
          <el-icon><DataLine /></el-icon>
          <span>控制台概览</span>
        </el-menu-item>

        <el-sub-menu index="cluster">
          <template #title>
            <el-icon><Cpu /></el-icon>
            <span>集群管理中心</span>
          </template>
          <el-menu-item index="/monitor">
            <el-icon><Monitor /></el-icon>
            <span>节点监控大屏</span>
          </el-menu-item>
          <el-menu-item index="/device-tasks">
            <el-icon><List /></el-icon>
            <span>算力生产流水</span>
          </el-menu-item>
          <el-menu-item index="/device-commands">
            <el-icon><Promotion /></el-icon>
            <span>设备指令中心</span>
          </el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="automation">
          <template #title>
            <el-icon><VideoPlay /></el-icon>
            <span>策略自动化</span>
          </template>
          <el-menu-item index="/automation">
            <el-icon><Connection /></el-icon>
            <span>任务编排编排</span>
          </el-menu-item>
          <el-menu-item index="/scheduling">
            <el-icon><Operation /></el-icon>
            <span>智能调度策略</span>
          </el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="proxy">
          <template #title>
            <el-icon><Share /></el-icon>
            <span>IP代理矩阵</span>
          </template>
          <el-menu-item index="/proxy-matrix">
            <el-icon><Connection /></el-icon>
            <span>代理资源池</span>
          </el-menu-item>
        </el-sub-menu>

        <el-menu-item index="/operations">
          <el-icon><Odometer /></el-icon>
          <span>集群远程运维</span>
        </el-menu-item>
        <el-menu-item index="/device-upgrades">
          <el-icon><UploadFilled /></el-icon>
          <span>设备升级管理</span>
        </el-menu-item>
        <el-menu-item index="/settings">
          <el-icon><Setting /></el-icon>
          <span>系统配置中心</span>
        </el-menu-item>
      </el-menu>
    </div>

    <!-- 主中心区域 -->
    <div class="main-content">
      <header class="navbar">
        <div class="nav-left">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item>管理控制台</el-breadcrumb-item>
            <el-breadcrumb-item>{{ $route.meta.title }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="nav-right">
          <el-dropdown @command="handleCommand">
            <span class="user-link">
              <el-avatar :size="28" style="background-color: #0e7bd4">A</el-avatar>
              Admin <el-icon><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout">退出控制台</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>
      
      <!-- 页面主体：通过 flex: 1 强制铺满 -->
      <div class="page-body">
        <router-view />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Cpu, Monitor, ArrowDown, DataLine, List, Connection, Operation, Odometer, VideoPlay, Share, Promotion, UploadFilled, Setting } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()
const activeMenu = computed(() => route.path)

const handleCommand = (command) => {
  if (command === 'logout') {
    localStorage.removeItem('sl_token')
    ElMessage.success('已安全退出')
    router.push('/login')
  }
}
</script>

<style scoped>
.app-container {
  display: flex;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.sidebar {
  width: 240px;
  background: linear-gradient(180deg, #0b1f4b 0%, #123a7c 100%);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.logo {
  height: 64px;
  padding: 0 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: white;
  background: rgba(6, 18, 38, 0.5);
}

.logo-text {
  font-size: 18px;
  font-weight: bold;
}

.el-menu-vertical {
  border-right: none;
  flex: 1;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #f0f2f5; /* 浅灰色背景，提升文字对比度 */
}

.navbar {
  height: 60px;
  background: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  box-shadow: 0 1px 4px rgba(0,21,41,.08);
}

.page-body {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  width: 100%;
}

.user-link {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: #333;
}
</style>
