<template>
  <div class="statistics-page">
    <!-- 顶部数据看板 -->
    <el-row :gutter="20" class="stat-row">
      <el-col :span="6" v-for="item in statCards" :key="item.label">
        <div class="stat-card" :class="item.type">
          <div class="card-content">
            <div class="card-title">{{ item.label }}</div>
            <div class="card-value">{{ item.value }}</div>
            <div class="card-subtext" v-if="item.subtext">
              <span :class="item.subClass">{{ item.subtext }}</span>
            </div>
          </div>
          <div class="card-icon">{{ item.icon }}</div>
          <div class="card-bg-icon">{{ item.icon }}</div>
        </div>
      </el-col>
    </el-row>

    <!-- 中部图表：趋势分析 -->
    <el-row :gutter="20" class="chart-row">
      <el-col :span="16">
        <el-card class="glass-card chart-card main-trend">
          <template #header>
            <div class="card-header">
              <span class="header-title">📈 数据趋势分析 (14日)</span>
              <el-radio-group v-model="trendType" size="small" @change="updateTrendChart">
                <el-radio-button label="earnings">收益</el-radio-button>
                <el-radio-button label="users">用户</el-radio-button>
                <el-radio-button label="devices">设备</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div ref="trendChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card class="glass-card chart-card side-dist">
          <template #header>
            <span class="header-title">🎯 设备状态分布</span>
          </template>
          <div ref="distChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 底部：详细信息与操作 -->
    <el-row :gutter="20" class="bottom-row">
      <el-col :span="16">
        <el-card class="glass-card detail-card">
          <template #header>
            <span class="header-title">🚀 系统快速操作</span>
          </template>
          <div class="quick-actions">
            <div class="action-item" @click="$router.push('/user')">
              <div class="action-icon user">👤</div>
              <span>管理用户</span>
            </div>
            <div class="action-item" @click="$router.push('/device')">
              <div class="action-icon device">💻</div>
              <span>设备监控</span>
            </div>
            <div class="action-item" @click="$router.push('/earnings')">
              <div class="action-icon earnings">💰</div>
              <span>收益审计</span>
            </div>
            <div class="action-item" @click="$router.push('/settings')">
              <div class="action-icon settings">⚙️</div>
              <span>系统配置</span>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card class="glass-card info-card">
          <template #header>
            <span class="header-title">🛡️ 系统服务状态</span>
          </template>
          <div class="info-body">
            <div class="status-item">
              <span class="label">后台服务:</span>
              <el-tag :type="backendOnline ? 'success' : 'danger'" effect="dark" round size="small">
                {{ backendOnline ? 'RUNNING' : 'STOPPED' }}
              </el-tag>
            </div>
            <div class="status-item">
              <span class="label">系统版本:</span>
              <span class="value">v1.2.5 PRO</span>
            </div>
            <div class="status-item">
              <span class="label">上次同步:</span>
              <span class="value">{{ lastUpdate }}</span>
            </div>
            <el-button 
              type="primary" 
              class="refresh-btn" 
              :loading="loading" 
              @click="initData"
            >
              🔄 立即同步最新数据
            </el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import axios from 'axios'
import * as echarts from 'echarts'

const stats = ref({})
const trendData = ref({})
const loading = ref(false)
const backendOnline = ref(false)
const lastUpdate = ref('-')
const trendType = ref('earnings')
const trendChartRef = ref(null)
const distChartRef = ref(null)
let trendChart = null
let distChart = null

const statCards = computed(() => [
  { 
    label: '设备总数', 
    value: stats.value.device?.total || 0, 
    icon: '📱', 
    type: 'blue',
    subtext: `● ${stats.value.device?.online || 0} 在线`,
    subClass: 'online-text'
  },
  { 
    label: '注册用户', 
    value: stats.value.user?.total || 0, 
    icon: '👥', 
    type: 'purple',
    subtext: '活跃用户稳定增长',
    subClass: ''
  },
  { 
    label: '累计收益', 
    value: `¥${stats.value.earnings?.total || '0.00'}`, 
    icon: '💰', 
    type: 'green',
    subtext: `昨日: ¥${stats.value.earnings?.yesterday || '0.00'}`,
    subClass: ''
  },
  { 
    label: '总算力值', 
    value: stats.value.hashrate?.total || 0, 
    icon: '⚡', 
    type: 'orange',
    subtext: '系统负载正常',
    subClass: ''
  }
])

const initData = async () => {
  loading.value = true
  try {
    const [dashRes, trendRes] = await Promise.all([
      axios.get('/api/statistics/dashboard'),
      axios.get('/api/statistics/trend?days=14')
    ])
    
    if (dashRes.data.code === 200) {
      stats.value = dashRes.data.data
      backendOnline.value = true
      lastUpdate.value = new Date().toLocaleTimeString()
    }
    
    if (trendRes.data.code === 200) {
      trendData.value = trendRes.data.data
    }

    nextTick(() => {
      renderCharts()
    })

  } catch (e) {
    console.error(e)
    backendOnline.value = false
  } finally {
    loading.value = false
  }
}

const renderCharts = () => {
  initTrendChart()
  initDistChart()
}

const initTrendChart = () => {
  if (!trendChartRef.value) return
  if (!trendChart) {
    trendChart = echarts.init(trendChartRef.value)
  }
  updateTrendChart()
}

const updateTrendChart = () => {
  if (!trendChart || !trendData.value.dates) return
  
  const typeMap = {
    earnings: { name: '收益 (¥)', data: trendData.value.earnings, color: '#10b981' },
    users: { name: '新增用户', data: trendData.value.users, color: '#8b5cf6' },
    devices: { name: '新增设备', data: trendData.value.devices, color: '#3b82f6' }
  }
  
  const current = typeMap[trendType.value]
  
  const option = {
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: trendData.value.dates,
      axisLine: { lineStyle: { color: '#e5e7eb' } },
      axisLabel: { color: '#9ca3af' }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { type: 'dashed', color: '#f3f4f6' } },
      axisLabel: { color: '#9ca3af' }
    },
    series: [{
      name: current.name,
      type: 'line',
      smooth: true,
      data: current.data,
      itemStyle: { color: current.color },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: `${current.color}44` },
          { offset: 1, color: `${current.color}00` }
        ])
      },
      lineStyle: { width: 3 }
    }]
  }
  trendChart.setOption(option)
}

const initDistChart = () => {
  if (!distChartRef.value) return
  if (!distChart) {
    distChart = echarts.init(distChartRef.value)
  }
  
  const device = stats.value.device || {}
  const option = {
    tooltip: { trigger: 'item' },
    legend: { bottom: '5%', left: 'center', textStyle: { color: '#6b7280' } },
    series: [{
      name: '设备状态',
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
      label: { show: false },
      data: [
        { value: device.online || 0, name: '在线', itemStyle: { color: '#10b981' } },
        { value: device.offline || 0, name: '离线', itemStyle: { color: '#9ca3af' } },
        { value: (device.total || 0) - (device.bound || 0), name: '未绑定', itemStyle: { color: '#f59e0b' } }
      ]
    }]
  }
  distChart.setOption(option)
}

const handleResize = () => {
  trendChart?.resize()
  distChart?.resize()
}

onMounted(() => {
  initData()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  trendChart?.dispose()
  distChart?.dispose()
})
</script>

<style scoped>
.statistics-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 顶部统计卡片 */
.stat-row {
  margin-bottom: 0;
}

.stat-card {
  height: 150px;
  border-radius: 24px;
  padding: 28px;
  position: relative;
  overflow: hidden;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #fff;
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  border: none;
}

.stat-card:hover {
  transform: translateY(-10px) scale(1.02);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}

.stat-card.blue { background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); box-shadow: 0 10px 25px rgba(99, 102, 241, 0.3); }
.stat-card.purple { background: linear-gradient(135deg, #a855f7 0%, #8b5cf6 100%); box-shadow: 0 10px 25px rgba(168, 85, 247, 0.3); }
.stat-card.green { background: linear-gradient(135deg, #10b981 0%, #059669 100%); box-shadow: 0 10px 25px rgba(16, 185, 129, 0.3); }
.stat-card.orange { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); box-shadow: 0 10px 25px rgba(245, 158, 11, 0.3); }

.card-content {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.card-title {
  font-size: 15px;
  opacity: 0.9;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.card-value {
  font-size: 36px;
  font-weight: 800;
  letter-spacing: -1px;
}

.card-subtext {
  margin-top: 12px;
  font-size: 13px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(4px);
  padding: 4px 12px;
  border-radius: 20px;
  width: fit-content;
  font-weight: 500;
}

.online-text {
  color: #fff;
  display: flex;
  align-items: center;
  gap: 4px;
}

.card-icon {
  font-size: 56px;
  opacity: 0.25;
  position: relative;
  z-index: 2;
  transition: all 0.3s ease;
}

.stat-card:hover .card-icon {
  transform: scale(1.2) rotate(10deg);
  opacity: 0.5;
}

.card-bg-icon {
  position: absolute;
  right: -30px;
  bottom: -30px;
  font-size: 160px;
  opacity: 0.12;
  transform: rotate(-15deg);
  z-index: 1;
}

/* 图表布局 */
.chart-row {
  margin-bottom: 0;
}

.glass-card {
  background: rgba(255, 255, 255, 0.9) !important;
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 24px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.chart-card {
  height: 450px;
}

:deep(.el-card__header) {
  padding: 24px 28px;
  border-bottom: 1px solid #f1f5f9;
  background: #fff;
}

.header-title {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 8px;
}

.chart-container {
  height: 340px;
  width: 100%;
  padding: 10px;
}

/* 下部功能区 */
.bottom-row {
  margin-bottom: 0;
}

.quick-actions {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
  padding: 10px;
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  padding: 24px 16px;
  border-radius: 20px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.action-item:hover {
  background: #fff;
  transform: translateY(-8px);
  box-shadow: 0 15px 30px rgba(99, 102, 241, 0.1);
  border-color: #6366f1;
}

.action-icon {
  width: 72px;
  height: 72px;
  border-radius: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  transition: all 0.3s;
}

.action-item:hover .action-icon {
  transform: scale(1.1);
}

.action-icon.user { background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%); color: #4338ca; }
.action-icon.device { background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); color: #15803d; }
.action-icon.earnings { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); color: #b45309; }
.action-icon.settings { background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%); color: #475569; }

.action-item span {
  font-size: 15px;
  font-weight: 700;
  color: #334155;
}

/* 服务状态卡片 */
.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.status-item .label {
  color: #64748b;
  font-size: 14px;
  font-weight: 600;
}

.status-item .value {
  color: #1e293b;
  font-weight: 700;
  font-size: 14px;
}

.refresh-btn {
  margin-top: 16px;
  height: 52px;
  border-radius: 16px;
  font-weight: 700;
  font-size: 15px;
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  border: none;
  box-shadow: 0 8px 16px rgba(99, 102, 241, 0.2);
  transition: all 0.3s;
}

.refresh-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 24px rgba(99, 102, 241, 0.4);
}

/* 底部缓冲 Padding */
.statistics-page {
  padding-bottom: 80px;
}
</style>
