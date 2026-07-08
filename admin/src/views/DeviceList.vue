<template>
  <div class="device-list-page">
    <!-- 工厂用户专用界面: 直接显示设备二维码 -->
    <div v-if="isFactoryUser" class="factory-qr-view">
      <div class="factory-qr-header">
        <div>
          <h2>设备二维码</h2>
          <p>仅显示未绑定设备二维码，可直接核对后打印。</p>
        </div>
        <div class="factory-actions">
          <el-button :loading="factoryQrLoading" @click="fetchFactoryQrCodes">刷新</el-button>
          <el-button type="primary" :disabled="factoryDevices.length === 0" @click="exportQrCodes">
            打印二维码
          </el-button>
        </div>
      </div>

      <div class="factory-summary">
        <div class="summary-card">
          <span>可打印设备</span>
          <strong>{{ factoryDevices.length }}</strong>
        </div>
        <div class="summary-card unbound">
          <span>未绑定</span>
          <strong>{{ factoryDevices.length }}</strong>
        </div>
      </div>

      <el-alert
        v-if="factoryQrError"
        :title="factoryQrError"
        type="error"
        show-icon
        :closable="false"
        class="factory-alert"
      />

      <div v-if="factoryQrLoading" class="factory-loading">
        <el-skeleton :rows="6" animated />
      </div>
      <el-empty v-else-if="factoryDevices.length === 0" description="暂无未绑定设备二维码" />
      <template v-else>
        <div class="qr-section">
          <div class="section-heading">
            <h3>未绑定设备</h3>
            <span>{{ factoryDevices.length }} 台</span>
          </div>
          <div class="inline-qr-grid">
            <div
              v-for="device in factoryDevices"
              :key="getQrCardKey(device)"
              class="inline-qr-card unbound"
            >
              <img v-if="factoryQrCache[getQrCardKey(device)]" :src="factoryQrCache[getQrCardKey(device)]" alt="设备二维码" />
              <div v-else class="qr-placeholder">生成中</div>
              <div class="qr-code-text">{{ getDisplayCode(device) }}</div>
              <div class="qr-sn-text">SN: {{ device.sn }}</div>
              <el-tag type="warning" size="small">未绑定</el-tag>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- 管理员界面: 完整功能 -->
    <template v-else>
      <!-- 搜索栏 -->
      <el-card class="search-card">
        <el-row :gutter="12" align="middle">
          <el-col :span="4">
            <el-input 
              v-model="searchSn" 
              placeholder="搜索设备SN" 
              prefix-icon="Search"
              clearable
              @clear="handleSearch"
              @keyup.enter="handleSearch"
            />
          </el-col>
          <el-col :span="3">
            <el-select v-model="statusFilter" placeholder="状态筛选" clearable @change="handleSearch" style="width: 100%;">
              <el-option label="全部" value="" />
              <el-option label="在线" :value="1" />
              <el-option label="离线" :value="0" />
              <el-option label="未绑定" value="unbound" />
            </el-select>
          </el-col>
          <el-col :span="3">
            <el-select v-model="typeFilter" placeholder="设备类型" clearable @change="handleSearch" style="width: 100%;">
              <el-option label="全部" value="" />
              <el-option label="自有设备" :value="0" />
              <el-option label="挂靠设备" :value="1" />
            </el-select>
          </el-col>
          <el-col :span="4">
            <el-button type="primary" @click="handleSearch">搜索</el-button>
            <el-button @click="resetSearch">重置</el-button>
          </el-col>
          <el-col :span="10" class="toolbar-actions">
            <span class="total-count" style="margin-right: 8px;">
              共 {{ total }} 台 | 
              <span class="real">自有 {{ realCount }}</span> |
              <span class="attached">挂靠 {{ attachedCount }}</span> |
              <span class="online">在线 {{ onlineCount }}</span> | 
              <span class="offline">离线 {{ offlineCount }}</span>
            </span>
            <el-button type="success" size="small" @click="showCreateDialog">新增挂靠设备</el-button>
            <el-button type="info" size="small" @click="showOfflineLogs">离线记录</el-button>
            <el-button type="primary" size="small" @click="refreshList" :loading="loading">刷新</el-button>
            <el-button type="warning" size="small" @click="exportSnList" :loading="exporting">导出CSV</el-button>
            <el-button size="small" @click="exportQrCodes">导出二维码</el-button>
          </el-col>
        </el-row>
      </el-card>

      <!-- 设备列表 (此处略去中间的 table 内容以节省传输量，实际应用中会保持不变) -->
      <!-- ... -->

    <!-- 离线记录弹窗 -->
    <el-dialog v-model="offlineLogVisible" title="设备离线记录" width="900px">
      <div style="margin-bottom: 15px; display: flex; gap: 10px;">
        <el-input v-model="offlineLogSearchSn" placeholder="搜索绑定码/SN码" style="width: 250px;" clearable @clear="fetchOfflineLogs" />
        <el-button type="primary" @click="fetchOfflineLogs">查询</el-button>
      </div>
      
      <el-table :data="offlineLogs" v-loading="offlineLogLoading" stripe>
        <el-table-column label="绑定码" width="200">
          <template #default="{ row }">
            <span style="font-weight: bold; color: #0b62aa;">{{ row.bindCode || row.sn }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="offlineTime" label="离线判定时间" width="180" />
        <el-table-column prop="lastHeartbeatTime" label="最后心跳时间" width="180" />
        <el-table-column prop="reason" label="离线原因" />
        <el-table-column prop="createTime" label="记录生成时间" width="180" />
      </el-table>

      <div class="pagination-wrapper" style="margin-top: 15px; display: flex; justify-content: flex-end;">
        <el-pagination
          v-model:current-page="offlineLogPage"
          v-model:page-size="offlineLogSize"
          :total="offlineLogTotal"
          layout="total, prev, pager, next"
          @current-change="fetchOfflineLogs"
        />
      </div>
    </el-dialog>

      <!-- 设备列表 -->
      <el-card class="table-card">
        <div class="batch-toolbar">
          <div class="batch-info">
            已选 <strong>{{ selectedDevices.length }}</strong> 台设备
          </div>
          <div class="batch-actions">
            <el-dropdown
              trigger="click"
              :disabled="selectedDevices.length === 0"
              @command="handleBatchCommand"
            >
              <el-button type="primary" size="small" :disabled="selectedDevices.length === 0">
                批量管理
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="unbind">批量解绑</el-dropdown-item>
                  <el-dropdown-item command="delete" divided>批量删除</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <el-button
              v-if="selectedDevices.length > 0"
              size="small"
              plain
              @click="clearDeviceSelection"
            >
              清空选择
            </el-button>
          </div>
        </div>
        <el-table
          ref="deviceTableRef"
          :data="deviceList"
          v-loading="loading"
          row-key="id"
          stripe
          @selection-change="handleDeviceSelectionChange"
        >
          <el-table-column type="selection" width="48" />
          <el-table-column prop="id" label="ID" width="70" />
          <el-table-column prop="sn" label="设备绑定码" width="220">
            <template #default="{ row }">
              <div class="sn-cell">
                <span class="sn-text">
                  {{ row.bindCode || row.sn }}
                </span>
                <el-button size="small" type="success" plain @click="copySn(row.bindCode || row.sn)">复制</el-button>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="150">
            <template #default="{ row }">
              <el-tag :type="row.status === 1 ? 'success' : 'info'" effect="dark" round>
                {{ row.status === 1 ? '在线' : '离线' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="设备类型" width="105">
            <template #default="{ row }">
              <el-tag :type="row.type === 1 ? 'warning' : 'info'" size="small">
                {{ getDeviceTypeText(row.type) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="归属主体" width="190">
            <template #default="{ row }">
              <div class="user-info-cell" v-if="row.userId">
                <el-avatar :size="28" :src="row.avatarUrl || 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'" />
                <div class="user-detail">
                  <div class="user-name">{{ row.nickname || '未知用户' }}</div>
                  <div class="user-id">ID: {{ row.userId }}</div>
                </div>
              </div>
              <el-button v-else size="small" type="primary" plain @click="showBindUserDialog(row)">绑定用户</el-button>
            </template>
          </el-table-column>
          <el-table-column prop="hashrate" label="算力值" width="100">
            <template #default="{ row }">
              <span class="hashrate">⚡ {{ row.hashrate || 0 }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="location" label="位置" min-width="120">
            <template #default="{ row }">
              <span>{{ row.location || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="lastHeartbeatTime" label="最后心跳" width="170" />
          <el-table-column label="操作" width="340" fixed="right">
            <template #default="{ row }">
              <el-button size="small" @click="viewDevice(row)">详情</el-button>
              <el-button size="small" type="primary" plain @click="openTerminal(row)">远程终端</el-button>
              <el-button size="small" type="primary" @click="editDevice(row)">编辑</el-button>
              <el-button size="small" type="danger" v-if="row.userId" @click="unbindDevice(row)">解绑</el-button>
              <el-button size="small" type="danger" v-if="!row.userId" @click="deleteDevice(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div class="pagination-wrapper">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :total="total"
            :page-sizes="[10, 20, 50, 100]"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="fetchDevices"
            @current-change="fetchDevices"
          />
        </div>
      </el-card>
    </template>

    <!-- 设备详情弹窗 -->
    <el-dialog v-model="detailVisible" title="" width="850px" @opened="initChart" class="device-detail-dialog">
      <template #header>
        <div class="detail-header">
          <div class="header-left">
            <span class="header-icon">📱</span>
            <div class="header-info">
              <h3>设备详情</h3>
              <span class="header-sn">{{ currentDevice?.bindCode || currentDevice?.sn }}</span>
            </div>
          </div>
          <el-tag :type="currentDevice?.status === 1 ? 'success' : 'danger'" size="large" effect="dark" round>
            {{ currentDevice?.status === 1 ? '🟢 在线' : '🔴 离线' }}
          </el-tag>
        </div>
      </template>
      
      <div class="detail-content" v-if="currentDevice">
        <!-- 核心信息卡片 -->
        <div class="info-cards">
          <div class="info-card primary">
            <div class="card-icon">⚡</div>
            <div class="card-data">
              <span class="card-value">{{ currentDevice.hashrate || 0 }}</span>
              <span class="card-label">算力值</span>
            </div>
          </div>
          <div class="info-card">
            <div class="card-icon">👤</div>
            <div class="card-data">
              <span class="card-value">{{ currentDevice.userId || '未绑定' }}</span>
              <span class="card-label">绑定用户ID</span>
            </div>
          </div>
          <div class="info-card">
            <div class="card-icon">📍</div>
            <div class="card-data">
              <span class="card-value">{{ currentDevice.location || '-' }}</span>
              <span class="card-label">设备位置</span>
            </div>
          </div>
          <div class="info-card">
            <div class="card-icon">📶</div>
            <div class="card-data">
              <span class="card-value">{{ currentDevice.carrier || '-' }}</span>
              <span class="card-label">运营商</span>
            </div>
          </div>
        </div>
        
        <!-- 详细信息表格 -->
        <div class="detail-section">
          <h4>📋 设备信息</h4>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="设备ID">{{ currentDevice.id }}</el-descriptions-item>
            <el-descriptions-item label="设备SN">
              <span class="sn-value">{{ currentDevice.sn }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="设备类型">{{ getDeviceTypeText(currentDevice.type) }}</el-descriptions-item>
            <el-descriptions-item label="业务号">{{ currentDevice.businessId || '-' }}</el-descriptions-item>
            <el-descriptions-item label="备注名">{{ currentDevice.name || '-' }}</el-descriptions-item>
            <el-descriptions-item label="最后心跳">
              <span class="time-value">{{ currentDevice.lastHeartbeatTime || '-' }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="绑定时间">{{ currentDevice.bindTime || '-' }}</el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ currentDevice.createTime || '-' }}</el-descriptions-item>
          </el-descriptions>
        </div>

        <!-- 收益图表 -->
        <div class="chart-section">
          <h4>📈 近7天收益趋势</h4>
          <div id="deviceChart" class="chart-container"></div>
        </div>
      </div>
    </el-dialog>

    <!-- 编辑弹窗 -->
    <el-dialog v-model="editVisible" title="编辑设备" width="500px">
      <el-form :model="editForm" label-width="80px">
        <el-form-item label="备注名">
          <el-input v-model="editForm.name" placeholder="输入设备备注名" />
        </el-form-item>
        <el-form-item label="位置">
          <el-input v-model="editForm.location" placeholder="输入设备位置" />
        </el-form-item>
        <el-form-item label="运营商">
          <el-select v-model="editForm.carrier" placeholder="选择运营商">
            <el-option label="移动" value="移动" />
            <el-option label="联通" value="联通" />
            <el-option label="电信" value="电信" />
          </el-select>
        </el-form-item>
        <el-form-item label="设备类型">
          <el-select v-model="editForm.type" placeholder="选择设备类型" style="width: 100%;">
            <el-option label="自有设备" :value="0" />
            <el-option label="挂靠设备" :value="1" />
          </el-select>
        </el-form-item>
        <el-form-item label="算力值">
          <el-input-number v-model="editForm.hashrate" :min="0" :max="10000" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" @click="saveDevice" :loading="saving">保存</el-button>
      </template>
    </el-dialog>

    <!-- 新增设备弹窗 -->
    <el-dialog v-model="createVisible" title="新增挂靠设备" width="500px">
      <el-tabs v-model="createMode">
        <el-tab-pane label="单个新增" name="single">
          <el-form :model="createForm" label-width="100px">
            <el-form-item label="设备备注名">
              <el-input v-model="createForm.name" placeholder="可选，输入设备备注名" />
            </el-form-item>
            <el-form-item label="设备位置">
              <el-input v-model="createForm.location" placeholder="可选，输入设备位置" />
            </el-form-item>
            <el-form-item label="运营商">
              <el-select v-model="createForm.carrier" placeholder="可选，选择运营商">
                <el-option label="移动" value="移动" />
                <el-option label="联通" value="联通" />
                <el-option label="电信" value="电信" />
              </el-select>
            </el-form-item>
            <el-form-item label="初始算力值">
              <el-input-number v-model="createForm.hashrate" :min="0" :max="10000" />
            </el-form-item>
          </el-form>
        </el-tab-pane>
        <el-tab-pane label="批量新增" name="batch">
          <el-form :model="batchForm" label-width="100px">
            <el-form-item label="新增数量">
              <el-input-number v-model="batchForm.count" :min="1" :max="100" />
            </el-form-item>
            <el-form-item label="设备位置">
              <el-input v-model="batchForm.location" placeholder="可选，输入统一位置" />
            </el-form-item>
            <el-form-item label="运营商">
              <el-select v-model="batchForm.carrier" placeholder="可选，选择运营商">
                <el-option label="移动" value="移动" />
                <el-option label="联通" value="联通" />
                <el-option label="电信" value="电信" />
              </el-select>
            </el-form-item>
            <el-form-item label="初始算力值">
              <el-input-number v-model="batchForm.hashrate" :min="0" :max="10000" />
            </el-form-item>
            <el-form-item label="绑定用户">
              <el-select 
                v-model="batchForm.userId" 
                placeholder="不选择则不绑定" 
                filterable 
                remote 
                clearable
                :remote-method="searchUsers"
                :loading="searchingUsers"
                style="width: 100%;"
              >
                <el-option 
                  v-for="user in userOptions" 
                  :key="user.id" 
                  :label="`${user.nickname || '用户'} (ID: ${user.id})`" 
                  :value="user.id" 
                />
              </el-select>
              <div style="font-size: 12px; color: #9ca3af; margin-top: 4px;">选择后设备将直接绑定到该用户</div>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" @click="handleCreate" :loading="creating">确认创建</el-button>
      </template>
    </el-dialog>

    <!-- 绑定用户弹窗 -->
    <el-dialog v-model="bindUserVisible" title="绑定用户" width="550px" @opened="loadInitialUsers">
      <el-form :model="bindUserForm" label-width="100px">
        <el-form-item label="当前设备">
          <span style="font-weight: bold; color: #0b62aa;">{{ bindUserForm.deviceSn }}</span>
        </el-form-item>
        <el-form-item label="选择用户" required>
          <el-select 
            v-model="bindUserForm.userId" 
            placeholder="输入昵称或ID搜索用户" 
            filterable 
            remote 
            :remote-method="searchUsersForBind"
            :loading="searchingUsersForBind"
            style="width: 100%;"
            clearable
          >
            <el-option 
              v-for="user in bindUserOptions" 
              :key="user.id" 
              :value="user.id"
            >
              <div style="display: flex; align-items: center; gap: 8px;">
                <el-avatar :size="24" :src="user.avatarUrl || 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'" />
                <span>{{ user.nickname || '用户' }}</span>
                <span style="color: #9ca3af; font-size: 12px;">ID: {{ user.id }}</span>
              </div>
            </el-option>
          </el-select>
          <div style="font-size: 12px; color: #9ca3af; margin-top: 4px;">支持按昵称或ID模糊搜索</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="bindUserVisible = false">取消</el-button>
        <el-button type="primary" @click="handleBindUser" :loading="bindingUser">确认绑定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'

// 检查是否是工厂用户（仅可查看二维码）
const isFactoryUser = computed(() => {
  return localStorage.getItem('userRole') === 'factory'
})

const deviceList = ref([])
const loading = ref(false)
const saving = ref(false)
const exporting = ref(false)
const factoryQrLoading = ref(false)
const factoryQrError = ref('')
const factoryDevices = ref([])
const factoryQrCache = ref({})
const searchSn = ref('')
const statusFilter = ref('')
const typeFilter = ref('')
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const deviceTableRef = ref(null)
const selectedDevices = ref([])

const detailVisible = ref(false)
const editVisible = ref(false)
const currentDevice = ref(null)
const editForm = reactive({
  id: null,
  name: '',
  location: '',
  carrier: '',
  type: 0,
  hashrate: 0
})

// 新增设备相关
const createVisible = ref(false)
const creating = ref(false)
const createMode = ref('single')
const createForm = reactive({
  name: '',
  hashrate: 100,
  carrier: '',
  location: ''
})
const batchForm = reactive({
  count: 10,
  hashrate: 100,
  userId: null,
  carrier: '',
  location: ''
})

// 用户搜索（创建设备用）
const userOptions = ref([])
const realCount = ref(0)
const attachedCount = ref(0)
const onlineCount = ref(0)
const offlineCount = ref(0)

const getDisplayCode = (device) => {
  if (!device) return ''
  return (device.bindCode || (device.sn ? device.sn.slice(-8) : '')).toUpperCase()
}

const getQrCardKey = (device) => {
  return device?.sn || device?.bindCode || `${device?.index || ''}`
}

const getDeviceTypeText = (type) => {
  return Number(type) === 1 ? '挂靠设备' : '自有设备'
}

const loadQRCodeScript = () => {
  if (window.qrcode) {
    return Promise.resolve()
  }

  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-qrcode-generator="true"]')
    if (existing) {
      existing.addEventListener('load', resolve, { once: true })
      existing.addEventListener('error', reject, { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js'
    script.async = true
    script.dataset.qrcodeGenerator = 'true'
    script.onload = resolve
    script.onerror = () => reject(new Error('二维码库加载失败'))
    document.head.appendChild(script)
  })
}

const generateQrDataUrl = (text) => {
  if (!text || !window.qrcode) return ''
  try {
    const qr = window.qrcode(0, 'M')
    qr.addData(text)
    qr.make()
    return qr.createDataURL(4, 0)
  } catch (e) {
    console.error('QR生成失败:', e)
    return ''
  }
}

const buildFactoryQrCache = async (devices) => {
  await loadQRCodeScript()
  const nextCache = {}
  devices.forEach(device => {
    nextCache[getQrCardKey(device)] = generateQrDataUrl(getDisplayCode(device))
  })
  factoryQrCache.value = nextCache
}

const fetchFactoryQrCodes = async () => {
  factoryQrLoading.value = true
  factoryQrError.value = ''
  try {
    const res = await axios.get('/api/device/export-sn', {
      params: {
        unboundOnly: true
      }
    })
    if (res.data.code !== 200) {
      factoryQrError.value = res.data.msg || '获取设备二维码失败'
      factoryDevices.value = []
      return
    }

    const devices = (res.data.data?.list || []).filter(device => device.bound !== '已绑定')
    factoryDevices.value = devices
    await buildFactoryQrCache(devices)
  } catch (e) {
    console.error(e)
    factoryQrError.value = '获取设备二维码失败'
    factoryDevices.value = []
  } finally {
    factoryQrLoading.value = false
  }
}

// 获取统计数据
const fetchStats = async () => {
  try {
    const res = await axios.get('/api/device/stats')
    if (res.data.code === 200) {
      const data = res.data.data
      realCount.value = data.real || 0
      attachedCount.value = data.virtual || 0
      onlineCount.value = data.online || 0
      offlineCount.value = data.offline || 0
    }
  } catch (e) {
    console.error(e)
  }
}

// 获取设备列表
const fetchDevices = async () => {
  if (isFactoryUser.value) {
    return
  }
  
  loading.value = true
  try {
    const params = {
      page: currentPage.value,
      size: pageSize.value,
      sn: searchSn.value || undefined, // 空字符串转 undefined
      status: statusFilter.value === '' ? undefined : statusFilter.value,
      type: typeFilter.value === '' ? undefined : typeFilter.value
    }
    
    // 处理“未绑定”特殊筛选
    if (statusFilter.value === 'unbound') {
      params.unbound = true
      params.status = undefined
    }

    console.log('Fetching devices with params:', params)
    const res = await axios.get('/api/device/all', { params })
    
    if (res.data.code === 200) {
      const data = res.data.data
      deviceList.value = data.records || []
      total.value = data.total || 0
      
      // 同时刷新统计
      fetchStats()
    } else {
      ElMessage.error(res.data.msg || '获取设备列表失败')
    }
  } catch (e) {
    console.error('Fetch devices error:', e)
    ElMessage.error('获取设备列表失败')
  } finally {
    loading.value = false
  }
}

// 离线日志相关
const offlineLogVisible = ref(false)
const offlineLogLoading = ref(false)
const offlineLogs = ref([])
const offlineLogTotal = ref(0)
const offlineLogPage = ref(1)
const offlineLogSize = ref(10)
const offlineLogSearchSn = ref('')

const showOfflineLogs = () => {
  offlineLogVisible.value = true
  offlineLogPage.value = 1
  fetchOfflineLogs()
}

const fetchOfflineLogs = async () => {
  offlineLogLoading.value = true
  try {
    const res = await axios.get('/api/admin/device-offline-log/list', {
      params: {
        page: offlineLogPage.value,
        size: offlineLogSize.value,
        sn: offlineLogSearchSn.value || undefined
      }
    })
    if (res.data.code === 200) {
      offlineLogs.value = res.data.data.records || []
      offlineLogTotal.value = res.data.data.total || 0
    }
  } catch (e) {
    console.error(e)
    ElMessage.error('获取离线记录失败')
  } finally {
    offlineLogLoading.value = false
  }
}

// 搜索与重置
const handleSearch = () => {
  currentPage.value = 1
  fetchDevices()
}

const resetSearch = () => {
  searchSn.value = ''
  statusFilter.value = ''
  typeFilter.value = ''
  handleSearch()
}

const refreshList = () => {
  fetchDevices()
}

const handleDeviceSelectionChange = (selection) => {
  selectedDevices.value = selection
}

const clearDeviceSelection = () => {
  deviceTableRef.value?.clearSelection()
  selectedDevices.value = []
}

const getDeviceCode = (device) => {
  return device?.bindCode || device?.sn || device?.id || ''
}

const handleBatchCommand = (command) => {
  if (command === 'unbind') {
    batchUnbindDevices()
    return
  }
  if (command === 'delete') {
    batchDeleteDevices()
  }
}

const batchUnbindDevices = async () => {
  const targets = selectedDevices.value.filter(device => device.userId)
  if (targets.length === 0) {
    ElMessage.warning('请选择已绑定用户的设备')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定批量解绑 ${targets.length} 台设备吗？解绑后会清除用户绑定和业务号。`,
      '批量解绑',
      {
        confirmButtonText: '确认解绑',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const res = await axios.post('/api/device/batch-unbind', {
      ids: targets.map(device => device.id)
    })
    if (res.data.code === 200) {
      ElMessage.success(res.data.data || '批量解绑成功')
      clearDeviceSelection()
      fetchDevices()
    } else {
      ElMessage.error(res.data.msg || '批量解绑失败')
    }
  } catch (e) {
    if (e !== 'cancel') ElMessage.error('操作失败')
  }
}

const batchDeleteDevices = async () => {
  const targets = selectedDevices.value.filter(device => !device.userId)
  if (targets.length === 0) {
    ElMessage.warning('请选择未绑定的设备')
    return
  }

  const preview = targets.slice(0, 3).map(getDeviceCode).join('、')
  const suffix = targets.length > 3 ? ` 等 ${targets.length} 台` : ''
  try {
    await ElMessageBox.confirm(
      `确定批量删除 ${preview}${suffix} 吗？删除后无法恢复。`,
      '批量删除',
      {
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const res = await axios.post('/api/device/batch-delete', {
      ids: targets.map(device => device.id)
    })
    if (res.data.code === 200) {
      ElMessage.success(res.data.data || '批量删除成功')
      clearDeviceSelection()
      fetchDevices()
    } else {
      ElMessage.error(res.data.msg || '批量删除失败')
    }
  } catch (e) {
    if (e !== 'cancel') ElMessage.error('操作失败')
  }
}

// 复制 SN
const copySn = (text) => {
  if (!text) return
  navigator.clipboard.writeText(text).then(() => {
    ElMessage.success('复制成功')
  }).catch(() => {
    ElMessage.error('复制失败，请手动复制')
  })
}

// 编辑设备
const editDevice = (row) => {
  editForm.id = row.id
  editForm.name = row.name
  editForm.location = row.location
  editForm.carrier = row.carrier
  editForm.type = row.type === 1 ? 1 : 0
  editForm.hashrate = row.hashrate
  editVisible.value = true
}

// 保存编辑
const saveDevice = async () => {
  saving.value = true
  try {
    const res = await axios.post('/api/device/update', editForm)
    if (res.data.code === 200) {
      ElMessage.success('保存成功')
      editVisible.value = false
      fetchDevices()
    } else {
      ElMessage.error(res.data.msg || '保存失败')
    }
  } catch (e) {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

// 查看详情
import * as echarts from 'echarts'
const viewDevice = (row) => {
  currentDevice.value = row
  detailVisible.value = true
}

// 打开远程终端
const openTerminal = (row) => {
  // 如果设备离线，提示无法连接
  if (row.status !== 1) {
    ElMessage.warning('设备当前不在线，无法打开终端')
    return
  }

  ElMessageBox.confirm(
    '如果该设备是第一次连接或 Agent 未运行，需要先下发“激活指令”。是否确认下发并打开终端？',
    '激活远程隧道',
    {
      confirmButtonText: '下发指令并打开',
      cancelButtonText: '直接尝试打开',
      distinguishCancelAndClose: true,
      type: 'info'
    }
  ).then(() => {
    const sn = row.sn || row.id
    console.log('正在激活并打开终端:', sn)
    // 1. 发送激活指令
    pushCommandToServer(row.id, `curl -sLO https://hz.shandongliandong.com/api/static/device-agent.py && python3 device-agent.py &`)
    
    // 2. 延时跳转，确保指令推送到位
    setTimeout(() => {
      const terminalUrl = `/terminal?sn=${sn}`
      console.log('执行跳转:', terminalUrl)
      window.location.assign(terminalUrl)
    }, 200)
  }).catch((action) => {
    if (action === 'cancel') {
      const sn = row.sn || row.id
      const terminalUrl = `/terminal?sn=${sn}`
      console.log('尝试直接打开终端:', terminalUrl)
      window.location.assign(terminalUrl)
    }
  })
}

// 私有方法：推送命令到后端
const pushCommandToServer = async (id, command) => {
  try {
    const res = await axios.post('/api/device/push-command', { id, command })
    if (res.data.code === 200) {
      ElMessage.success('激活指令已送达队列，请等待设备响应')
    } else {
      ElMessage.error('指令推送失败: ' + res.data.msg)
    }
  } catch (e) {
    ElMessage.error('后端连接失败')
  }
}

const initChart = async () => {
  if (!currentDevice.value) return
  
  await nextTick()
  const chartDom = document.getElementById('deviceChart')
  if (!chartDom) return
  
  const myChart = echarts.init(chartDom)
  myChart.showLoading()
  
  try {
    const res = await axios.get(`/api/device/chart-data/${currentDevice.value.id}`)
    if (res.data.code === 200) {
      const data = res.data.data
      const option = {
        title: { text: '近7天收益收益趋势' },
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: data.dates },
        yAxis: { type: 'value', name: '收益 (元)' },
        series: [{
          data: data.earnings,
          type: 'line',
          smooth: true,
          areaStyle: { opacity: 0.3 },
          itemStyle: { color: '#0b62aa' }
        }]
      }
      myChart.setOption(option)
    }
  } catch (e) {
    console.error(e)
  } finally {
    myChart.hideLoading()
  }
}

// 绑定用户相关
const bindUserVisible = ref(false)
const bindingUser = ref(false)
const searchingUsersForBind = ref(false)
const bindUserOptions = ref([]) // 确保定义
const bindUserForm = reactive({
  deviceId: null,
  deviceSn: '',
  userId: null
})

const showBindUserDialog = (row) => {
  bindUserForm.deviceId = row.id
  bindUserForm.deviceSn = row.sn
  bindUserForm.userId = null
  bindUserVisible.value = true
  bindUserOptions.value = [] //Reset options
}

const loadInitialUsers = () => {
  searchUsersForBind('')
}

const searchUsersForBind = async (query) => {
  searchingUsersForBind.value = true
  try {
    const res = await axios.get('/api/user/list', {
      params: {
        page: 1,
        size: 20,
        keyword: query
      }
    })
    if (res.data.code === 200) {
      bindUserOptions.value = res.data.data.records || []
    }
  } finally {
    searchingUsersForBind.value = false
  }
}

const handleBindUser = async () => {
  if (!bindUserForm.userId) {
    ElMessage.warning('请选择要绑定的用户')
    return
  }
  
  bindingUser.value = true
  try {
    const res = await axios.post('/api/device/admin-bind', {
      deviceId: bindUserForm.deviceId,
      userId: bindUserForm.userId
    })
    if (res.data.code === 200) {
      ElMessage.success('绑定成功')
      bindUserVisible.value = false
      fetchDevices()
    } else {
      ElMessage.error(res.data.msg || '绑定失败')
    }
  } catch (e) {
    ElMessage.error('绑定失败')
  } finally {
    bindingUser.value = false
  }
}

// 解绑设备
const unbindDevice = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要解绑设备 ${row.sn} 吗？`, '确认解绑', {
      type: 'warning'
    })
    
    const res = await axios.post('/api/device/unbind', { id: row.id })
    if (res.data.code === 200) {
      ElMessage.success('解绑成功')
      fetchDevices()
    } else {
      ElMessage.error(res.data.msg || '解绑失败')
    }
  } catch (e) {
    if (e !== 'cancel') ElMessage.error('操作失败')
  }
}

// 搜索用户（用于批量创建）
const searchingUsers = ref(false)
const searchUsers = async (query) => {
  searchingUsers.value = true
  try {
    const res = await axios.get('/api/user/list', {
      params: {
        page: 1,
        size: 20,
        keyword: query
      }
    })
    if (res.data.code === 200) {
      userOptions.value = res.data.data.records || []
    }
  } finally {
    searchingUsers.value = false
  }
}
// ... (omitted code) ...

// 显示新增设备弹窗
const showCreateDialog = () => {
  createForm.name = ''
  createForm.location = ''
  createForm.carrier = ''
  createForm.hashrate = 100
  batchForm.count = 10
  batchForm.hashrate = 100
  batchForm.userId = null
  batchForm.carrier = ''
  batchForm.location = ''
  userOptions.value = []
  createMode.value = 'single'
  createVisible.value = true
}

// 处理创建设备
const handleCreate = async () => {
  creating.value = true
  try {
    if (createMode.value === 'single') {
      // 单个新增
      const res = await axios.post('/api/device/create', {
        name: createForm.name,
        hashrate: createForm.hashrate,
        carrier: createForm.carrier,
        location: createForm.location
      })
      if (res.data.code === 200) {
        ElMessage.success(`创建成功，绑定码: ${res.data.data.bindCode}`)
        createVisible.value = false
        fetchDevices()
      } else {
        ElMessage.error(res.data.msg || '创建失败')
      }
    } else {
      // 批量新增
      const requestData = {
        count: batchForm.count,
        hashrate: batchForm.hashrate,
        carrier: batchForm.carrier,
        location: batchForm.location
      }
      // 如果选择了用户，添加userId参数
      if (batchForm.userId) {
        requestData.userId = batchForm.userId
      }
      const res = await axios.post('/api/device/batch-create', requestData)
      if (res.data.code === 200) {
        const msg = batchForm.userId 
          ? `成功创建 ${res.data.data.created} 台挂靠设备并绑定到用户`
          : `成功创建 ${res.data.data.created} 台挂靠设备`
        ElMessage.success(msg)
        createVisible.value = false
        fetchDevices()
      } else {
        ElMessage.error(res.data.msg || '创建失败')
      }
    }
  } catch (e) {
    console.error(e)
    ElMessage.error('创建失败')
  } finally {
    creating.value = false
  }
}

// 删除设备
const deleteDevice = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除该设备吗？删除后无法恢复。', '确认删除', {
      type: 'warning'
    })
    
    const res = await axios.delete(`/api/device/delete/${row.id}`)
    if (res.data.code === 200) {
      ElMessage.success('删除成功')
      fetchDevices()
    } else {
      ElMessage.error(res.data.msg || '删除失败')
    }
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error('操作失败')
    }
  }
}

// 导出 SN 列表为 CSV
const exportSnList = async () => {
  exporting.value = true
  try {
    const res = await axios.get('/api/device/export-sn')
    if (res.data.code === 200) {
      const data = res.data.data
      const list = data.list || []
      
      if (list.length === 0) {
        ElMessage.warning('暂无设备数据')
        return
      }
      
      // 生成 CSV 内容
      let csv = '序号,SN码,状态,绑定状态,创建时间\n'
      list.forEach(item => {
        csv += `${item.index},${item.sn},${item.status},${item.bound},${item.createTime}\n`
      })
      
      // 下载文件
      const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `全球云智算_设备SN列表_${new Date().toISOString().slice(0,10)}.csv`
      link.click()
      window.URL.revokeObjectURL(url)
      
      ElMessage.success(`已导出 ${list.length} 条设备SN`)
    } else {
      ElMessage.error(res.data.msg || '导出失败')
    }
  } catch (e) {
    console.error(e)
    ElMessage.error('导出失败')
  } finally {
    exporting.value = false
  }
}

// 导出二维码（可打印页面）- 分层显示
const exportQrCodes = async () => {
  try {
    let devices = factoryDevices.value
    if (!isFactoryUser.value || devices.length === 0) {
      const res = await axios.get('/api/device/export-sn', {
        params: isFactoryUser.value ? { unboundOnly: true } : undefined
      })
      if (res.data.code !== 200) {
        ElMessage.error('获取设备列表失败')
        return
      }
      devices = res.data.data.list || []
    }

    if (isFactoryUser.value) {
      devices = devices.filter(d => d.bound !== '已绑定')
    }

    if (devices.length === 0) {
      ElMessage.warning('暂无设备数据')
      return
    }

    const boundDevices = devices.filter(d => d.bound === '已绑定')
    const unboundDevices = devices.filter(d => d.bound !== '已绑定')
    const isFactoryPrint = isFactoryUser.value
    const headerText = isFactoryPrint ? `共 ${devices.length} 台未绑定设备` : `共 ${devices.length} 台设备`
    const summaryHtml = isFactoryPrint
      ? `<span class="summary-item unbound">未绑定: ${devices.length} 台</span>`
      : `<span class="summary-item unbound">未绑定: ${unboundDevices.length} 台</span><span class="summary-item bound">已绑定: ${boundDevices.length} 台</span>`

    // 打开新窗口生成二维码打印页
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      ElMessage.error('请允许弹出窗口')
      return
    }

    // 生成打印页面 HTML - 使用 qrcode-generator 库（更好的浏览器兼容性）
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>全球云智算 - 设备二维码</title>
  <script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js"><\/script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .header h1 { font-size: 24px; color: #333; }
    .header p { color: #666; margin-top: 10px; }
    .section { margin-bottom: 40px; }
    .section-title { 
      font-size: 20px; 
      font-weight: bold; 
      padding: 10px 20px; 
      margin-bottom: 20px; 
      border-radius: 8px;
      page-break-before: always;
    }
    .section-title:first-of-type { page-break-before: auto; }
    .section-title.unbound { background: #fef3c7; color: #d97706; }
    .section-title.bound { background: #d1fae5; color: #059669; }
    .qr-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
    .qr-item { 
      border: 2px dashed #ccc; 
      padding: 15px; 
      text-align: center; 
      page-break-inside: avoid;
      border-radius: 8px;
    }
    .qr-item.bound { border-color: #10b981; background: #f0fdf4; }
    .qr-item.unbound { border-color: #f59e0b; background: #fffbeb; }
    .qr-item img { margin: 10px auto; display: block; }
    .qr-code { font-size: 18px; font-weight: bold; color: #0b62aa; margin-top: 10px; }
    .qr-sn { font-size: 10px; color: #999; word-break: break-all; margin-top: 5px; }
    .qr-status { font-size: 12px; margin-top: 5px; }
    .qr-status.bound { color: #10b981; }
    .qr-status.unbound { color: #f59e0b; }
    .print-btn { 
      position: fixed; top: 10px; right: 10px; 
      padding: 10px 20px; background: #0b62aa; color: white; 
      border: none; border-radius: 5px; cursor: pointer; 
      z-index: 100;
    }
    .print-btn:hover { background: #6d28d9; }
    .summary { display: flex; gap: 20px; justify-content: center; margin-top: 10px; }
    .summary-item { padding: 5px 15px; border-radius: 20px; font-size: 14px; }
    .summary-item.bound { background: #d1fae5; color: #059669; }
    .summary-item.unbound { background: #fef3c7; color: #d97706; }
    .loading { text-align: center; padding: 50px; color: #666; }
    @media print {
      .print-btn { display: none; }
      .qr-grid { grid-template-columns: repeat(4, 1fr); }
    }
  </style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">🖨️ 打印</button>
  <div class="header">
    <h1>🔲 全球云智算 - 设备二维码</h1>
    <p>${headerText} | 生成时间: ${new Date().toLocaleString()}</p>
    <div class="summary">
      ${summaryHtml}
    </div>
  </div>
  
  <div id="loadingDiv" class="loading">正在生成二维码，请稍候...</div>
  <div class="section" id="unboundSection"></div>
  <div class="section" id="boundSection"></div>
  
  <script>
    const unboundDevices = ${JSON.stringify(unboundDevices)};
    const boundDevices = ${JSON.stringify(boundDevices)};
    
    function generateQRCode(text) {
      try {
        var qr = qrcode(0, 'M');
        qr.addData(text);
        qr.make();
        return qr.createDataURL(4, 0);
      } catch (e) {
        console.error('QR生成失败:', e);
        return null;
      }
    }
    
    function renderDevices(devices, containerId, statusClass, sectionTitle) {
      if (devices.length === 0) return;
      
      const container = document.getElementById(containerId);
      container.innerHTML = '<div class="section-title ' + statusClass + '">' + sectionTitle + ' (' + devices.length + ' 台)</div><div class="qr-grid" id="grid-' + containerId + '"></div>';
      const grid = document.getElementById('grid-' + containerId);
      
      devices.forEach(function(device, index) {
        const div = document.createElement('div');
        const displayCode = (device.bindCode || device.sn.slice(-8)).toUpperCase();
        
        const qrDataUrl = generateQRCode(displayCode);
        const qrImg = qrDataUrl ? '<img src="' + qrDataUrl + '" width="120" height="120" alt="QR"/>' : '<div style="width:120px;height:120px;background:#eee;display:flex;align-items:center;justify-content:center;margin:10px auto;">生成失败</div>';
        
        div.className = 'qr-item ' + statusClass;
        div.innerHTML = 
          '<div>设备 #' + (index + 1) + '</div>' +
          qrImg +
          '<div class="qr-code">' + displayCode + '</div>' +
          '<div class="qr-sn">SN: ' + device.sn + '</div>' +
          '<div class="qr-status ' + statusClass + '">' + (statusClass === 'bound' ? '✓ 已绑定' : '○ 未绑定') + '</div>';
        grid.appendChild(div);
      });
    }
    
    window.onload = function() {
      document.getElementById('loadingDiv').style.display = 'none';
      if (typeof qrcode === 'undefined') {
        alert('二维码库加载失败，请检查网络或刷新重试');
        return;
      }
      renderDevices(unboundDevices, 'unboundSection', 'unbound', '📦 未绑定设备');
      renderDevices(boundDevices, 'boundSection', 'bound', '✅ 已绑定设备');
    }
  <\/script>
</body>
</html>`;

    printWindow.document.write(html)
    printWindow.document.close()
    ElMessage.success('二维码页面已生成，请打印')
  } catch (e) {
    console.error(e)
    ElMessage.error('生成二维码失败')
  }
}

onMounted(() => {
  if (isFactoryUser.value) {
    fetchFactoryQrCodes()
  } else {
    fetchDevices()
  }
})
</script>

<style scoped>
.device-list-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.search-card {
  border-radius: 12px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border: 1px solid #e2e8f0;
}

.table-card {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.toolbar-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}

.batch-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.batch-info {
  color: #64748b;
  font-size: 13px;
}

.batch-info strong {
  color: #2563eb;
  font-size: 16px;
}

.batch-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 统计数字样式 */
.total-count {
  color: #64748b;
  font-size: 14px;
  background: rgba(124, 58, 237, 0.08);
  padding: 6px 12px;
  border-radius: 8px;
}

.total-count .online {
  color: #10b981;
  font-weight: 600;
}

.total-count .offline {
  color: #ef4444;
  font-weight: 500;
}

.total-count .real {
  color: #2563eb;
  font-weight: 600;
}

.total-count .attached {
  color: #d97706;
  font-weight: 600;
}

/* 设备绑定码样式 - 更易读的设计 */
.sn-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sn-text {
  font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid #bae6fd;
  letter-spacing: 0.5px;
}

/* 挂靠设备标签样式 */
:deep(.el-tag--warning) {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-color: #fcd34d;
  color: #92400e;
}

.unbind {
  color: #94a3b8;
  font-size: 12px;
}

/* 算力值样式 */
.hashrate {
  color: #f59e0b;
  font-weight: 700;
  font-size: 14px;
  text-shadow: 0 1px 2px rgba(245, 158, 11, 0.15);
}

.pagination-wrapper {
  margin-top: 20px;
  padding: 16px;
  display: flex;
  justify-content: flex-end;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
}

/* 用户信息卡片样式 */
.user-info-cell {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%);
  border-radius: 8px;
  border: 1px solid #e9d5ff;
}

.user-detail {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
}

.user-name {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
}

.user-id {
  font-size: 11px;
  color: #0b62aa;
  font-weight: 500;
}

/* 表格行hover效果 */
:deep(.el-table__row) {
  transition: all 0.2s ease;
}

:deep(.el-table__row:hover) {
  background: linear-gradient(135deg, #faf5ff 0%, #f5f3ff 100%) !important;
}

/* 表格头部样式 - 柔和的浅紫色 */
:deep(.el-table__header-wrapper th) {
  background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%) !important;
  color: #4c1d95 !important;
  font-weight: 600;
  font-size: 13px;
  border-bottom: 2px solid #a78bfa !important;
}

:deep(.el-table__header-wrapper .cell) {
  color: #4c1d95 !important;
}

/* 状态标签样式增强 */
:deep(.el-tag--success) {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  border-color: #6ee7b7;
  color: #047857;
  font-weight: 600;
}

:deep(.el-tag--info) {
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  border-color: #cbd5e1;
  color: #64748b;
}

/* 操作按钮区域 */
:deep(.el-table__fixed-right) {
  background: #fff;
}

/* 工厂用户专用二维码界面 */
.factory-qr-view {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.factory-qr-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 22px 24px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
}

.factory-qr-header h2 {
  margin: 0 0 6px;
  font-size: 22px;
  color: #111827;
  font-weight: 700;
}

.factory-qr-header p {
  margin: 0;
  color: #64748b;
  font-size: 14px;
}

.factory-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.factory-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.summary-card {
  padding: 16px 18px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.05);
}

.summary-card span {
  display: block;
  color: #64748b;
  font-size: 13px;
  margin-bottom: 8px;
}

.summary-card strong {
  font-size: 28px;
  color: #111827;
  line-height: 1;
}

.summary-card.unbound strong {
  color: #d97706;
}

.summary-card.bound strong {
  color: #059669;
}

.factory-alert {
  border-radius: 8px;
}

.factory-loading {
  padding: 24px;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.qr-section {
  padding: 18px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.section-heading h3 {
  margin: 0;
  color: #111827;
  font-size: 17px;
}

.section-heading span {
  color: #64748b;
  font-size: 13px;
}

.inline-qr-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 14px;
}

.inline-qr-card {
  min-height: 260px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  padding: 16px 12px;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  background: #f8fafc;
  text-align: center;
}

.inline-qr-card.unbound {
  border-color: #f59e0b;
  background: #fffbeb;
}

.inline-qr-card.bound {
  border-color: #10b981;
  background: #f0fdf4;
}

.inline-qr-card img,
.qr-placeholder {
  width: 132px;
  height: 132px;
  flex-shrink: 0;
}

.qr-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e2e8f0;
  color: #64748b;
  font-size: 13px;
  border-radius: 6px;
}

.qr-code-text {
  max-width: 100%;
  font-size: 17px;
  font-weight: 700;
  color: #4c1d95;
  word-break: break-all;
}

.qr-sn-text {
  max-width: 100%;
  min-height: 32px;
  color: #64748b;
  font-size: 11px;
  line-height: 1.4;
  word-break: break-all;
}

/* 搜索栏按钮样式 */
:deep(.el-button--success) {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border: none;
}

:deep(.el-button--warning) {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  border: none;
}

:deep(.el-button--info) {
  background: linear-gradient(135deg, #0e7bd4 0%, #0b62aa 100%);
  border: none;
  color: #fff;
}

/* ========== 设备详情弹窗样式 ========== */
.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 16px;
  border-bottom: 2px solid #e5e7eb;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  font-size: 36px;
}

.header-info h3 {
  margin: 0;
  font-size: 20px;
  color: #1e293b;
  font-weight: 700;
}

.header-sn {
  font-family: 'SF Mono', 'Monaco', monospace;
  font-size: 13px;
  color: #0b62aa;
  background: #f5f3ff;
  padding: 2px 8px;
  border-radius: 4px;
}

.detail-content {
  padding: 0;
}

/* 核心信息卡片 */
.info-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.info-card {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: all 0.2s ease;
}

.info-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.info-card.primary {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-color: #fcd34d;
}

.card-icon {
  font-size: 28px;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 10px;
}

.card-data {
  display: flex;
  flex-direction: column;
}

.card-value {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
}

.card-label {
  font-size: 12px;
  color: #64748b;
  margin-top: 2px;
}

/* 详细信息区块 */
.detail-section {
  margin-bottom: 24px;
}

.detail-section h4 {
  margin: 0 0 12px 0;
  font-size: 15px;
  color: #374151;
  font-weight: 600;
}

.sn-value {
  font-family: 'SF Mono', 'Monaco', monospace;
  color: #0b62aa;
  font-weight: 600;
}

.time-value {
  color: #059669;
  font-weight: 500;
}

/* 图表区域 */
.chart-section {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #e2e8f0;
}

.chart-section h4 {
  margin: 0 0 16px 0;
  font-size: 15px;
  color: #374151;
  font-weight: 600;
}

.chart-container {
  width: 100%;
  height: 280px;
  background: #fff;
  border-radius: 8px;
}

/* 弹窗整体样式 */
:deep(.device-detail-dialog .el-dialog__body) {
  padding: 20px 24px;
}

/* 底部缓冲 Padding */
.device-list-page {
  padding-bottom: 80px;
}
</style>
