<template>
  <div class="withdraw-list-page">
    <!-- 金额统计卡片 -->
    <el-row :gutter="16" class="amount-stats-row">
      <el-col :span="8">
        <div class="amount-card total">
          <div class="amount-icon">💰</div>
          <div class="amount-info">
            <div class="amount-value">¥{{ formatAmount(stats.totalAmount) }}</div>
            <div class="amount-label">累计提现金额</div>
          </div>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="amount-card pending-pay">
          <div class="amount-icon">⏳</div>
          <div class="amount-info">
            <div class="amount-value">¥{{ formatAmount(stats.pendingPayAmount) }}</div>
            <div class="amount-label">待打款金额</div>
          </div>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="amount-card paid-amount">
          <div class="amount-icon">✅</div>
          <div class="amount-info">
            <div class="amount-value">¥{{ formatAmount(stats.paidAmount) }}</div>
            <div class="amount-label">已打款金额</div>
          </div>
        </div>
      </el-col>

    </el-row>

    <!-- 状态统计卡片 -->
    <el-row :gutter="16" class="stats-row">
      <el-col :span="4.8" style="width: 20%;">
        <div class="stat-card pending clickable" @click="filterByStatus(0)">
          <div class="stat-icon">⏳</div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.pending }}</div>
            <div class="stat-label">待审核</div>
            <div class="stat-amount">¥{{ formatAmount(stats.pendingAuditAmount) }}</div>
          </div>
        </div>
      </el-col>
      <el-col :span="4.8" style="width: 20%;">
        <div class="stat-card approved clickable" @click="filterByStatus(1)">
          <div class="stat-icon">✓</div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.approved }}</div>
            <div class="stat-label">已通过</div>
          </div>
        </div>
      </el-col>
      <el-col :span="4.8" style="width: 20%;">
        <div class="stat-card paid clickable" @click="filterByStatus(3)">
          <div class="stat-icon">✅</div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.paid }}</div>
            <div class="stat-label">已打款</div>
          </div>
        </div>
      </el-col>
      <el-col :span="4.8" style="width: 20%;">
        <div class="stat-card failed clickable" @click="filterByStatus(4)">
          <div class="stat-icon">⚠️</div>
          <div class="stat-info">
            <div class="stat-value" style="color: #f59e0b;">{{ stats.failed || 0 }}</div>
            <div class="stat-label">打款失败</div>
          </div>
        </div>
      </el-col>
      <el-col :span="4.8" style="width: 20%;">
        <div class="stat-card rejected clickable" @click="filterByStatus(2)">
          <div class="stat-icon">✕</div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.rejected }}</div>
            <div class="stat-label">已拒绝</div>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 筛选条 -->
    <el-card class="filter-card">
      <el-row :gutter="16" align="middle">
        <el-col :span="6">
          <el-select v-model="statusFilter" placeholder="状态筛选" clearable @change="handleSearch">
            <el-option label="全部" value="" />
            <el-option label="待审核" :value="0" />
            <el-option label="已通过" :value="1" />
            <el-option label="已拒绝" :value="2" />
            <el-option label="已打款" :value="3" />
            <el-option label="失败" :value="4" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-select v-model="userTypeFilter" placeholder="用户类型" clearable @change="handleSearch">
            <el-option label="全部类型" value="" />
            <el-option label="个人用户" value="personal" />
            <el-option label="公司用户" value="company" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-col>
        <el-col :span="10" style="text-align: right;">
          <el-button type="warning" @click="exportToExcel" :loading="exporting">📥 导出Excel</el-button>
          <el-button type="success" @click="fetchData" :loading="loading">刷新</el-button>
        </el-col>
      </el-row>

      <!-- 批量操作栏 -->
      <el-row v-if="selectedRows.length > 0" class="batch-bar" align="middle">
        <el-col :span="24">
          <div class="batch-bar-inner">
            <span class="batch-info">已选择 <strong>{{ selectedRows.length }}</strong> 条记录</span>
            <el-button v-if="selectedPendingCount > 0" type="success" size="small" @click="handleBatchApprove" :loading="submitting" :disabled="submitting">✅ 批量通过 ({{ selectedPendingCount }})</el-button>
            <el-button v-if="selectedPendingCount > 0" type="danger" size="small" @click="handleBatchReject" :disabled="submitting">❌ 批量拒绝 ({{ selectedPendingCount }})</el-button>
            <el-button size="small" @click="clearSelection">取消选择</el-button>
          </div>
        </el-col>
      </el-row>
    </el-card>

    <!-- 提现方式 Tabs -->
    <el-card class="tabs-card">
      <el-tabs v-model="typeFilter" @tab-change="handleTypeChange">
        <el-tab-pane label="全部" name="all">
          <template #label>
            <span class="tab-label">
              <span class="tab-icon">📋</span>
              全部
            </span>
          </template>
        </el-tab-pane>
        <el-tab-pane label="微信" name="1">
          <template #label>
            <span class="tab-label wechat">
              <span class="tab-icon">💚</span>
              微信
            </span>
          </template>
        </el-tab-pane>
        <el-tab-pane label="支付宝" name="2">
          <template #label>
            <span class="tab-label alipay">
              <span class="tab-icon">💙</span>
              支付宝
            </span>
          </template>
        </el-tab-pane>
        <el-tab-pane label="银行卡" name="3">
          <template #label>
            <span class="tab-label bank">
              <span class="tab-icon">🏦</span>
              银行卡
            </span>
          </template>
        </el-tab-pane>
      </el-tabs>

      <!-- 提现列表 -->
      <el-table :data="withdrawList" v-loading="loading" stripe ref="tableRef" @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="45" :selectable="isSelectable" />
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column label="用户" width="160">
          <template #default="{ row }">
            <div class="user-info-cell">
              <el-avatar :size="32" :src="row.avatarUrl || 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'" />
              <div class="user-detail">
                <div class="user-name">{{ row.nickname || '未知用户' }}</div>
                <div class="user-id">ID: {{ row.userId }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="用户类型" width="100">
          <template #default="{ row }">
            <el-tag :type="getUserTypeTag(row.userType)" size="small" effect="plain">
              {{ getUserTypeText(row.userType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="提现金额" width="120">
          <template #default="{ row }">
            <span class="amount">¥{{ row.amount }}</span>
          </template>
        </el-table-column>
        <el-table-column label="手续费" width="100">
          <template #default="{ row }">
            <span class="fee">¥{{ row.fee || '0.00' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="实际到账" width="120">
          <template #default="{ row }">
            <span class="actual">¥{{ row.actualAmount }}</span>
          </template>
        </el-table-column>
        <el-table-column label="提现方式" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="getTypeTag(row.type)">
              {{ getTypeName(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="realName" label="收款人" width="100" />
        <el-table-column prop="account" label="收款账号" min-width="150" />
        <el-table-column label="收款码" width="100">
          <template #default="{ row }">
            <el-image 
              v-if="row.qrCode"
              style="width: 40px; height: 40px; border-radius: 4px;"
              :src="row.qrCode" 
              :preview-src-list="[row.qrCode]"
              fit="cover"
              preview-teleported
            />
            <span v-else-if="row.type !== 3" style="color: #999; font-size: 12px;">未上传</span>
            <span v-else style="color: #ccc; font-size: 12px;">-</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="130">
          <template #default="{ row }">
            <el-tag :type="getStatusTag(row.status)" effect="dark">
              {{ getStatusName(row.status) }}
            </el-tag>
            <!-- 打款失败标注 -->
            <div v-if="row.status === 4" style="margin-top: 4px;">
              <el-tag size="small" type="danger" effect="plain">
                ⚠️ 曾失败{{ row.paymentFailCount || 1 }}次
              </el-tag>
            </div>
            <!-- 失败原因 -->
            <el-tooltip v-if="row.status === 4 && row.rejectReason" :content="row.rejectReason" placement="top">
              <div style="margin-top: 4px; font-size: 11px; color: #ef4444; cursor: pointer;">
                查看失败原因
              </div>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="申请时间" width="170" />
        <el-table-column label="操作" width="300" fixed="right">
          <template #default="{ row }">
            <template v-if="row.status === 0">
              <el-button size="small" type="success" @click="handleApprove(row)">通过</el-button>
              <el-button size="small" type="danger" @click="handleReject(row)">拒绝</el-button>
            </template>
            <template v-else-if="row.status === 1">
              <el-button size="small" type="primary" @click="handlePaid(row)">线下打款</el-button>
            </template>
            <template v-else-if="row.status === 4">
              <el-button size="small" type="danger" @click="handleReject(row)">拒绝退款</el-button>
              <el-button size="small" type="primary" @click="handlePaid(row)">线下打款</el-button>
            </template>
            <template v-else>
              <el-button size="small" disabled>已处理</el-button>
            </template>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="fetchWithdrawList"
          @current-change="fetchWithdrawList"
        />
      </div>
    </el-card>

    <!-- 拒绝原因弹窗 -->
    <el-dialog v-model="rejectVisible" title="拒绝原因" width="400px">
      <el-input v-model="rejectRemark" type="textarea" :rows="3" placeholder="请输入拒绝原因（可选）" />
      <template #footer>
        <el-button @click="rejectVisible = false">取消</el-button>
        <el-button type="danger" @click="confirmReject" :loading="submitting">确认拒绝</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'

const withdrawList = ref([])
const loading = ref(false)
const submitting = ref(false)
const exporting = ref(false)
const statusFilter = ref('')  // 默认显示全部
const selectedRows = ref([])
const tableRef = ref(null)
const typeFilter = ref('all')  // 提现方式筛选
const userTypeFilter = ref('')
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

const stats = reactive({
  pending: 0,
  approved: 0,
  rejected: 0,
  paid: 0,
  failed: 0,
  pendingAuditAmount: 0,
  totalAmount: 0,
  pendingPayAmount: 0,
  paidAmount: 0
})

const rejectVisible = ref(false)
const rejectRemark = ref('')
const currentWithdraw = ref(null)
// 格式化金额
const formatAmount = (amount) => {
  if (!amount) return '0.00'
  return Number(amount).toFixed(2)
}

const fetchData = () => {
  fetchStats()
  fetchWithdrawList()
}

const fetchStats = async () => {
  try {
    const res = await axios.get('/api/withdraw/admin/stats')
    if (res.data.code === 200) {
      Object.assign(stats, res.data.data)
    }
  } catch (e) {
    console.error(e)
  }
}

const fetchWithdrawList = async () => {
  loading.value = true
  try {
    const params = {
      page: currentPage.value,
      size: pageSize.value,
      status: statusFilter.value !== '' ? statusFilter.value : undefined,
      userType: userTypeFilter.value || undefined
    }
    // 添加提现方式筛选
    if (typeFilter.value !== 'all') {
      params.type = parseInt(typeFilter.value)
    }
    
    const res = await axios.get('/api/withdraw/admin/list', { params })
    if (res.data.code === 200) {
      withdrawList.value = res.data.data.records || []
      total.value = res.data.data.total || 0
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  currentPage.value = 1
  fetchWithdrawList()
}

const handleTypeChange = () => {
  currentPage.value = 1
  fetchWithdrawList()
}

const resetSearch = () => {
  statusFilter.value = ''
  typeFilter.value = 'all'
  userTypeFilter.value = ''
  currentPage.value = 1
  fetchWithdrawList()
}

// 点击统计卡片快速筛选
const filterByStatus = (status) => {
  statusFilter.value = status
  currentPage.value = 1
  fetchWithdrawList()
}

// 导出Excel (CSV格式)
const exportToExcel = async () => {
  exporting.value = true
  try {
    // 获取所有符合条件的数据（不分页）
    const params = {
      page: 1,
      size: 9999,
      status: statusFilter.value !== '' ? statusFilter.value : undefined,
      userType: userTypeFilter.value || undefined
    }
    if (typeFilter.value !== 'all') {
      params.type = parseInt(typeFilter.value)
    }
    
    const res = await axios.get('/api/withdraw/admin/list', { params })
    if (res.data.code === 200) {
      const data = res.data.data.records || []
      if (data.length === 0) {
        ElMessage.warning('没有可导出的数据')
        return
      }
      
      // 构建CSV内容
      const headers = ['ID', '用户ID', '用户昵称', '用户类型', '提现金额', '手续费', '实际到账', '提现方式', '收款人', '收款账号', '开户行', '状态', '申请时间', '处理时间', '备注']
      const rows = data.map(row => [
        row.id,
        row.userId,
        row.nickname || '',
        getUserTypeText(row.userType),
        row.amount,
        row.fee || '0.00',
        row.actualAmount,
        getTypeName(row.type),
        row.realName || '',
        row.account || '',
        row.bankName || '',
        getStatusName(row.status),
        row.createTime || '',
        row.updateTime || '',
        row.remark || ''
      ])
      
      // 添加BOM头以支持中文
      let csvContent = '\uFEFF' + headers.join(',') + '\n'
      rows.forEach(row => {
        csvContent += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n'
      })
      
      // 下载文件
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `提现记录_${new Date().toLocaleDateString()}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      ElMessage.success(`成功导出 ${data.length} 条记录`)
    }
  } catch (e) {
    console.error(e)
    ElMessage.error('导出失败')
  } finally {
    exporting.value = false
  }
}

const getTypeName = (type) => {
  const types = { 1: '微信', 2: '支付宝', 3: '银行卡' }
  return types[type] || '未知'
}

const getTypeTag = (type) => {
  const tags = { 1: 'success', 2: 'primary', 3: 'warning' }
  return tags[type] || 'info'
}

const getStatusName = (status) => {
  const names = { 0: '待审核', 1: '已通过', 2: '已拒绝', 3: '已打款', 4: '失败' }
  return names[status] || '未知'
}

const getStatusTag = (status) => {
  const tags = { 0: 'warning', 1: 'primary', 2: 'danger', 3: 'success', 4: 'danger' }
  return tags[status] || 'info'
}

const getUserTypeText = (type) => {
  return type === 'company' ? '公司用户' : '个人用户'
}

const getUserTypeTag = (type) => {
  return type === 'company' ? 'warning' : 'info'
}



const handleReject = (row) => {
  currentWithdraw.value = row
  rejectRemark.value = ''
  rejectVisible.value = true
}

const confirmReject = async () => {
  submitting.value = true
  try {
    // 批量拒绝模式
    if (currentWithdraw.value?._batchIds) {
      const ids = currentWithdraw.value._batchIds
      let success = 0, fail = 0
      for (const id of ids) {
        try {
          const res = await axios.post(`/api/withdraw/admin/reject/${id}`, { remark: rejectRemark.value })
          if (res.data.code === 200) success++
          else fail++
        } catch { fail++ }
      }
      ElMessage.success(`批量拒绝完成：成功 ${success} 条${fail > 0 ? '，失败 ' + fail + ' 条' : ''}`)
      rejectVisible.value = false
      clearSelection()
      fetchData()
      return
    }

    const res = await axios.post(`/api/withdraw/admin/reject/${currentWithdraw.value.id}`, {
      remark: rejectRemark.value
    })
    if (res.data.code === 200) {
      ElMessage.success('已拒绝')
      rejectVisible.value = false
      fetchData()
    } else {
      ElMessage.error(res.data.msg || '操作失败')
    }
  } catch (e) {
    ElMessage.error('操作失败')
  } finally {
    submitting.value = false
  }
}

const handleSelectionChange = (rows) => {
  selectedRows.value = rows
}

const isSelectable = (row) => {
  return row.status === 0
}

const selectedPendingCount = computed(() => selectedRows.value.filter(r => r.status === 0).length)

const clearSelection = () => {
  tableRef.value?.clearSelection()
}

const handleBatchApprove = async () => {
  const pendingRows = selectedRows.value.filter(r => r.status === 0)
  if (pendingRows.length === 0) {
    ElMessage.warning('没有可审核的记录')
    return
  }
  try {
    await ElMessageBox.confirm(`确认批量通过 ${pendingRows.length} 条提现申请？`, '批量审核', {
      type: 'success'
    })
    submitting.value = true
    const ids = pendingRows.map(r => r.id)
    const res = await axios.post('/api/withdraw/admin/batch-approve', ids)
    if (res.data.code === 200) {
      const d = res.data.data
      ElMessage.success(`批量审核完成：成功 ${d.success} 条${d.fail > 0 ? '，失败 ' + d.fail + ' 条' : ''}`)
      clearSelection()
      fetchData()
    } else {
      ElMessage.error(res.data.msg || '操作失败')
    }
  } catch (e) {
    if (e !== 'cancel') ElMessage.error('操作失败')
  } finally {
    submitting.value = false
  }
}

const handleBatchReject = async () => {
  const pendingRows = selectedRows.value.filter(r => r.status === 0)
  if (pendingRows.length === 0) {
    ElMessage.warning('没有可驳回的记录')
    return
  }
  currentWithdraw.value = { _batchIds: pendingRows.map(r => r.id) }
  rejectRemark.value = ''
  rejectVisible.value = true
}

const handleApprove = async (row) => {
  try {
    await ElMessageBox.confirm('确认审核通过？通过后可发起打款。', '审核', {
      type: 'success'
    })
    
    const res = await axios.post(`/api/withdraw/admin/approve/${row.id}`)
    if (res.data.code === 200) {
      ElMessage.success('审核通过')
      fetchData()
    } else {
      ElMessage.error(res.data.msg || '操作失败')
    }
  } catch (e) {
    if (e !== 'cancel') ElMessage.error('操作失败')
  }
}

const handlePaid = async (row) => {
  try {
    await ElMessageBox.confirm(`确认已完成线下打款？\n线下打款不扣提现手续费\n实际到账：¥${formatAmount(row.amount)}`, '确认打款', {
      type: 'success'
    })
    
    const res = await axios.post(`/api/withdraw/admin/paid/${row.id}`)
    if (res.data.code === 200) {
      ElMessage.success('已确认打款')
      fetchData()
    } else {
      ElMessage.error(res.data.msg || '操作失败')
    }
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error('操作失败')
    }
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.withdraw-list-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 金额统计卡片样式 */
.amount-stats-row {
  margin-bottom: 8px;
}

.amount-card {
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  color: white;
  transition: all 0.3s ease;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  min-height: 100px;
}

.amount-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

.amount-card.total {
  background: linear-gradient(135deg, #0e7bd4 0%, #1e5fae 100%);
}

.amount-card.pending-pay {
  background: linear-gradient(135deg, #f43f5e 0%, #e11d48 100%);
}

.amount-card.paid-amount {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.amount-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.amount-info {
  flex: 1;
}

.amount-value {
  font-size: 28px;
  font-weight: 800;
  line-height: 1.2;
  margin-bottom: 4px;
  text-shadow: 0 2px 4px rgba(0,0,0,0.1);
  font-family: 'DIN Alternate', sans-serif;
}

.amount-label {
  font-size: 13px;
  opacity: 0.9;
  font-weight: 500;
}

/* 状态统计卡片样式 */
.stats-row {
  margin-bottom: 8px;
}

.stat-card {
  background: white;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  border: 1px solid #e2e8f0;
  transition: all 0.3s ease;
}

.stat-card.clickable {
  cursor: pointer;
}

.stat-card.clickable:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
  border-color: transparent;
}

.stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.stat-card.pending .stat-icon {
  background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%);
  color: #c2410c;
}

.stat-card.approved .stat-icon {
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  color: #1d4ed8;
}

.stat-card.paid .stat-icon {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  color: #065f46;
}

.stat-card.rejected .stat-icon {
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  color: #991b1b;
}

.stat-card.failed .stat-icon {
  background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
  color: #d97706;
}

.stat-value {
  font-size: 24px;
  font-weight: 800;
  color: #1e293b;
}

.stat-label {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
}

.stat-amount {
  margin-top: 6px;
  font-size: 14px;
  color: #0f172a;
  font-weight: 700;
}

/* 筛选卡片 */
.filter-card {
  border-radius: 12px;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}

/* Tabs卡片 */
.tabs-card {
  border-radius: 12px;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}

:deep(.el-tabs__nav-wrap::after) {
  height: 1px;
  background-color: #f1f5f9;
}

:deep(.el-tabs__item) {
  font-size: 15px;
  height: 50px;
}

.tab-label {
  display: flex;
  align-items: center;
  gap: 6px;
}

.tab-icon {
  font-size: 16px;
}

/* 用户信息单元格 */
.user-info-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-detail {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.user-name {
  font-weight: 600;
  font-size: 14px;
  color: #1e293b;
}

.user-id {
  font-size: 12px;
  color: #94a3b8;
}

/* 金额样式 */
.amount {
  font-weight: 700;
  color: #0f172a;
  font-family: 'DIN Alternate', sans-serif;
}

.fee {
  color: #94a3b8;
  font-size: 13px;
}

.actual {
  font-weight: 700;
  color: #059669;
  font-family: 'DIN Alternate', sans-serif;
}

.pagination-wrapper {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

/* 批量操作栏 */
.batch-bar {
  margin-top: 12px;
  animation: slideDown 0.2s ease;
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}

.batch-bar-inner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  border: 1px solid #93c5fd;
  border-radius: 10px;
}

.batch-info {
  font-size: 14px;
  color: #1e40af;
  margin-right: 8px;
}

.batch-info strong {
  font-size: 18px;
  color: #1d4ed8;
}
</style>
