<template>
  <div class="merchant-page">
    <el-card class="merchant-card">
      <template #header>
        <div class="card-header">
          <span class="title">接口商户管理</span>
          <el-button type="primary" @click="handleAdd">添加商户</el-button>
        </div>
      </template>

      <el-table :data="merchantList" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="merchantName" label="商户名称" width="150" />
        <el-table-column prop="appId" label="AppID" width="150" />
        <el-table-column label="资金账号" min-width="220">
          <template #default="{ row }">
            <div v-if="row.bindUserId" class="bind-user-cell">
              <div class="bind-user-name">{{ row.bindUserNickname || `用户${row.bindUserId}` }}</div>
              <div class="bind-user-meta">
                ID: {{ row.bindUserId }}
                <span v-if="row.bindUserPhone"> / {{ row.bindUserPhone }}</span>
              </div>
            </div>
            <span v-else class="unbind-text">未绑定</span>
          </template>
        </el-table-column>
        <el-table-column label="AppSecret" min-width="360">
          <template #default="{ row }">
            <div class="secret-cell">
              <span class="secret-value">{{ row.showSecret ? row.appSecret : '************************' }}</span>
              <el-button 
                type="primary" 
                link 
                size="small"
                @click="row.showSecret = !row.showSecret"
                :icon="row.showSecret ? View : Hide"
              >
                {{ row.showSecret ? '隐藏' : '显示' }}
              </el-button>
              <el-button
                type="primary"
                link
                size="small"
                :icon="CopyDocument"
                @click="copySecret(row.appSecret)"
              >
                复制
              </el-button>
              <el-button type="warning" link @click="handleResetSecret(row)">重置</el-button>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="功能权限" min-width="250">
          <template #default="{ row }">
            <el-tag 
              v-for="perm in getPermList(row.permissions)" 
              :key="perm" 
              size="small" 
              class="perm-tag"
            >
              {{ getPermName(perm) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-switch
              v-model="row.status"
              :active-value="1"
              :inactive-value="0"
              @change="handleStatusChange(row)"
            />
          </template>
        </el-table-column>
        <el-table-column prop="balance" label="佣金余额" width="140">
          <template #default="{ row }">
            <el-button type="primary" link @click="openEarnings(row)">
              <span style="color: #67c23a; font-weight: bold">￥{{ row.balance || "0.00" }}</span>
            </el-button>
          </template>
        </el-table-column>
        <el-table-column prop="deviceCount" label="设备总数" width="120">
          <template #default="{ row }">
            <el-button type="primary" link @click="openDevices(row)">
              <el-tag type="info">{{ row.deviceCount || 0 }} 台</el-tag>
            </el-button>
          </template>
        </el-table-column>
        <el-table-column prop="level" label="等级" width="120">
          <template #default="{ row }">
            <el-tag size="small">{{ getLevelName(row.level) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="contactPhone" label="联系电话" width="130" />
        <el-table-column prop="createTime" label="创建时间" width="170" />
        <el-table-column prop="expireTime" label="有效期至" width="170">
          <template #default="{ row }">
            <span :class="{ 'expired-text': isExpired(row.expireTime) }">
              {{ row.expireTime || '永久有效' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button type="success" link @click="openBindUser(row)">绑定账号</el-button>
            <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="fetchData"
          @current-change="fetchData"
        />
      </div>
    </el-card>

    <!-- 添加/编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑商户' : '添加商户'"
      width="500px"
    >
      <el-form :model="form" label-width="80px">
        <el-form-item label="商户名称" required>
          <el-input v-model="form.merchantName" placeholder="请输入商户名称" />
        </el-form-item>
        <el-form-item label="功能权限">
          <el-checkbox-group v-model="form.permissionList">
            <el-checkbox label="text-to-video">文生视频</el-checkbox>
            <el-checkbox label="image-to-video">图生视频</el-checkbox>
            <el-checkbox label="text-to-image">文生图</el-checkbox>
            <el-checkbox label="image-to-image">图生图</el-checkbox>
            <el-divider content-position="left">商户系统集成</el-divider>
            <el-checkbox label="user-sync">用户同步</el-checkbox>
            <el-checkbox label="device-bind">设备绑定/解绑</el-checkbox>
            <el-checkbox label="device-list">设备列表查询</el-checkbox>
            <el-checkbox label="earnings-query">收益查询</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="商户等级" required>
          <el-select v-model="form.level" placeholder="请选择等级" style="width: 180px">
            <el-option :label="getLevelName(0)" :value="0" />
            <el-option v-for="lv in inviteLevels" :key="lv.index" :label="lv.name" :value="lv.index" />
          </el-select>
          <div class="form-tip">等级决定商户名下用户产生收益时的抽成权益</div>
        </el-form-item>
        <el-form-item label="佣金余额">
          <el-input-number v-model="form.balance" :precision="2" :step="100" :min="0" style="width: 180px" />
        </el-form-item>
        <el-form-item label="联系电话">
          <el-input v-model="form.contactPhone" placeholder="请输入商户联系电话" />
        </el-form-item>
        <el-form-item label="有效期至">
          <el-date-picker
            v-model="form.expireTime"
            type="datetime"
            placeholder="请选择到期时间"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
          />
          <div class="form-tip">留空表示永久有效</div>
        </el-form-item>
        <el-form-item label="启用状态">
          <el-switch v-model="form.status" :active-value="1" :inactive-value="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm" :loading="submitting">确认</el-button>
      </template>
    </el-dialog>
  </div>
    <!-- 设备收益明细 -->
    <el-dialog
      v-model="earningsDialogVisible"
      :title="`设备产出明细 - ${currentMerchantName}`"
      width="900px"
    >
      <div class="filter-row">
        <span class="filter-label">日期范围：</span>
        <el-date-picker
          v-model="earningsDateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
          @change="fetchEarnings"
        />
      </div>
      <el-table :data="earningsRecords" v-loading="earningsLoading" stripe>
        <el-table-column prop="bindCode" label="绑定码" width="120" />
        <el-table-column prop="sn" label="SN" width="160" />
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'">
              {{ row.status === 1 ? "在线" : "离线" }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="lastHeartbeatTime" label="最后心跳" width="180" />
        <el-table-column prop="bindTime" label="绑定时间" width="180" />
        <el-table-column prop="date" label="日期" width="120" />
        <el-table-column prop="amount" label="当天产出" width="120" />
      </el-table>
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="earningsPage"
          v-model:page-size="earningsPageSize"
          :total="earningsTotal"
          :page-sizes="[20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="fetchEarnings"
          @current-change="fetchEarnings"
        />
      </div>
    </el-dialog>

    <!-- 设备状态列表 -->
    <el-dialog
      v-model="devicesDialogVisible"
      :title="`设备状态 - ${currentMerchantName}`"
      width="1000px"
    >
      <el-table :data="devicesRecords" v-loading="devicesLoading" stripe>
        <el-table-column prop="bindCode" label="绑定码" width="120" />
        <el-table-column prop="sn" label="SN" width="160" />
        <el-table-column prop="name" label="备注" min-width="120">
          <template #default="{ row }">
            {{ row.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'">
              {{ row.status === 1 ? "在线" : "离线" }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="lastHeartbeatTime" label="最后心跳" width="180" />
        <el-table-column prop="bindTime" label="绑定时间" width="180" />
        <el-table-column label="操作" width="110" fixed="right">
          <template #default="{ row }">
            <el-button type="warning" link @click="releaseMerchantDevice(row)">退回</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="devicesPage"
          v-model:page-size="devicesPageSize"
          :total="devicesTotal"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="fetchDevices"
          @current-change="fetchDevices"
        />
      </div>
    </el-dialog>

    <el-dialog
      v-model="bindUserDialogVisible"
      :title="`绑定资金账号 - ${currentMerchantName}`"
      width="520px"
    >
      <el-form label-width="90px">
        <el-form-item label="当前绑定">
          <div v-if="bindUserForm.bindUserId" class="current-bind">
            <div>{{ bindUserForm.bindUserNickname || `用户${bindUserForm.bindUserId}` }}</div>
            <div class="current-bind-meta">
              ID: {{ bindUserForm.bindUserId }}
              <span v-if="bindUserForm.bindUserPhone"> / {{ bindUserForm.bindUserPhone }}</span>
            </div>
          </div>
          <span v-else class="unbind-text">未绑定资金账号</span>
        </el-form-item>
        <el-form-item label="搜索用户">
          <el-select
            v-model="bindUserForm.bindUserId"
            filterable
            remote
            reserve-keyword
            clearable
            placeholder="输入昵称 / 手机号 / 用户ID"
            :remote-method="searchUserOptions"
            :loading="userOptionsLoading"
            style="width: 100%"
          >
            <el-option
              v-for="item in userOptions"
              :key="item.id"
              :label="formatUserOption(item)"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <div class="form-tip">绑定后，该商户名下新增分润将优先进入此平台用户账号余额，并复用现有用户提现体系。</div>
      </el-form>
      <template #footer>
        <el-button @click="bindUserDialogVisible = false">取消</el-button>
        <el-button
          v-if="bindUserForm.originalBindUserId"
          @click="clearBindUser"
        >
          清除绑定
        </el-button>
        <el-button type="primary" @click="submitBindUser" :loading="bindUserSubmitting">确认绑定</el-button>
      </template>
    </el-dialog>
</template>

<script setup>
import { ref, onMounted, reactive } from 'vue'
import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import { View, Hide, CopyDocument } from '@element-plus/icons-vue'

const merchantList = ref([])
const loading = ref(false)
const submitting = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const inviteLevels = ref([])

const dialogVisible = ref(false)
const isEdit = ref(false)
const form = reactive({
  id: null,
  merchantName: '',
  permissionList: [],
  status: 1,
  expireTime: null,
  balance: 0,
  level: 0,
  contactPhone: ''
})


const currentMerchantId = ref(null)
const currentMerchantName = ref("")

const earningsDialogVisible = ref(false)
const earningsRecords = ref([])
const earningsLoading = ref(false)
const earningsPage = ref(1)
const earningsPageSize = ref(50)
const earningsTotal = ref(0)
const earningsDateRange = ref([])

const devicesDialogVisible = ref(false)
const devicesRecords = ref([])
const devicesLoading = ref(false)
const devicesPage = ref(1)
const devicesPageSize = ref(20)
const devicesTotal = ref(0)

const bindUserDialogVisible = ref(false)
const bindUserSubmitting = ref(false)
const userOptionsLoading = ref(false)
const userOptions = ref([])
const bindUserForm = reactive({
  merchantId: null,
  bindUserId: null,
  originalBindUserId: null,
  bindUserNickname: '',
  bindUserPhone: ''
})

const formatDate = (d) => {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

const setDefaultDateRange = () => {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - 29)
  earningsDateRange.value = [formatDate(start), formatDate(end)]
}

const openEarnings = (row) => {
  currentMerchantId.value = row.id
  currentMerchantName.value = row.merchantName || ""
  earningsPage.value = 1
  if (!earningsDateRange.value || earningsDateRange.value.length !== 2) {
    setDefaultDateRange()
  }
  earningsDialogVisible.value = true
  fetchEarnings()
}

const openDevices = (row) => {
  currentMerchantId.value = row.id
  currentMerchantName.value = row.merchantName || ""
  devicesPage.value = 1
  devicesDialogVisible.value = true
  fetchDevices()
}

const fetchEarnings = async () => {
  if (!currentMerchantId.value) return
  earningsLoading.value = true
  try {
    if (!earningsDateRange.value || earningsDateRange.value.length !== 2) {
      setDefaultDateRange()
    }
    const [startDate, endDate] = earningsDateRange.value
    const res = await axios.get(`/api/admin/api-merchants/${currentMerchantId.value}/device-earnings`, {
      params: {
        page: earningsPage.value,
        size: earningsPageSize.value,
        startDate,
        endDate
      }
    })
    if (res.data.code === 200) {
      earningsRecords.value = res.data.data.records
      earningsTotal.value = res.data.data.total
    } else {
      ElMessage.error(res.data.msg || "获取设备产出失败")
    }
  } catch (e) {
    ElMessage.error("获取设备产出失败")
  } finally {
    earningsLoading.value = false
  }
}

const fetchDevices = async () => {
  if (!currentMerchantId.value) return
  devicesLoading.value = true
  try {
    const res = await axios.get(`/api/admin/api-merchants/${currentMerchantId.value}/devices`, {
      params: {
        page: devicesPage.value,
        size: devicesPageSize.value
      }
    })
    if (res.data.code === 200) {
      devicesRecords.value = res.data.data.records
      devicesTotal.value = res.data.data.total
    } else {
      ElMessage.error(res.data.msg || "获取设备列表失败")
    }
  } catch (e) {
    ElMessage.error("获取设备列表失败")
  } finally {
    devicesLoading.value = false
  }
}

const releaseMerchantDevice = async (row) => {
  if (!row.id) {
    ElMessage.error('缺少设备ID，无法退回')
    return
  }
  const deviceCode = row.bindCode || row.sn
  try {
    await ElMessageBox.confirm(
      `确定将设备 ${deviceCode} 从 ${currentMerchantName.value} 退回吗？退回后会清除商户归属和当前用户绑定，设备可被其他用户或商户重新绑定。`,
      '退回商户设备',
      {
        type: 'warning',
        confirmButtonText: '确认退回',
        cancelButtonText: '取消'
      }
    )
    const res = await axios.post('/api/device/release-merchant', { id: row.id })
    if (res.data.code === 200) {
      ElMessage.success(res.data.data || '设备已退回')
      fetchDevices()
      fetchData()
    } else {
      ElMessage.error(res.data.msg || '退回失败')
    }
  } catch (e) {
    if (e !== 'cancel') ElMessage.error('操作失败')
  }
}

const isExpired = (expireTime) => {
  if (!expireTime) return false
  return new Date(expireTime) < new Date()
}

const fetchData = async () => {
  loading.value = true
  try {
    const res = await axios.get('/api/admin/api-merchants/list', {
      params: {
        page: currentPage.value,
        size: pageSize.value
      }
    })
    if (res.data.code === 200) {
      merchantList.value = res.data.data.records.map(row => ({
        ...row,
        showSecret: false
      }))
      total.value = res.data.data.total
    }
  } catch (e) {
    ElMessage.error('获取列表失败')
  } finally {
    loading.value = false
  }
}

const formatUserOption = (item) => {
  const name = item.nickname || `用户${item.id}`
  const phone = item.phone ? ` / ${item.phone}` : ''
  return `${name} (ID:${item.id}${phone})`
}

const searchUserOptions = async (keyword) => {
  userOptionsLoading.value = true
  try {
    const res = await axios.get('/api/admin/api-merchants/user-options', {
      params: {
        keyword,
        size: 20
      }
    })
    if (res.data.code === 200) {
      userOptions.value = res.data.data || []
    } else {
      userOptions.value = []
    }
  } catch (e) {
    userOptions.value = []
  } finally {
    userOptionsLoading.value = false
  }
}

const openBindUser = async (row) => {
  currentMerchantName.value = row.merchantName || ''
  bindUserForm.merchantId = row.id
  bindUserForm.bindUserId = row.bindUserId || null
  bindUserForm.originalBindUserId = row.bindUserId || null
  bindUserForm.bindUserNickname = row.bindUserNickname || ''
  bindUserForm.bindUserPhone = row.bindUserPhone || ''
  userOptions.value = row.bindUserId
    ? [{
        id: row.bindUserId,
        nickname: row.bindUserNickname,
        phone: row.bindUserPhone
      }]
    : []
  bindUserDialogVisible.value = true
}

const submitBindUser = async () => {
  if (!bindUserForm.merchantId) return
  bindUserSubmitting.value = true
  try {
    const res = await axios.post(`/api/admin/api-merchants/${bindUserForm.merchantId}/bind-user`, {
      bindUserId: bindUserForm.bindUserId
    })
    if (res.data.code === 200) {
      ElMessage.success('绑定成功')
      bindUserDialogVisible.value = false
      fetchData()
    } else {
      ElMessage.error(res.data.msg || '绑定失败')
    }
  } catch (e) {
    ElMessage.error('绑定失败')
  } finally {
    bindUserSubmitting.value = false
  }
}

const clearBindUser = async () => {
  bindUserForm.bindUserId = null
  await submitBindUser()
}

const getPermList = (perms) => {
  return perms ? perms.split(',') : []
}

const getPermName = (perm) => {
  const map = {
    'text-to-video': '文生视频',
    'image-to-video': '图生视频',
    'text-to-image': '文生图',
    'image-to-image': '图生图',
    'user-sync': '用户同步',
    'device-bind': '设备绑定',
    'device-list': '设备列表',
    'earnings-query': '收益查询'
  }
  return map[perm] || perm
}

const fetchLevels = async () => {
  try {
    const res = await axios.get('/api/settings/all')
    if (res.data.code === 200 && res.data.data.inviteLevels) {
      inviteLevels.value = res.data.data.inviteLevels
    }
  } catch (e) {
    console.error('加载等级名称失败')
  }
}

const getLevelName = (level) => {
  if (!level || level === 0) return '普通商户'
  const lv = inviteLevels.value.find(l => l.index === level)
  return lv ? lv.name : level + ' 级代理'
}

const handleAdd = () => {
  isEdit.value = false
  form.id = null
  form.merchantName = ''
  form.permissionList = []
  form.status = 1
  form.expireTime = null
  dialogVisible.value = true
}

const handleEdit = (row) => {
  isEdit.value = true
  form.id = row.id
  form.merchantName = row.merchantName
  form.permissionList = getPermList(row.permissions)
  form.status = row.status
  form.expireTime = row.expireTime
  form.balance = row.balance || 0
  form.level = row.level || 0
  form.contactPhone = row.contactPhone || ''
  dialogVisible.value = true
}

const submitForm = async () => {
  if (!form.merchantName) return ElMessage.warning('请输入商户名称')
  
  submitting.value = true
  try {
    const data = {
      ...form,
      permissions: form.permissionList.join(',')
    }
    const url = isEdit.value ? '/api/admin/api-merchants/update' : '/api/admin/api-merchants/add'
    const method = isEdit.value ? 'put' : 'post'
    
    const res = await axios[method](url, data)
    if (res.data.code === 200) {
      ElMessage.success(isEdit.value ? '更新成功' : '添加成功')
      dialogVisible.value = false
      fetchData()
    } else {
      ElMessage.error(res.data.msg)
    }
  } catch (e) {
    ElMessage.error('操作失败')
  } finally {
    submitting.value = false
  }
}

const handleStatusChange = async (row) => {
  try {
    await axios.put('/api/admin/api-merchants/update', {
      id: row.id,
      status: row.status
    })
    ElMessage.success('状态更新成功')
  } catch (e) {
    row.status = row.status === 1 ? 0 : 1
    ElMessage.error('状态更新失败')
  }
}

const handleResetSecret = async (row) => {
  try {
    await ElMessageBox.confirm('重置后旧密钥将失效，确定继续吗？', '提示', {
      type: 'warning'
    })
    const res = await axios.post(`/api/admin/api-merchants/${row.id}/reset-secret`)
    if (res.data.code === 200) {
      ElMessage.success('重置成功')
      fetchData()
    }
  } catch (e) {
    if (e !== 'cancel') ElMessage.error('重置失败')
  }
}

const copySecret = async (secret) => {
  if (!secret) {
    ElMessage.warning('暂无 AppSecret 可复制')
    return
  }
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(secret)
    } else {
      const textarea = document.createElement('textarea')
      textarea.value = secret
      textarea.setAttribute('readonly', '')
      textarea.style.position = 'fixed'
      textarea.style.left = '-9999px'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    ElMessage.success('AppSecret 已复制')
  } catch (e) {
    ElMessage.error('复制失败，请手动复制')
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm('确定删除该商户吗？', '提示', {
      type: 'danger'
    })
    const res = await axios.delete(`/api/admin/api-merchants/${row.id}`)
    if (res.data.code === 200) {
      ElMessage.success('删除成功')
      fetchData()
    }
  } catch (e) {
    if (e !== 'cancel') ElMessage.error('删除失败')
  }
}

onMounted(() => {
  fetchData()
  fetchLevels()
})
</script>

<style scoped>
.merchant-page {
  padding: 0;
}
.merchant-card {
  border-radius: 12px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.title {
  font-size: 18px;
  font-weight: 700;
}
.secret-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: monospace;
}
.bind-user-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.bind-user-name {
  font-weight: 600;
  color: #303133;
}
.bind-user-meta,
.current-bind-meta {
  font-size: 12px;
  color: #909399;
}
.unbind-text {
  color: #c0c4cc;
}
.current-bind {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.perm-tag {
  margin-right: 6px;
  margin-bottom: 4px;
}
.expired-text {
  color: #f56c6c;
  font-weight: bold;
}
.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}
.filter-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.filter-label {
  font-size: 13px;
  color: #606266;
}
.pagination-wrapper {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
