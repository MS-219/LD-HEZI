<template>
  <div class="exchange-order-page">
    <!-- 统计卡片 -->
    <div class="stats-row">
      <div class="stat-card" v-for="s in statCards" :key="s.key">
        <div class="stat-value">{{ stats[s.key] || 0 }}</div>
        <div class="stat-label">{{ s.label }}</div>
      </div>
    </div>

    <!-- 筛选栏 -->
    <div class="page-header">
      <div class="header-left">
        <el-input v-model="keyword" placeholder="搜索订单号/收货人/手机号" prefix-icon="Search" clearable style="width: 280px" @keyup.enter="fetchOrders" />
        <el-select v-model="statusFilter" placeholder="订单状态" clearable style="width: 140px" @change="fetchOrders">
          <el-option label="待发货" :value="0" />
          <el-option label="已发货" :value="1" />
          <el-option label="运输中" :value="2" />
          <el-option label="已到货" :value="3" />
          <el-option label="已取消" :value="4" />
        </el-select>
        <el-button type="primary" :icon="Search" @click="fetchOrders">搜索</el-button>
      </div>
    </div>

    <!-- 订单表格 -->
    <el-table :data="orders" v-loading="loading" stripe>
      <el-table-column prop="orderNo" label="订单编号" width="180">
        <template #default="{ row }">
          <span class="mono-text">{{ row.orderNo }}</span>
        </template>
      </el-table-column>
      <el-table-column label="用户" width="140">
        <template #default="{ row }">
          <div class="user-cell">
            <span>{{ row.nickname || row.userId }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="商品" min-width="160">
        <template #default="{ row }">
          <div class="product-cell">
            <el-image :src="row.productImage" style="width: 40px; height: 40px; border-radius: 6px" fit="cover" v-if="row.productImage" />
            <span>{{ row.productName }} ×{{ row.quantity }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="金额/算力" width="140">
        <template #default="{ row }">
          <div>¥{{ row.totalPrice }}</div>
          <div class="hashrate-text">⚡ {{ row.hashrateCost }}</div>
        </template>
      </el-table-column>
      <el-table-column label="收货信息" min-width="200">
        <template #default="{ row }">
          <div>{{ row.receiverName }} {{ row.receiverPhone }}</div>
          <div class="address-text">{{ row.receiverAddress }}</div>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="statusTypes[row.status]" size="small">{{ statusTexts[row.status] }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createTime" label="下单时间" width="170" />
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link size="small" @click="showShipDialog(row)" v-if="row.status === 0">发货</el-button>
          <el-button type="success" link size="small" @click="updateStatus(row, 2)" v-if="row.status === 1">标记运输中</el-button>
          <el-button type="success" link size="small" @click="updateStatus(row, 3)" v-if="row.status === 2">标记已到货</el-button>
          <el-button type="danger" link size="small" @click="returnOrder(row)" v-if="canReturn(row)">退回</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination-wrap">
      <el-pagination background layout="total, prev, pager, next" :total="total" :page-size="pageSize" v-model:current-page="currentPage" @current-change="fetchOrders" />
    </div>

    <!-- 发货弹窗 -->
    <el-dialog v-model="shipDialogVisible" title="订单发货" width="480px" destroy-on-close>
      <el-form :model="shipForm" label-width="80px">
        <el-form-item label="快递公司" required>
          <el-select v-model="shipForm.expressCompany" placeholder="选择快递公司" filterable allow-create>
            <el-option label="顺丰速运" value="顺丰速运" />
            <el-option label="中通快递" value="中通快递" />
            <el-option label="圆通速递" value="圆通速递" />
            <el-option label="韵达快递" value="韵达快递" />
            <el-option label="申通快递" value="申通快递" />
            <el-option label="极兔速递" value="极兔速递" />
            <el-option label="邮政EMS" value="邮政EMS" />
            <el-option label="京东快递" value="京东快递" />
            <el-option label="德邦快递" value="德邦快递" />
          </el-select>
        </el-form-item>
        <el-form-item label="快递单号" required>
          <el-input v-model="shipForm.expressNo" placeholder="请输入快递单号" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="shipForm.adminRemark" type="textarea" :rows="2" placeholder="管理员备注（可选）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="shipDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="doShip" :loading="shipping">确认发货</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'

const API = import.meta.env.VITE_API_BASE || ''
const getToken = () => localStorage.getItem('token')
const headers = () => ({ Authorization: `Bearer ${getToken()}` })

const statusTexts = ['待发货', '已发货', '运输中', '已到货', '已取消']
const statusTypes = ['warning', 'primary', '', 'success', 'danger']
const statCards = [
  { key: 'totalOrders', label: '总订单' },
  { key: 'pendingOrders', label: '待发货' },
  { key: 'shippedOrders', label: '已发货' },
  { key: 'completedOrders', label: '已完成' },
  { key: 'cancelledOrders', label: '已取消' }
]

const orders = ref([])
const loading = ref(false)
const keyword = ref('')
const statusFilter = ref(null)
const total = ref(0)
const currentPage = ref(1)
const pageSize = 20
const stats = reactive({})

const shipDialogVisible = ref(false)
const shippingOrderId = ref(null)
const shipping = ref(false)
const shipForm = ref({ expressCompany: '', expressNo: '', adminRemark: '' })

const fetchOrders = async () => {
  loading.value = true
  try {
    const params = { page: currentPage.value, size: pageSize }
    if (keyword.value) params.keyword = keyword.value
    if (statusFilter.value !== null && statusFilter.value !== '') params.status = statusFilter.value
    const { data } = await axios.get(`${API}/api/admin/exchange/orders`, { params, headers: headers() })
    if (data.code === 200) {
      orders.value = data.data.records
      total.value = data.data.total
    }
  } finally {
    loading.value = false
  }
}

const fetchStats = async () => {
  const { data } = await axios.get(`${API}/api/admin/exchange/statistics`, { headers: headers() })
  if (data.code === 200) Object.assign(stats, data.data)
}

const showShipDialog = (row) => {
  shippingOrderId.value = row.id
  shipForm.value = { expressCompany: '', expressNo: '', adminRemark: '' }
  shipDialogVisible.value = true
}

const doShip = async () => {
  if (!shipForm.value.expressCompany) { ElMessage.warning('请选择快递公司'); return }
  if (!shipForm.value.expressNo) { ElMessage.warning('请输入快递单号'); return }
  shipping.value = true
  try {
    const { data } = await axios.post(`${API}/api/admin/exchange/order/${shippingOrderId.value}/ship`, shipForm.value, { headers: headers() })
    if (data.code === 200) {
      ElMessage.success('发货成功')
      shipDialogVisible.value = false
      fetchOrders()
      fetchStats()
    } else {
      ElMessage.error(data.msg || '发货失败')
    }
  } finally {
    shipping.value = false
  }
}

const updateStatus = async (row, newStatus) => {
  const { data } = await axios.post(`${API}/api/admin/exchange/order/${row.id}/updateStatus`, { status: newStatus }, { headers: headers() })
  if (data.code === 200) {
    ElMessage.success('状态更新成功')
    fetchOrders()
    fetchStats()
  } else {
    ElMessage.error(data.msg || '更新失败')
  }
}

const canReturn = (row) => row.status !== 3 && row.status !== 4

const returnOrder = async (row) => {
  try {
    const remark = await ElMessageBox.prompt(
      `确定退回订单 ${row.orderNo} 吗？系统会取消订单，并返还用户 ${row.hashrateCost || 0} 算力值。`,
      '退回订单',
      {
        confirmButtonText: '确认退回',
        cancelButtonText: '取消',
        inputPlaceholder: '请输入退回原因（可选）',
        inputType: 'textarea',
        type: 'warning'
      }
    )

    const { data } = await axios.post(
      `${API}/api/admin/exchange/order/${row.id}/cancel`,
      { adminRemark: remark.value || '' },
      { headers: headers() }
    )
    if (data.code === 200) {
      ElMessage.success(data.msg || '订单已退回')
      fetchOrders()
      fetchStats()
    } else {
      ElMessage.error(data.msg || '退回失败')
    }
  } catch (e) {
    if (e !== 'cancel') ElMessage.error('退回失败')
  }
}

onMounted(() => { fetchOrders(); fetchStats() })
</script>

<style scoped>
.exchange-order-page { padding: 0; }
.stats-row { display: flex; gap: 16px; margin-bottom: 20px; }
.stat-card { flex: 1; background: #fff; border-radius: 12px; padding: 20px; text-align: center; border: 1px solid #f0f0f0; }
.stat-value { font-size: 28px; font-weight: 800; color: #1e293b; }
.stat-label { font-size: 13px; color: #94a3b8; margin-top: 4px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.header-left { display: flex; gap: 12px; align-items: center; }
.mono-text { font-family: 'Courier New', monospace; font-size: 12px; color: #64748b; }
.user-cell { display: flex; align-items: center; gap: 8px; }
.product-cell { display: flex; align-items: center; gap: 8px; }
.hashrate-text { font-size: 12px; color: #f59e0b; font-weight: 600; }
.address-text { font-size: 12px; color: #94a3b8; margin-top: 2px; }
.pagination-wrap { display: flex; justify-content: flex-end; margin-top: 20px; }
</style>
