<template>
  <div class="overview-container">
    <!-- 顶部核心指标：数字大屏风 -->
    <el-row :gutter="20">
      <el-col :span="6" v-for="item in kpis" :key="item.label">
        <div class="kpi-card" :class="item.type">
          <div class="kpi-label">{{ item.label }}</div>
          <div class="kpi-value">
            <span class="num">{{ item.value }}</span>
            <span class="unit">{{ item.unit }}</span>
          </div>
          <div class="kpi-footer">
            <span class="trend" :class="item.trend > 0 ? 'up' : 'down'">
              {{ item.trend > 0 ? '↑' : '↓' }} {{ Math.abs(item.trend) }}%
            </span>
            自昨日以来
          </div>
          <el-icon class="kpi-icon"><component :is="item.icon" /></el-icon>
        </div>
      </el-col>
    </el-row>

    <!-- 中部图表区：算力脉搏 -->
    <el-row :gutter="20" style="margin-top: 24px;">
      <el-col :span="16">
        <div class="chart-card dark-panel">
          <div class="panel-header">
            <span class="title">全网算力调度脉搏 (Task Throughput)</span>
            <el-radio-group v-model="trendTimeRange" size="small">
              <el-radio-button label="24h">24小时</el-radio-button>
              <el-radio-button label="7d">7天</el-radio-button>
            </el-radio-group>
          </div>
          <div ref="trendChartRef" class="echart-box"></div>
        </div>
      </el-col>
      
      <el-col :span="8">
        <div class="chart-card dark-panel">
          <div class="panel-header">
            <span class="title">节点健康度分布</span>
          </div>
          <div ref="healthChartRef" class="echart-box circle"></div>
          <div class="health-stats">
            <div class="stat-item">
              <span class="dot online"></span> 在线: {{ deviceStats.onlineCount }}
            </div>
            <div class="stat-item">
              <span class="dot offline"></span> 离线: {{ deviceStats.totalCount - deviceStats.onlineCount }}
            </div>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 底部：实时任务监控流水线 -->
    <div class="bottom-panel dark-panel">
      <div class="panel-header">
        <span class="title"><el-icon><Operation /></el-icon> 实时任务分流监视器</span>
        <span class="status-tag active">LIVE COORDINATION</span>
      </div>
      <div class="log-stream">
        <div v-for="(log, index) in taskLogs" :key="index" class="log-line">
          <span class="time">[{{ log.time }}]</span>
          <span class="sn">{{ log.sn }}</span>
          <span class="action">{{ log.action }}</span>
          <span class="status" :class="log.status">{{ log.statusText }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import { Cpu, List, VideoPlay, Timer, Operation } from '@element-plus/icons-vue'
import request from '../utils/request'

const trendChartRef = ref(null)
const healthChartRef = ref(null)
let trendChart = null
let healthChart = null

const trendTimeRange = ref('24h')
const deviceStats = reactive({ onlineCount: 0, totalCount: 0, totalHashrate: 0 })

const kpis = ref([
  { label: '在线调度节点', value: '0', unit: 'Nodes', icon: Cpu, type: 'primary', trend: 12.5 },
  { label: '累计处理切片', value: '0', unit: 'Tasks', icon: List, type: 'success', trend: 8.2 },
  { label: '平均响应延迟', value: '0', unit: 'ms', icon: Timer, type: 'warning', trend: -4.1 },
  { label: '全网并发算力', value: '0', unit: 'H/s', icon: VideoPlay, type: 'indigo', trend: 0.1 }
])

const taskLogs = ref([])

const formatDateToTime = (dateStr) => {
  if (!dateStr) return '-'
  return dateStr.substring(11, 19) // Extract HH:mm:ss
}

const initCharts = () => {
  // 1. 趋势图：科技感折线 (Keep the configuration, will update data later)
  trendChart = echarts.init(trendChartRef.value)
  trendChart.setOption({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', axisPointer: { type: 'cross' }},
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: [],
      axisLine: { lineStyle: { color: '#ffffff20' } },
      axisLabel: { color: '#ffffff60' }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#ffffff10' } },
      axisLabel: { color: '#ffffff60' }
    },
    series: [{
      name: '产出速率',
      type: 'line',
      smooth: true,
      data: [],
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#1890ff40' },
          { offset: 1, color: '#1890ff00' }
        ])
      },
      itemStyle: { color: '#1890ff' },
      lineStyle: { width: 3, shadowBlur: 10, shadowColor: '#1890ff' }
    }]
  })

  // 2. 健康度：环形图
  healthChart = echarts.init(healthChartRef.value)
  healthChart.setOption({
    series: [{
      type: 'pie',
      radius: ['60%', '80%'],
      avoidLabelOverlap: false,
      label: { show: false },
      data: []
    }]
  })
}

const fetchData = async () => {
  try {
    // 1. 获取设备统计
    const resStats = await request.get('/api/admin/sl/devices/stats')
    if (resStats.data.code === 200) {
      const d = resStats.data.data
      deviceStats.onlineCount = d.onlineCount
      deviceStats.totalCount = d.totalCount
      kpis.value[0].value = d.onlineCount
      kpis.value[3].value = d.totalHashrate || '-'
      
      healthChart.setOption({
        series: [{ data: [
          { value: d.onlineCount, name: '在线', itemStyle: { color: '#52c41a', shadowBlur: 15, shadowColor: '#52c41a' } },
          { value: d.totalCount - d.onlineCount, name: '离线', itemStyle: { color: '#ffffff10' } }
        ]}]
      })
    }

    // 2. 获取任务统计
    const resTasks = await request.get('/api/admin/device-tasks/statistics')
    if (resTasks.data.code === 200) {
      const d = resTasks.data.data
      kpis.value[1].value = d.totalTasks || 0
      kpis.value[2].value = d.avgLatency || 0
    }

    // 3. 获取最新任务动态 (真实数据)
    const resLatest = await request.get('/api/admin/device-tasks/latest', { params: { limit: 10 }})
    if (resLatest.data.code === 200) {
      taskLogs.value = resLatest.data.data.map(t => ({
        time: formatDateToTime(t.createTime),
        sn: t.deviceSn,
        action: t.prompt ? (t.prompt.length > 30 ? t.prompt.substring(0, 30) + '...' : t.prompt) : 'AI 推理切片执行',
        status: t.status === 'completed' ? 'success' : (t.status === 'running' ? 'info' : 'primary'),
        statusText: (t.status || 'PENDING').toUpperCase()
      }))
    }

    // 4. 获取趋势图
    const resTrend = await request.get('/api/admin/device-tasks/trend')
    if (resTrend.data.code === 200) {
      const d = resTrend.data.data
      trendChart.setOption({
        xAxis: { data: d.labels },
        series: [{ data: d.values }]
      })
    }
  } catch (e) {
    console.error('Fetch dashboard data failed', e)
  }
}

onMounted(() => {
  initCharts()
  fetchData()
  window.addEventListener('resize', () => {
    trendChart?.resize()
    healthChart?.resize()
  })
})

onUnmounted(() => {
  trendChart?.dispose()
  healthChart?.dispose()
})
</script>

<style scoped>
.overview-container {
  padding: 8px;
  background: transparent;
  color: #fff;
}

/* KPI 卡片科技感：背景渐变 + 玻璃拟态 */
.kpi-card {
  position: relative;
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  overflow: hidden;
  height: 140px;
}

/* 针对不同类型的卡片增加装饰线条 */
.kpi-card.primary { border-top: 4px solid #1890ff; }
.kpi-card.success { border-top: 4px solid #67c23a; }
.kpi-card.warning { border-top: 4px solid #e6a23c; }
.kpi-card.indigo { border-top: 4px solid #722ed1; }

.kpi-value .num { font-size: 36px; font-weight: 800; color: #1890ff; font-family: 'Consolas', 'Monaco', 'Courier New', monospace; text-shadow: 0 0 10px rgba(24, 144, 255, 0.3); }
.kpi-value .unit { font-size: 14px; color: #8c8c8c; margin-left: 8px; }
.kpi-footer { margin-top: 12px; font-size: 12px; color: #8c8c8c; }
.kpi-footer .trend.up { color: #52c41a; }
.kpi-footer .trend.down { color: #f5222d; }
.kpi-icon { position: absolute; right: -5px; bottom: -5px; font-size: 64px; color: #1890ff08; transform: rotate(-10deg); }

/* 暗色面板：适合图表展示 */
.dark-panel {
  background: #001529; 
  border-radius: 12px;
  padding: 24px;
  border: 1px solid #ffffff15;
  box-shadow: 0 8px 24px rgba(0,0,0,0.2);
  background-image: radial-gradient(circle at 2px 2px, rgba(255,255,255,0.02) 1px, transparent 0);
  background-size: 24px 24px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.panel-header .title { font-weight: bold; font-size: 17px; color: #fff; letter-spacing: 1px; display: flex; align-items: center; gap: 8px; }

.echart-box { height: 350px; width: 100%; }
.echart-box.circle { height: 260px; }

.health-stats {
  display: flex;
  justify-content: space-around;
  margin-top: 10px;
}
.stat-item { display: flex; flex-direction: column; align-items: center; gap: 4px; font-size: 14px; color: #ffffffa6; }
.stat-item .dot { width: 12px; height: 12px; border-radius: 50%; margin-bottom: 4px; }
.dot.online { background: #52c41a; box-shadow: 0 0 10px #52c41a; }
.dot.offline { background: #ffffff20; }

/* 实时流水监控 */
.log-stream {
  height: 200px;
  overflow-y: auto;
  background: rgba(0, 10, 18, 0.8);
  padding: 16px;
  border-radius: 8px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  border: 1px solid #1890ff30;
}
.log-line { margin-bottom: 6px; display: flex; gap: 12px; border-bottom: 1px solid #ffffff05; padding-bottom: 4px; }
.log-line .time { color: rgba(255,255,255,0.4); }
.log-line .sn { color: #00e5ff; font-weight: bold; }
.log-line .action { color: #ffffffd9; flex: 1; }
.log-line .status { font-weight: bold; padding: 0 4px; border-radius: 2px; font-size: 10px; }
.log-line .status.success { background: #52c41a20; color: #52c41a; }
.log-line .status.info { background: #1890ff20; color: #1890ff; }
.log-line .status.primary { background: #722ed120; color: #722ed1; }

.status-tag { font-size: 11px; background: #52c41a20; color: #52c41a; padding: 2px 10px; border-radius: 20px; border: 1px solid #52c41a40; font-weight: bold; }
</style>
