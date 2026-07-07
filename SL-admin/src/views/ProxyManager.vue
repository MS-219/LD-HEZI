<template>
  <div class="proxy-page">
    <el-row :gutter="20" class="stat-grid">
      <el-col :span="6">
        <div class="pro-card primary">
          <div class="card-label">独立出口 IP</div>
          <div class="card-val">{{ stats.totalIps || 0 }} <small>IPs</small></div>
          <el-icon class="card-icon"><Connection /></el-icon>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="pro-card success">
          <div class="card-label">可分配 IP</div>
          <div class="card-val">{{ stats.availableIps || 0 }} <small>Ready</small></div>
          <el-icon class="card-icon"><CircleCheck /></el-icon>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="pro-card warning">
          <div class="card-label">使用中 IP</div>
          <div class="card-val">{{ stats.allocatedIps || 0 }} <small>Used</small></div>
          <el-icon class="card-icon"><Link /></el-icon>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="pro-card indigo">
          <div class="card-label">覆盖设备数</div>
          <div class="card-val">{{ stats.totalDevices || 0 }} <small>Nodes</small></div>
          <el-icon class="card-icon"><Cpu /></el-icon>
        </div>
      </el-col>
    </el-row>

    <div class="summary-grid">
      <div class="summary-panel">
        <div class="panel-title">地区 IP 分布</div>
        <div class="province-list">
          <div v-for="item in topProvinces" :key="item.province" class="province-row">
            <span>{{ item.province }}</span>
            <div class="province-meter">
              <div :style="{ width: getProvinceWidth(item.totalIps) + '%' }"></div>
            </div>
            <b>{{ item.totalIps }}</b>
          </div>
        </div>
      </div>
      <div class="summary-panel">
        <div class="panel-title">运营商资源</div>
        <div class="carrier-list">
          <el-tag
            v-for="item in stats.carrierStats || []"
            :key="item.carrier"
            effect="plain"
            size="large"
          >
            {{ item.carrier }}：{{ item.availableIps }}/{{ item.totalIps }}
          </el-tag>
        </div>
      </div>
    </div>

    <div class="filter-bar">
      <el-input
        v-model="ipFilter"
        placeholder="搜索出口 IP"
        style="width: 220px"
        :prefix-icon="Search"
        clearable
        @keyup.enter="fetchList"
        @clear="fetchList"
      />
      <el-cascader
        v-model="locationFilter"
        :options="locationOptions"
        :props="{ checkStrictly: true, expandTrigger: 'hover' }"
        placeholder="选择地区"
        clearable
        style="width: 220px"
        @change="onFilterChange"
      />
      <el-select
        v-model="carrierFilter"
        placeholder="运营商"
        clearable
        style="width: 160px"
        @change="onFilterChange"
      >
        <el-option
          v-for="carrier in carrierOptions"
          :key="carrier"
          :label="carrier"
          :value="carrier"
        />
      </el-select>
      <el-select
        v-model="statusFilter"
        placeholder="资源状态"
        clearable
        style="width: 140px"
        @change="onFilterChange"
      >
        <el-option label="可用" :value="1" />
        <el-option label="使用中" :value="2" />
        <el-option label="离线" :value="0" />
        <el-option label="维护中" :value="3" />
      </el-select>
      <el-button type="primary" :icon="Refresh" @click="syncPool" :loading="syncing">同步设备 IP</el-button>
      <el-button type="success" :icon="Plus" @click="openBatchDialog">批量分配</el-button>
    </div>

    <div class="table-container">
      <el-table :data="proxies" border stripe v-loading="loading">
        <el-table-column label="状态" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" effect="plain">{{ statusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="出口 IP" width="170">
          <template #default="{ row }">
            <span class="mono strong">{{ row.proxyIp }}</span>
          </template>
        </el-table-column>
        <el-table-column label="地区/运营商" min-width="190">
          <template #default="{ row }">
            <div class="location-line">
              <el-icon><Location /></el-icon>
              <span>{{ row.location || '未知地区' }}</span>
            </div>
            <div class="muted">{{ row.carrier || '未知运营商' }}</div>
          </template>
        </el-table-column>
        <el-table-column label="同 IP 设备" width="120" align="right">
          <template #default="{ row }">
            <span class="device-count">{{ row.deviceCount || 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column label="代表节点" min-width="220">
          <template #default="{ row }">
            <div class="mono">{{ row.deviceSn || '-' }}</div>
            <div class="muted">本地协议 {{ row.protocol || 'socks5' }} / 端口 {{ row.proxyPort || '待建立' }}</div>
          </template>
        </el-table-column>
        <el-table-column label="分配信息" min-width="190">
          <template #default="{ row }">
            <div v-if="row.allocatedTo">
              <b>{{ row.merchantName || `商户 #${row.allocatedTo}` }}</b>
              <div class="muted">到期 {{ formatTime(row.expireAt) }}</div>
            </div>
            <span v-else class="muted">未分配</span>
          </template>
        </el-table-column>
        <el-table-column label="最后同步" width="170">
          <template #default="{ row }">
            <span class="muted">{{ formatTime(row.lastSyncTime) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right" align="center">
          <template #default="{ row }">
            <el-button
              type="primary"
              size="small"
              plain
              :disabled="row.status !== 1"
              @click="openSingleDialog(row)"
            >分配</el-button>
            <el-button
              type="warning"
              size="small"
              plain
              :disabled="row.status !== 2"
              @click="releaseProxy(row)"
            >释放</el-button>
            <el-dropdown trigger="click" @command="command => handleRowCommand(command, row)">
              <el-button size="small" plain :icon="MoreFilled" />
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="logs">查看日志</el-dropdown-item>
                  <el-dropdown-item command="startLink" :disabled="row.status === 0 || row.status === 3">启动链路</el-dropdown-item>
                  <el-dropdown-item command="stopLink" :disabled="row.status === 0">停止链路</el-dropdown-item>
                  <el-dropdown-item v-if="row.status !== 3" command="maintenance">设为维护</el-dropdown-item>
                  <el-dropdown-item v-if="row.status === 3" command="available">恢复可用</el-dropdown-item>
                  <el-dropdown-item command="tunnel">隧道端口</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="pageSize"
          :total="total"
          layout="total, prev, pager, next"
          @current-change="fetchList"
        />
      </div>
    </div>

    <el-dialog v-model="allocateVisible" :title="allocateTitle" width="520px" destroy-on-close>
      <el-form label-width="100px">
        <el-form-item label="目标商户">
          <el-select v-model="allocateForm.merchantId" placeholder="选择商户" filterable style="width: 100%">
            <el-option
              v-for="merchant in merchants"
              :key="merchant.id"
              :label="`${merchant.merchantName} (${merchant.appId})`"
              :value="merchant.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item v-if="allocateMode === 'batch'" label="分配数量">
          <el-input-number v-model="allocateForm.count" :min="1" :max="200" style="width: 180px" />
        </el-form-item>
        <el-form-item label="使用时长">
          <el-input-number v-model="allocateForm.durationHours" :min="1" :max="720" style="width: 180px" />
          <span class="form-unit">小时</span>
        </el-form-item>
        <el-form-item v-if="allocateMode === 'batch'" label="当前筛选">
          <div class="muted">
            {{ selectedLocationText || '不限地区' }} / {{ carrierFilter || '不限运营商' }}
          </div>
        </el-form-item>
        <el-form-item v-else label="出口 IP">
          <span class="mono strong">{{ currentProxy?.proxyIp }}</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="allocateVisible = false">取消</el-button>
        <el-button type="primary" :loading="allocating" @click="submitAllocate">确认分配</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="tunnelVisible" title="更新隧道端口" width="460px" destroy-on-close>
      <el-form label-width="100px">
        <el-form-item label="出口 IP">
          <span class="mono strong">{{ currentProxy?.proxyIp }}</span>
        </el-form-item>
        <el-form-item label="协议">
          <el-select v-model="tunnelForm.protocol" style="width: 180px">
            <el-option label="SOCKS5" value="socks5" />
            <el-option label="HTTP" value="http" />
          </el-select>
        </el-form-item>
        <el-form-item label="中心端口">
          <el-input-number v-model="tunnelForm.proxyPort" :min="0" :max="65535" style="width: 180px" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="tunnelVisible = false">取消</el-button>
        <el-button type="primary" :loading="tunnelSaving" @click="submitTunnel">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="logsVisible" title="代理操作日志" width="760px" destroy-on-close>
      <el-table :data="logs" border stripe v-loading="logsLoading">
        <el-table-column prop="action" label="动作" width="120">
          <template #default="{ row }">
            <el-tag effect="plain">{{ actionText(row.action) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="proxyIp" label="出口 IP" width="150" />
        <el-table-column label="商户" min-width="150">
          <template #default="{ row }">
            {{ row.merchantName || (row.merchantId ? `商户 #${row.merchantId}` : '-') }}
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="190" />
        <el-table-column label="时间" width="170">
          <template #default="{ row }">{{ formatTime(row.createTime) }}</template>
        </el-table-column>
      </el-table>
      <div class="pagination">
        <el-pagination
          v-model:current-page="logsPage"
          :page-size="logsSize"
          :total="logsTotal"
          layout="total, prev, pager, next"
          @current-change="fetchLogs"
        />
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import request from '../utils/request'
import { CircleCheck, Connection, Cpu, Link, Location, MoreFilled, Plus, Refresh, Search } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const loading = ref(false)
const syncing = ref(false)
const allocating = ref(false)
const proxies = ref([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const ipFilter = ref('')
const locationFilter = ref([])
const carrierFilter = ref('')
const statusFilter = ref('')
const locationOptions = ref([])
const carrierOptions = ref([])
const merchants = ref([])
const allocateVisible = ref(false)
const allocateMode = ref('single')
const currentProxy = ref(null)
const tunnelVisible = ref(false)
const tunnelSaving = ref(false)
const logsVisible = ref(false)
const logsLoading = ref(false)
const logs = ref([])
const logsTotal = ref(0)
const logsPage = ref(1)
const logsSize = ref(10)

const stats = reactive({
  totalIps: 0,
  availableIps: 0,
  allocatedIps: 0,
  offlineIps: 0,
  maintenanceIps: 0,
  totalDevices: 0,
  provinceStats: [],
  carrierStats: []
})

const allocateForm = reactive({
  merchantId: null,
  count: 1,
  durationHours: 24
})

const tunnelForm = reactive({
  protocol: 'socks5',
  proxyPort: 0
})

const topProvinces = computed(() => (stats.provinceStats || []).slice(0, 8))
const maxProvinceIps = computed(() => Math.max(...topProvinces.value.map(item => item.totalIps || 0), 1))
const allocateTitle = computed(() => allocateMode.value === 'batch' ? '批量分配代理 IP' : '分配代理 IP')
const selectedLocationText = computed(() => {
  if (!locationFilter.value || locationFilter.value.length === 0) return ''
  return locationFilter.value.join('')
})

const getProvinceParam = () => locationFilter.value?.[0] || undefined
const getCityParam = () => locationFilter.value?.[1] || undefined

const fetchStats = async () => {
  const res = await request.get('/api/admin/sl/proxy/stats')
  if (res.data.code === 200) {
    Object.assign(stats, res.data.data)
  }
}

const fetchOptions = async () => {
  const res = await request.get('/api/admin/sl/proxy/locations')
  if (res.data.code === 200) {
    const { provinces, provinceMap, carriers } = res.data.data
    locationOptions.value = (provinces || []).map(province => {
      const cities = provinceMap[province] || []
      return {
        value: province,
        label: province,
        children: cities.length > 0 ? cities.map(city => ({ value: city, label: city })) : undefined
      }
    })
    carrierOptions.value = carriers || []
  }
}

const fetchMerchants = async () => {
  const res = await request.get('/api/admin/sl/proxy/merchants')
  if (res.data.code === 200) {
    merchants.value = res.data.data || []
  }
}

const fetchList = async () => {
  loading.value = true
  try {
    const res = await request.get('/api/admin/sl/proxy/list', {
      params: {
        page: currentPage.value,
        size: pageSize.value,
        ip: ipFilter.value || undefined,
        province: getProvinceParam(),
        city: getCityParam(),
        carrier: carrierFilter.value || undefined,
        status: statusFilter.value === '' ? undefined : statusFilter.value
      }
    })
    if (res.data.code === 200) {
      proxies.value = res.data.data.records || []
      total.value = res.data.data.total || 0
    }
  } finally {
    loading.value = false
  }
}

const syncPool = async () => {
  syncing.value = true
  try {
    const res = await request.post('/api/admin/sl/proxy/sync')
    if (res.data.code === 200) {
      ElMessage.success(`同步完成：${res.data.data.uniqueIpCount || 0} 个独立 IP`)
      await Promise.all([fetchStats(), fetchOptions(), fetchList()])
    }
  } finally {
    syncing.value = false
  }
}

const onFilterChange = () => {
  currentPage.value = 1
  fetchList()
}

const openSingleDialog = (row) => {
  allocateMode.value = 'single'
  currentProxy.value = row
  allocateForm.count = 1
  allocateForm.durationHours = 24
  allocateVisible.value = true
}

const openBatchDialog = () => {
  allocateMode.value = 'batch'
  currentProxy.value = null
  allocateForm.count = 5
  allocateForm.durationHours = 24
  allocateVisible.value = true
}

const submitAllocate = async () => {
  if (!allocateForm.merchantId) {
    ElMessage.warning('请选择商户')
    return
  }
  allocating.value = true
  try {
    const payload = {
      merchantId: allocateForm.merchantId,
      durationMinutes: allocateForm.durationHours * 60
    }
    if (allocateMode.value === 'single') {
      payload.proxyId = currentProxy.value.id
    } else {
      payload.count = allocateForm.count
      payload.province = selectedLocationText.value || getProvinceParam()
      payload.carrier = carrierFilter.value || undefined
    }
    const res = await request.post('/api/admin/sl/proxy/allocate', payload)
    if (res.data.code === 200) {
      ElMessage.success(`已分配 ${res.data.data.length || 0} 个代理 IP`)
      allocateVisible.value = false
      await Promise.all([fetchStats(), fetchList()])
    } else {
      ElMessage.error(res.data.msg || '分配失败')
    }
  } finally {
    allocating.value = false
  }
}

const releaseProxy = async (row) => {
  try {
    await ElMessageBox.confirm(`确认释放 ${row.proxyIp}？`, '释放代理', {
      type: 'warning',
      confirmButtonText: '释放',
      cancelButtonText: '取消'
    })
  } catch (e) {
    return
  }
  const res = await request.post('/api/admin/sl/proxy/release', { proxyId: row.id })
  if (res.data.code === 200) {
    ElMessage.success('已释放')
    await Promise.all([fetchStats(), fetchList()])
  } else {
    ElMessage.error(res.data.msg || '释放失败')
  }
}

const handleRowCommand = async (command, row) => {
  if (command === 'logs') {
    openLogs(row)
    return
  }
  if (command === 'tunnel') {
    openTunnelDialog(row)
    return
  }
  if (command === 'startLink') {
    await startProxyLink(row)
    return
  }
  if (command === 'stopLink') {
    await stopProxyLink(row)
    return
  }
  if (command === 'maintenance') {
    await updateStatus(row, 3)
    return
  }
  if (command === 'available') {
    await updateStatus(row, 1)
  }
}

const updateStatus = async (row, status) => {
  const label = status === 3 ? '设为维护' : '恢复可用'
  try {
    await ElMessageBox.confirm(`确认将 ${row.proxyIp} ${label}？`, label, {
      type: 'warning',
      confirmButtonText: '确认',
      cancelButtonText: '取消'
    })
  } catch (e) {
    return
  }
  const res = await request.post('/api/admin/sl/proxy/status', {
    proxyId: row.id,
    status
  })
  if (res.data.code === 200) {
    ElMessage.success('状态已更新')
    await Promise.all([fetchStats(), fetchList()])
  } else {
    ElMessage.error(res.data.msg || '状态更新失败')
  }
}

const openTunnelDialog = (row) => {
  currentProxy.value = row
  tunnelForm.protocol = row.protocol || 'socks5'
  tunnelForm.proxyPort = row.proxyPort || 0
  tunnelVisible.value = true
}

const submitTunnel = async () => {
  if (!currentProxy.value) return
  tunnelSaving.value = true
  try {
    const res = await request.post('/api/admin/sl/proxy/tunnel', {
      proxyId: currentProxy.value.id,
      protocol: tunnelForm.protocol,
      proxyPort: tunnelForm.proxyPort
    })
    if (res.data.code === 200) {
      ElMessage.success('隧道信息已更新')
      tunnelVisible.value = false
      await fetchList()
    } else {
      ElMessage.error(res.data.msg || '保存失败')
    }
  } finally {
    tunnelSaving.value = false
  }
}

const startProxyLink = async (row) => {
  let remotePort = row.proxyPort || 0
  if (!remotePort) {
    try {
      const { value } = await ElMessageBox.prompt('请输入中心服务器映射端口', `启动 ${row.proxyIp}`, {
        inputPattern: /^[1-9]\d{1,4}$/,
        inputErrorMessage: '请输入 1-65535 的端口',
        confirmButtonText: '启动',
        cancelButtonText: '取消'
      })
      remotePort = Number(value)
    } catch (e) {
      return
    }
  } else {
    try {
      await ElMessageBox.confirm(`确认启动 ${row.proxyIp} 的代理链路？中心端口 ${remotePort}`, '启动链路', {
        type: 'warning',
        confirmButtonText: '启动',
        cancelButtonText: '取消'
      })
    } catch (e) {
      return
    }
  }

  if (remotePort <= 0 || remotePort > 65535) {
    ElMessage.warning('端口范围必须在 1-65535')
    return
  }

  const res = await request.post('/api/admin/sl/proxy/start-link', {
    proxyId: row.id,
    localPort: 1080,
    remotePort
  })
  if (res.data.code === 200) {
    ElMessage.success('代理链路启动指令已下发')
    await Promise.all([fetchStats(), fetchList()])
  } else {
    ElMessage.error(res.data.msg || '启动失败')
  }
}

const stopProxyLink = async (row) => {
  try {
    await ElMessageBox.confirm(`确认停止 ${row.proxyIp} 的代理链路？`, '停止链路', {
      type: 'warning',
      confirmButtonText: '停止',
      cancelButtonText: '取消'
    })
  } catch (e) {
    return
  }
  const res = await request.post('/api/admin/sl/proxy/stop-link', { proxyId: row.id })
  if (res.data.code === 200) {
    ElMessage.success('代理链路停止指令已下发')
  } else {
    ElMessage.error(res.data.msg || '停止失败')
  }
}

const openLogs = (row) => {
  currentProxy.value = row
  logsPage.value = 1
  logsVisible.value = true
  fetchLogs()
}

const fetchLogs = async () => {
  if (!currentProxy.value) return
  logsLoading.value = true
  try {
    const res = await request.get('/api/admin/sl/proxy/logs', {
      params: {
        page: logsPage.value,
        size: logsSize.value,
        proxyId: currentProxy.value.id
      }
    })
    if (res.data.code === 200) {
      logs.value = res.data.data.records || []
      logsTotal.value = res.data.data.total || 0
    }
  } finally {
    logsLoading.value = false
  }
}

const getProvinceWidth = (totalIps) => Math.round(((totalIps || 0) / maxProvinceIps.value) * 100)
const formatTime = (time) => time ? time.replace('T', ' ').substring(0, 19) : '-'
const statusText = (status) => ({ 0: '离线', 1: '可用', 2: '使用中', 3: '维护中' }[status] || '未知')
const statusType = (status) => ({ 0: 'danger', 1: 'success', 2: 'warning', 3: 'info' }[status] || 'info')
const actionText = (action) => ({
  allocate: '分配',
  release: '释放',
  expire: '到期',
  offline: '离线',
  maintenance: '维护',
  status: '状态',
  tunnel: '隧道',
  start_link: '启动链路',
  stop_link: '停止链路'
}[action] || action || '-')

onMounted(async () => {
  await Promise.all([fetchStats(), fetchOptions(), fetchMerchants(), fetchList()])
})
</script>

<style scoped>
.proxy-page {
  width: 100%;
}

.stat-grid {
  margin-bottom: 20px;
}

.pro-card {
  height: 120px;
  background: white;
  border-radius: 12px;
  padding: 20px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}

.card-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 8px;
}

.card-val {
  font-size: 32px;
  font-weight: 800;
  color: #303133;
}

.card-val small {
  font-size: 14px;
  color: #999;
  margin-left: 4px;
}

.card-icon {
  position: absolute;
  right: 20px;
  bottom: 20px;
  font-size: 48px;
  opacity: 0.1;
}

.primary { border-left: 4px solid #1890ff; }
.success { border-left: 4px solid #52c41a; }
.warning { border-left: 4px solid #faad14; }
.indigo { border-left: 4px solid #722ed1; }

.summary-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(320px, 0.8fr);
  gap: 20px;
  margin-bottom: 20px;
}

.summary-panel,
.filter-bar,
.table-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}

.summary-panel {
  padding: 20px;
}

.panel-title {
  color: #303133;
  font-weight: 700;
  margin-bottom: 14px;
}

.province-list {
  display: grid;
  gap: 10px;
}

.province-row {
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr) 42px;
  gap: 12px;
  align-items: center;
  color: #606266;
  font-size: 13px;
}

.province-row b {
  text-align: right;
  color: #303133;
}

.province-meter {
  height: 8px;
  background: #edf2f7;
  border-radius: 8px;
  overflow: hidden;
}

.province-meter div {
  height: 100%;
  background: #1890ff;
}

.carrier-list {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.filter-bar {
  padding: 20px;
  margin-bottom: 20px;
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
}

.table-container {
  padding: 24px;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
}

.strong {
  font-weight: 800;
  color: #303133;
}

.muted {
  color: #909399;
  font-size: 12px;
  margin-top: 4px;
}

.location-line {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #303133;
}

.device-count {
  color: #1890ff;
  font-size: 18px;
  font-weight: 800;
}

.pagination {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
}

.form-unit {
  margin-left: 10px;
  color: #909399;
}

@media (max-width: 1100px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
