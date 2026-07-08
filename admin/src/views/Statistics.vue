<template>
  <div class="statistics-page">
    <!-- 顶部指挥舱横幅：日期 + 四项核心指标 -->
    <div class="hero-band">
      <div class="hero-left">
        <div class="hero-caption">GLOBAL CLOUD · OVERVIEW</div>
        <div class="hero-title">运营总览</div>
        <div class="hero-date">{{ todayText }}</div>
      </div>
      <div class="hero-metrics">
        <div class="metric" v-for="item in statCards" :key="item.label">
          <div class="metric-label">{{ item.label }}</div>
          <div class="metric-value">{{ item.value }}</div>
          <div class="metric-sub">{{ item.subtext }}</div>
        </div>
      </div>
    </div>

    <!-- 图表区 -->
    <div class="panel-row">
      <div class="panel trend-panel">
        <div class="panel-head">
          <span class="panel-title">数据趋势 · 近 14 日</span>
          <el-radio-group v-model="trendType" size="small" @change="updateTrendChart">
            <el-radio-button label="earnings">收益</el-radio-button>
            <el-radio-button label="users">用户</el-radio-button>
            <el-radio-button label="devices">设备</el-radio-button>
          </el-radio-group>
        </div>
        <div ref="trendChartRef" class="chart-container"></div>
      </div>

      <div class="panel dist-panel">
        <div class="panel-head">
          <span class="panel-title">设备状态</span>
        </div>
        <div ref="distChartRef" class="dist-chart"></div>
        <ul class="dist-list">
          <li>
            <span class="dot online"></span>在线
            <b>{{ stats.device?.online || 0 }}</b>
          </li>
          <li>
            <span class="dot offline"></span>离线
            <b>{{ stats.device?.offline || 0 }}</b>
          </li>
          <li>
            <span class="dot unbound"></span>未绑定
            <b>{{ unboundCount }}</b>
          </li>
        </ul>
      </div>
    </div>

    <!-- 运营入口 + 服务状态 -->
    <div class="panel-row">
      <div class="panel nav-panel">
        <div class="panel-head">
          <span class="panel-title">运营入口</span>
        </div>
        <div class="nav-list">
          <div class="nav-item" @click="$router.push('/user')">
            <div class="nav-text">
              <div class="nav-name">用户管理</div>
              <div class="nav-desc">账户资料 · 余额与等级</div>
            </div>
            <span class="nav-arrow">→</span>
          </div>
          <div class="nav-item" @click="$router.push('/device')">
            <div class="nav-text">
              <div class="nav-name">设备管理</div>
              <div class="nav-desc">节点监控 · 绑定与指令</div>
            </div>
            <span class="nav-arrow">→</span>
          </div>
          <div class="nav-item" @click="$router.push('/withdraw')">
            <div class="nav-text">
              <div class="nav-name">提现审核</div>
              <div class="nav-desc">打款处理 · 审核记录</div>
            </div>
            <span class="nav-arrow">→</span>
          </div>
          <div class="nav-item" @click="$router.push('/earnings')">
            <div class="nav-text">
              <div class="nav-name">收益管理</div>
              <div class="nav-desc">结算流水 · 收益审计</div>
            </div>
            <span class="nav-arrow">→</span>
          </div>
          <div class="nav-item" @click="$router.push('/settings')">
            <div class="nav-text">
              <div class="nav-name">系统设置</div>
              <div class="nav-desc">参数配置 · 客服信息</div>
            </div>
            <span class="nav-arrow">→</span>
          </div>
        </div>
      </div>

      <div class="panel status-panel">
        <div class="panel-head">
          <span class="panel-title">服务状态</span>
        </div>
        <div class="status-body">
          <div class="status-line">
            <span class="k">后台服务</span>
            <span class="v" :class="backendOnline ? 'ok' : 'bad'">
              {{ backendOnline ? '● RUNNING' : '● STOPPED' }}
            </span>
          </div>
          <div class="status-line">
            <span class="k">上次同步</span>
            <span class="v">{{ lastUpdate }}</span>
          </div>
          <el-button class="sync-btn" :loading="loading" @click="initData">
            同步最新数据
          </el-button>
        </div>
      </div>
    </div>
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

const todayText = new Date().toLocaleDateString('zh-CN', {
  year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
})

const unboundCount = computed(() => {
  const device = stats.value.device || {}
  return Math.max((device.total || 0) - (device.bound || 0), 0)
})

const statCards = computed(() => [
  {
    label: '设备总数',
    value: stats.value.device?.total || 0,
    subtext: `${stats.value.device?.online || 0} 台在线`
  },
  {
    label: '注册用户',
    value: stats.value.user?.total || 0,
    subtext: `今日新增 ${stats.value.user?.today || 0}`
  },
  {
    label: '累计收益',
    value: `${stats.value.earnings?.total || '0.00'} U`,
    subtext: `昨日 ${stats.value.earnings?.yesterday || '0.00'} U`
  },
  {
    label: '总算力值',
    value: stats.value.hashrate?.total || 0,
    subtext: '全网累计'
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
    earnings: { name: '收益 (U)', data: trendData.value.earnings },
    users: { name: '新增用户', data: trendData.value.users },
    devices: { name: '新增设备', data: trendData.value.devices }
  }

  const current = typeMap[trendType.value]
  const color = '#0e7bd4'

  const option = {
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', top: 24, bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: trendData.value.dates,
      axisLine: { lineStyle: { color: '#dbe4f0' } },
      axisLabel: { color: '#8296b3' }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { type: 'dashed', color: '#edf1f7' } },
      axisLabel: { color: '#8296b3' }
    },
    series: [{
      name: current.name,
      type: 'line',
      smooth: false,
      symbol: 'circle',
      symbolSize: 5,
      data: current.data,
      itemStyle: { color },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(14, 123, 212, 0.22)' },
          { offset: 1, color: 'rgba(34, 211, 238, 0)' }
        ])
      },
      lineStyle: { width: 2.5 }
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
  const online = device.online || 0
  const offline = device.offline || 0
  const unbound = unboundCount.value

  // 横向堆叠条：与母版的圆环图完全区分
  const option = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'none' } },
    grid: { left: 0, right: 0, top: 8, bottom: 0 },
    xAxis: { type: 'value', show: false },
    yAxis: { type: 'category', show: false, data: ['设备'] },
    series: [
      { name: '在线', type: 'bar', stack: 's', data: [online], itemStyle: { color: '#14b8a6', borderRadius: [6, 0, 0, 6] }, barWidth: 26 },
      { name: '离线', type: 'bar', stack: 's', data: [offline], itemStyle: { color: '#c3ceda' } },
      { name: '未绑定', type: 'bar', stack: 's', data: [unbound], itemStyle: { color: '#f59e0b', borderRadius: [0, 6, 6, 0] } }
    ]
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
  gap: 16px;
  padding-bottom: 60px;
}

/* ── 顶部指挥舱横幅 ─────────────────────── */
.hero-band {
  display: flex;
  align-items: stretch;
  gap: 40px;
  border-radius: 14px;
  padding: 26px 32px;
  color: #eaf6ff;
  background:
    radial-gradient(700px 300px at 105% -30%, rgba(34, 211, 238, 0.2), transparent 60%),
    linear-gradient(120deg, #0b1f4b 0%, #123a7c 70%, #0e2f68 100%);
}

.hero-left {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding-right: 40px;
  border-right: 1px solid rgba(122, 190, 255, 0.18);
}

.hero-caption {
  font-family: 'SF Mono', 'Consolas', monospace;
  font-size: 10px;
  letter-spacing: 3px;
  color: rgba(148, 208, 255, 0.55);
  margin-bottom: 6px;
}

.hero-title {
  font-size: 24px;
  font-weight: 800;
  letter-spacing: 2px;
}

.hero-date {
  margin-top: 6px;
  font-size: 12px;
  color: rgba(214, 236, 255, 0.6);
}

.hero-metrics {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
  align-items: center;
}

.metric-label {
  font-size: 13px;
  color: rgba(174, 216, 255, 0.7);
  margin-bottom: 6px;
}

.metric-value {
  font-size: 30px;
  font-weight: 800;
  letter-spacing: -0.5px;
  color: #ffffff;
  font-variant-numeric: tabular-nums;
}

.metric-sub {
  margin-top: 6px;
  font-size: 12px;
  color: #4dd6f0;
}

/* ── 面板通用 ───────────────────────────── */
.panel-row {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 16px;
}

.panel {
  background: #ffffff;
  border: 1px solid #e3e9f2;
  border-radius: 14px;
  padding: 20px 22px;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.panel-title {
  font-size: 15px;
  font-weight: 700;
  color: #12294f;
  padding-left: 10px;
  border-left: 3px solid #22d3ee;
  line-height: 1.2;
}

/* 趋势图 */
.chart-container {
  height: 320px;
  width: 100%;
}

/* 设备状态 */
.dist-chart {
  height: 70px;
  width: 100%;
}

.dist-list {
  list-style: none;
  padding: 0;
  margin: 10px 0 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dist-list li {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: #51637f;
  padding: 10px 14px;
  background: #f7fafd;
  border-radius: 8px;
}

.dist-list b {
  margin-left: auto;
  color: #12294f;
  font-size: 15px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 3px;
}

.dot.online { background: #14b8a6; }
.dot.offline { background: #c3ceda; }
.dot.unbound { background: #f59e0b; }

/* 运营入口：清单式 */
.nav-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.nav-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border: 1px solid #e3e9f2;
  border-radius: 10px;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
}

.nav-item:hover {
  border-color: #0e7bd4;
  background: #f4faff;
}

.nav-name {
  font-size: 14px;
  font-weight: 700;
  color: #12294f;
}

.nav-desc {
  margin-top: 3px;
  font-size: 12px;
  color: #8296b3;
}

.nav-arrow {
  color: #0e7bd4;
  font-size: 16px;
}

/* 服务状态 */
.status-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.status-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  background: #f7fafd;
  border-radius: 8px;
  font-size: 14px;
}

.status-line .k { color: #51637f; }
.status-line .v { color: #12294f; font-weight: 700; font-variant-numeric: tabular-nums; }
.status-line .v.ok { color: #14b8a6; }
.status-line .v.bad { color: #ef4444; }

.sync-btn {
  margin-top: 6px;
  height: 42px;
  border-radius: 8px;
  font-weight: 700;
  border: none;
  color: #fff;
  background: linear-gradient(90deg, #123a7c 0%, #0e7bd4 100%);
}

.sync-btn:hover {
  opacity: 0.92;
  color: #fff;
}

/* 窄屏降级 */
@media (max-width: 1200px) {
  .hero-band { flex-direction: column; gap: 20px; }
  .hero-left { border-right: none; padding-right: 0; }
  .hero-metrics { grid-template-columns: repeat(2, 1fr); }
  .panel-row { grid-template-columns: 1fr; }
}
</style>
