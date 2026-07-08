<template>
  <div class="user-list-page">
    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stat-cards">
      <el-col :span="6">
        <div class="stat-card users">
          <div class="stat-icon">👥</div>
          <div class="stat-info">
            <div class="stat-value">{{ total }}</div>
            <div class="stat-label">总用户数</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card active">
          <div class="stat-icon">📱</div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.hasDeviceCount || 0 }}</div>
            <div class="stat-label">有设备用户</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card balance">
          <div class="stat-icon">💰</div>
          <div class="stat-info">
            <div class="stat-value">¥{{ stats.totalBalance || '0.00' }}</div>
            <div class="stat-label">总余额</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card quota">
          <div class="stat-icon">⚡</div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.totalQuota || 0 }}</div>
            <div class="stat-label">总算力值</div>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 搜索栏 -->
    <el-card class="search-card" shadow="never">
      <el-row :gutter="16" align="middle">
        <el-col :span="5">
          <el-input 
            v-model="searchKeyword" 
            placeholder="搜索昵称/ID/手机号/OpenID" 
            prefix-icon="Search"
            clearable
            @clear="handleSearch"
            @keyup.enter="handleSearch"
          />
        </el-col>
        <el-col :span="4">
          <el-select v-model="filterType" placeholder="筛选条件" clearable @change="handleSearch">
            <el-option label="全部用户" value="" />
            <el-option label="有设备" value="hasDevice" />
            <el-option label="有余额" value="hasBalance" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-select v-model="userTypeFilter" placeholder="用户类型" clearable @change="handleSearch">
            <el-option label="全部类型" value="" />
            <el-option label="个人用户" value="personal" />
            <el-option label="公司用户" value="company" />
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-button type="primary" @click="handleSearch">🔍 搜索</el-button>
          <el-button @click="resetSearch">重置</el-button>
          <el-button type="success" @click="refreshData">🔄 刷新</el-button>
          <el-button type="warning" @click="refreshLevels">📊 同步等级</el-button>
        </el-col>
        <el-col :span="5" style="text-align: right;">
          <span class="total-count">共 {{ total }} 位用户</span>
        </el-col>
      </el-row>
    </el-card>

    <!-- 用户列表 -->
    <el-card class="table-card" shadow="never">
      <el-table :data="userList" v-loading="loading" stripe>
        <el-table-column label="ID" width="110">
          <template #default="{ row }">
            <code class="table-id-code">{{ String(row.id).padStart(6, '0') }}</code>
          </template>
        </el-table-column>
        <el-table-column label="用户信息" min-width="220">
          <template #default="{ row }">
            <div class="user-info">
              <el-avatar :size="45" :src="row.avatarUrl || ''">
                {{ (row.nickname || '微信用户').charAt(0) }}
              </el-avatar>
              <div class="user-detail">
                <div class="nickname">{{ row.nickname || '微信用户' }}</div>
                <div class="phone" v-if="row.phone">📱 {{ row.phone }}</div>
                <div class="openid">
                  <el-tooltip :content="row.openid" placement="top">
                    <span>{{ row.openid?.substring(0, 12) }}...</span>
                  </el-tooltip>
                </div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="余额" width="100">
          <template #default="{ row }">
            <span class="balance">¥{{ row.balance || '0.00' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="算力值" width="90">
          <template #default="{ row }">
            <span class="quota-value">⚡{{ row.quota ?? 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column label="设备" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.deviceCount > 0" type="success" effect="dark" round size="small">
              📱 {{ row.deviceCount }}
            </el-tag>
            <el-tag v-else type="info" effect="plain" round size="small">0</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="用户类型" width="100">
          <template #default="{ row }">
            <el-tag :type="getUserTypeTag(row.userType)" size="small" effect="plain">
              {{ getUserTypeText(row.userType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="等级" width="100">
          <template #default="{ row }">
            <el-tag :type="getLevelTag(row.level)" size="small" effect="dark">
              {{ getLevelText(row.level) }}
            </el-tag>
            <el-tooltip v-if="row.levelManual" content="等级已锁定 (不参与自动晋升)" placement="top">
              <span style="margin-left: 4px; cursor: help;">🔒</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="创作" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.taskCount > 0" type="warning" effect="dark" round size="small">
              🎨 {{ row.taskCount }}
            </el-tag>
            <el-tag v-else type="info" effect="plain" round size="small">0</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="邀请人" width="160">
          <template #default="{ row }">
            <div class="user-info-cell" v-if="row.inviterId">
              <el-avatar :size="24" :src="row.inviterAvatarUrl || 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'" />
              <div class="user-detail">
                <div class="user-name">{{ row.inviterNickname || '未知' }}</div>
                <div class="user-id">ID: {{ row.inviterId }}</div>
              </div>
            </div>
            <span v-else class="text-gray-400" style="font-size: 12px;">无邀请人</span>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="注册时间" width="160">
          <template #default="{ row }">
            <span class="create-time">{{ formatTime(row.createTime) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="300" fixed="right">
          <template #default="{ row }">
            <div style="display: flex; gap: 4px; flex-wrap: nowrap;">
              <el-button size="small" type="primary" @click="viewUser(row)">详情</el-button>
              <el-button size="small" @click="editUser(row)">编辑</el-button>
              <el-button size="small" type="warning" @click="rechargeQuota(row)">充值</el-button>
              <el-button 
                size="small" 
                :type="row.withdrawDisabled ? 'success' : 'danger'" 
                @click="toggleWithdraw(row)"
              >
                {{ row.withdrawDisabled ? '解禁' : '禁提' }}
              </el-button>
            </div>
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
          @size-change="fetchUsers"
          @current-change="fetchUsers"
        />
      </div>
    </el-card>

    <!-- 用户详情弹窗 -->
    <el-dialog v-model="detailVisible" title="用户详情" width="800px" top="5vh">
      <div class="user-detail-dialog" v-if="currentUser" v-loading="detailLoading">
        <!-- 用户基本信息 -->
        <div class="detail-header">
          <el-avatar :size="80" :src="currentUser.avatarUrl || ''">
            {{ (currentUser.nickname || '微信用户').charAt(0) }}
          </el-avatar>
          <div class="header-info">
            <div class="header-name">{{ currentUser.nickname || '微信用户' }}</div>
            <div class="header-id">ID: {{ currentUser.id }} | {{ currentUser.phone || '未绑定手机' }}</div>
          </div>
          <div class="header-stats">
            <div class="stat-item">
              <div class="stat-num balance">¥{{ currentUser.balance || '0.00' }}</div>
              <div class="stat-text">余额</div>
            </div>
            <div class="stat-item">
              <div class="stat-num quota-value">⚡ {{ currentUser.quota ?? 0 }}</div>
              <div class="stat-text">算力值</div>
            </div>
            <div class="stat-item">
              <div class="stat-num">¥{{ currentUser.totalEarnings || '0.00' }}</div>
              <div class="stat-text">总收益</div>
            </div>
          </div>
        </div>

        <el-divider />

        <!-- 设备列表 -->
        <div class="detail-section">
          <div class="section-title" style="display: flex; justify-content: space-between; align-items: center;">
            <span>📱 绑定的设备 ({{ currentUser.devices?.length || 0 }} 台)</span>
            <el-button 
              type="danger" 
              size="small" 
              plain
              :disabled="selectedDevices.length === 0" 
              @click="handleBatchUnbind"
            >
              批量解绑
            </el-button>
          </div>
          <div class="empty-tip" v-if="!currentUser.devices || currentUser.devices.length === 0">
            该用户暂未绑定设备
          </div>
          <el-table :data="currentUser.devices" v-else size="small" stripe @selection-change="handleSelectionChange">
            <el-table-column type="selection" width="55" />
            <el-table-column prop="sn" label="设备 SN" width="180">
              <template #default="{ row }">
                <code class="sn-code">{{ row.sn }}</code>
              </template>
            </el-table-column>
            <el-table-column prop="name" label="设备名称" width="100">
              <template #default="{ row }">
                {{ row.name || '未命名' }}
              </template>
            </el-table-column>
            <el-table-column prop="location" label="位置" width="130">
              <template #default="{ row }">
                <span class="location-text" v-if="row.location">{{ row.location }}</span>
                <span v-else style="color: #ccc; font-size: 11px;">未知位置</span>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="90">
              <template #default="{ row }">
                <el-tag :type="row.status === 1 ? 'success' : 'info'" effect="dark" size="small" round>
                  {{ row.status === 1 ? '🟢 在线' : '⚫ 离线' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="设备收益" width="120">
              <template #default="{ row }">
                <span class="device-earnings">¥{{ row.earnings || '0.00' }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="lastHeartbeatTime" label="最后心跳">
              <template #default="{ row }">
                <span class="time-text">{{ formatTime(row.lastHeartbeatTime) || '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="bindTime" label="绑定时间">
              <template #default="{ row }">
                <span class="time-text">{{ formatTime(row.bindTime) || '-' }}</span>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 基础信息 -->
        <div class="detail-section">
          <div class="section-title">📋 基础信息</div>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="用户 ID">{{ currentUser.id }}</el-descriptions-item>
            <el-descriptions-item label="昵称">{{ currentUser.nickname || '-' }}</el-descriptions-item>
            <el-descriptions-item label="手机号">{{ currentUser.phone || '未绑定' }}</el-descriptions-item>
            <el-descriptions-item label="用户类型">
              <el-tag :type="getUserTypeTag(currentUser.userType)" size="small">
                {{ getUserTypeText(currentUser.userType) }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="备注" :span="2">{{ currentUser.remark || '-' }}</el-descriptions-item>
            <el-descriptions-item label="算力值">⚡ {{ currentUser.quota ?? 0 }}</el-descriptions-item>
            <el-descriptions-item label="OpenID" :span="2">
              <code>{{ currentUser.openid }}</code>
            </el-descriptions-item>
            <el-descriptions-item label="注册时间" :span="2">{{ currentUser.createTime }}</el-descriptions-item>
            <el-descriptions-item label="邀请人" :span="2">
              <div class="user-info-cell" v-if="currentUser.inviterId">
                <el-avatar :size="20" :src="currentUser.inviterAvatarUrl || 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'" />
                <span style="margin-left: 8px;">
                  ID: {{ currentUser.inviterId }} 
                  <span v-if="currentUser.inviterNickname">({{ currentUser.inviterNickname }})</span>
                </span>
              </div>
              <span v-else class="text-gray-400">无邀请人</span>
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </div>
    </el-dialog>

    <!-- 编辑弹窗 -->
    <!-- 编辑弹窗 -->
    <el-dialog v-model="editVisible" title="编辑用户信息" width="550px" class="user-edit-dialog">
      <div class="edit-container">
        <el-form :model="editForm" label-width="100px" label-position="left">
          <div class="form-section">
            <div class="section-badge">基本信息</div>
            <el-form-item label="用户昵称">
              <el-input v-model="editForm.nickname" placeholder="请输入用户昵称" prefix-icon="User" />
            </el-form-item>
            <el-form-item label="手机号码">
              <el-input v-model="editForm.phone" placeholder="请输入手机号" prefix-icon="Iphone" />
            </el-form-item>
            <el-form-item label="用户类型">
              <el-radio-group v-model="editForm.userType">
                <el-radio-button label="personal">个人用户</el-radio-button>
                <el-radio-button label="company">公司用户</el-radio-button>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="备注">
              <el-input
                v-model="editForm.remark"
                type="textarea"
                :rows="3"
                maxlength="500"
                show-word-limit
                placeholder="请输入后台备注"
              />
            </el-form-item>
          </div>

          <div class="form-section">
            <div class="section-badge account">账户资产</div>
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="账户余额">
                  <el-input-number v-model="editForm.balance" :precision="2" :min="0" :max="999999" style="width: 100%" disabled />
                  <div class="unit-text">元</div>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="算力配额">
                  <el-input-number v-model="editForm.quota" :min="0" :max="999999" style="width: 100%" disabled />
                  <div class="unit-text">点</div>
                </el-form-item>
              </el-col>
            </el-row>
            <div class="form-tip sync-tip">💡 资产不在编辑资料时保存，调整算力请使用列表中的充值入口</div>
          </div>

          <div class="form-section">
            <div class="section-badge level">身份等级</div>
            <el-form-item label="用户等级">
              <el-select v-model="editForm.level" placeholder="请选择等级" :disabled="!editForm.levelManual" style="width: 100%">
                <el-option label="普通用户" :value="0" />
                <el-option label="白银会员" :value="1" />
                <el-option label="社区领袖" :value="2" />
                <el-option label="县级代理" :value="3" />
                <el-option label="市级代理" :value="4" />
                <el-option label="联合创始人" :value="5" />
              </el-select>
            </el-form-item>
            <el-form-item label="自动升级">
              <div class="switch-wrapper">
                <el-switch 
                  v-model="editForm.levelManual" 
                  :active-value="false" 
                  :inactive-value="true"
                  active-text="开启自动晋升" 
                  inactive-text="锁定指定等级"
                />
              </div>
            </el-form-item>
          </div>

          <div class="form-section">
            <div class="section-badge invite">分润关系</div>
            <el-form-item label="邀请人">
              <el-select 
                v-model="editForm.inviterId" 
                placeholder="输入昵称或ID搜索邀请人" 
                filterable 
                remote 
                reserve-keyword
                :remote-method="searchInviter"
                :loading="inviterSearching"
                style="width: 100%;"
                clearable
              >
                <el-option 
                  v-for="user in inviterSearchOptions" 
                  :key="user.id" 
                  :label="`${user.nickname || '用户'} (ID: ${user.id})`" 
                  :value="user.id" 
                >
                  <div class="inviter-option">
                    <el-avatar :size="24" :src="user.avatarUrl || ''" />
                    <span>{{ user.nickname || '用户' }}</span>
                    <span class="id-tag">ID: {{ user.id }}</span>
                  </div>
                </el-option>
              </el-select>
              <div class="form-tip warning">⚠️ 修改后将直接影响所有下级产生的分润归属</div>
            </el-form-item>
          </div>
        </el-form>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="editVisible = false" round>取 消</el-button>
          <el-button type="primary" @click="saveUser" :loading="saving" round>保 存 更 改</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 充值算力值弹窗 -->
    <el-dialog v-model="rechargeVisible" title="充值算力值" width="400px">
      <el-form :model="rechargeForm" label-width="80px">
        <el-form-item label="当前算力值">
          <span class="quota-value">⚡ {{ rechargeForm.currentQuota }}</span>
        </el-form-item>
        <el-form-item label="充值数量">
          <el-input-number v-model="rechargeForm.amount" :min="1" :max="10000" />
          <span style="margin-left: 8px; color: #9ca3af;">点</span>
        </el-form-item>
        <el-form-item label="充值后">
          <span class="quota-value success">⚡ {{ rechargeForm.currentQuota + rechargeForm.amount }}</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rechargeVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmRecharge" :loading="saving">确认充值</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'

const userList = ref([])
const loading = ref(false)
const detailLoading = ref(false)
const saving = ref(false)
const searchKeyword = ref('')
const filterType = ref('')
const userTypeFilter = ref('')
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const stats = ref({})

const detailVisible = ref(false)
const editVisible = ref(false)
const rechargeVisible = ref(false)
const currentUser = ref(null)
const selectedDevices = ref([])

const editForm = reactive({
  id: null,
  nickname: '',
  phone: '',
  balance: 0,
  quota: 100,
  inviterId: null,
  level: 0,
  levelManual: false,
  userType: 'personal',
  remark: ''
})

const rechargeForm = reactive({
  userId: null,
  currentQuota: 0,
  amount: 100
})

// 邀请人搜索相关
const inviterSearchOptions = ref([])
const inviterSearching = ref(false)

const searchInviter = async (query) => {
    if (!query) {
        inviterSearchOptions.value = []
        return
    }
    inviterSearching.value = true
    try {
        const res = await axios.get('/api/user/list', {
            params: {
                page: 1,
                size: 20,
                keyword: query
            }
        })
        if (res.data.code === 200) {
            inviterSearchOptions.value = res.data.data.records || []
        }
    } catch (e) {
        console.error(e)
    } finally {
        inviterSearching.value = false
    }
}

const formatTime = (time) => {
  if (!time) return '-'
  return String(time).replace('T', ' ').substring(0, 19)
}

const fetchStats = async () => {
  try {
    const res = await axios.get('/api/user/stats')
    if (res.data.code === 200) {
      stats.value = res.data.data
    }
  } catch (e) {
    console.error(e)
  }
}

const fetchUsers = async () => {
  loading.value = true
  try {
    const res = await axios.get('/api/user/list', {
      params: {
        page: currentPage.value,
        size: pageSize.value,
        keyword: searchKeyword.value || undefined,
        filter: filterType.value || undefined,
        userType: userTypeFilter.value || undefined
      }
    })
    if (res.data.code === 200) {
      userList.value = res.data.data.records || []
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
  fetchUsers()
}

const resetSearch = () => {
  searchKeyword.value = ''
  filterType.value = ''
  userTypeFilter.value = ''
  currentPage.value = 1
  fetchUsers()
}

const refreshData = () => {
  fetchStats()
  fetchUsers()
  ElMessage.success('数据已刷新')
}

const refreshLevels = async () => {
  try {
    await ElMessageBox.confirm('确定要全员重新计算等级吗？这会根据当前设备数自动更新所有已开启自动升级的用户的等级。', '提示', {
      type: 'warning'
    })
    const res = await axios.get('/api/user/refresh-levels')
    if (res.data.code === 200) {
      ElMessage.success('等级同步完成')
      fetchUsers()
    } else {
      ElMessage.error(res.data.msg || '同步失败')
    }
  } catch (e) {
    if (e !== 'cancel') ElMessage.error('操作失败')
  }
}

const viewUser = async (row) => {
  detailVisible.value = true
  detailLoading.value = true
  currentUser.value = row // 先显示基本信息
  
  try {
    const res = await axios.get(`/api/user/detail/${row.id}`)
    if (res.data.code === 200) {
      currentUser.value = res.data.data
    }
  } catch (e) {
    console.error(e)
  } finally {
    detailLoading.value = false
  }
}

const editUser = (row) => {
  editForm.id = row.id
  editForm.nickname = row.nickname || ''
  editForm.phone = row.phone || ''
  editForm.balance = row.balance || 0
  editForm.quota = row.quota ?? 0
  editForm.inviterId = row.inviterId || null
  editForm.level = row.level || 0
  editForm.levelManual = row.levelManual || false
  editForm.userType = row.userType || 'personal'
  editForm.remark = row.remark || ''
  
  // 初始化邀请人下拉框选项
  if (row.inviterId) {
    inviterSearchOptions.value = [{
      id: row.inviterId,
      nickname: row.inviterNickname || '未知',
      avatarUrl: row.inviterAvatarUrl
    }]
  } else {
    inviterSearchOptions.value = []
  }
  
  editVisible.value = true
}

const rechargeQuota = (row) => {
  rechargeForm.userId = row.id
  rechargeForm.currentQuota = row.quota ?? 0
  rechargeForm.amount = 100
  rechargeVisible.value = true
}

const saveUser = async () => {
  saving.value = true
  try {
    // 1. 先保存基本信息（资产字段不在资料编辑中保存，避免覆盖余额）
    const updateRes = await axios.post('/api/user/update', {
      id: editForm.id,
      nickname: editForm.nickname,
      phone: editForm.phone,
      userType: editForm.userType || 'personal',
      remark: editForm.remark || ''
    })
    
    if (updateRes.data.code !== 200) {
      ElMessage.error(updateRes.data.msg || '保存失败')
      return
    }

    // 2. 单独处理等级更新（支持手动解锁自动升级）
    const levelRes = await axios.post('/api/user/updateLevel', {
      userId: editForm.id,
      level: editForm.level,
      levelManual: editForm.levelManual
    })
    
    if (levelRes.data.code !== 200) {
      ElMessage.warning('基本信息已保存，但等级更新失败: ' + levelRes.data.msg)
    }

    // 3. 单独处理邀请人更新
    const inviterRes = await axios.post('/api/user/updateInviter', {
      userId: editForm.id,
      inviterId: editForm.inviterId
    })

    if (inviterRes.data.code === 200) {
      ElMessage.success('保存成功')
      editVisible.value = false
      fetchUsers()
      fetchStats()
    } else {
      ElMessage.warning('基本信息已保存，但邀请人更新失败: ' + inviterRes.data.msg)
    }
  } catch (e) {
    ElMessage.error('网络错误')
  } finally {
    saving.value = false
  }
}

const getLevelText = (level) => {
  // 使用后台配置的等级名称
  const map = {
    0: '普通',
    1: '会员',
    2: '社区',
    3: '县级',
    4: '市级',
    5: '联创'
  }
  return map[level] || '普通'
}

const getLevelTag = (level) => {
  const map = {
    0: 'info',
    1: 'success',
    2: 'warning',
    3: 'danger',
    4: 'primary'
  }
  return map[level] || 'info'
}

const getUserTypeText = (type) => {
  return type === 'company' ? '公司用户' : '个人用户'
}

const getUserTypeTag = (type) => {
  return type === 'company' ? 'warning' : 'info'
}

const confirmRecharge = async () => {
  saving.value = true
  try {
    const res = await axios.post('/api/user/recharge-quota', {
      userId: rechargeForm.userId,
      amount: rechargeForm.amount
    })
    if (res.data.code === 200) {
      ElMessage.success(`成功充值 ${rechargeForm.amount} 算力值`)
      rechargeVisible.value = false
      fetchUsers()
      fetchStats()
    } else {
      ElMessage.error(res.data.msg || '充值失败')
    }
  } catch (e) {
    ElMessage.error('网络错误')
  } finally {
    saving.value = false
  }
}

const handleSelectionChange = (val) => {
  selectedDevices.value = val
}

const handleBatchUnbind = async () => {
  if (selectedDevices.value.length === 0) return
  
  try {
    await ElMessageBox.confirm(
      `确定要解绑选中的 ${selectedDevices.value.length} 台设备吗？`,
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    
    // 乐观更新 UI 或开启局部 loading
    const ids = selectedDevices.value.map(d => d.id)
    
    const res = await axios.post('/api/device/batch-unbind', { ids })
    if (res.data.code === 200) {
      ElMessage.success('批量解绑成功')
      
      // 刷新详情数据
      if (currentUser.value?.id) {
        const detailRes = await axios.get(`/api/user/detail/${currentUser.value.id}`)
        if (detailRes.data.code === 200) {
          currentUser.value = detailRes.data.data
        }
      }
      // 刷新列表统计
      fetchUsers()
      fetchStats()
      // 清空选择
      selectedDevices.value = []
    } else {
      ElMessage.error(res.data.msg || '解绑失败')
    }
  } catch (e) {
    if (e !== 'cancel') {
      console.error(e)
      ElMessage.error('操作失败')
    }
  }
}

const toggleWithdraw = async (row) => {
  const newStatus = !row.withdrawDisabled
  const action = newStatus ? '禁止' : '解禁'
  
  try {
    await ElMessageBox.confirm(
      `确定要${action}用户 "${row.nickname || row.id}" 的提现权限吗？`,
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    
    const res = await axios.post('/api/user/toggleWithdraw', {
      userId: row.id,
      disabled: newStatus
    })
    
    if (res.data.code === 200) {
      ElMessage.success(res.data.data || `已${action}该用户提现`)
      row.withdrawDisabled = newStatus
    } else {
      ElMessage.error(res.data.msg || '操作失败')
    }
  } catch (e) {
    if (e !== 'cancel') {
      console.error(e)
      ElMessage.error('操作失败')
    }
  }
}

onMounted(() => {
  fetchStats()
  fetchUsers()
})
</script>

<style scoped>
.user-list-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 统计卡片 - 渐变风格 */
.stat-cards {
  margin-bottom: 8px;
}

.stat-card {
  background: linear-gradient(135deg, #fff 0%, #f8fafc 100%);
  border-radius: 16px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
}

.stat-card.users {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  border-color: #93c5fd;
}

.stat-card.active {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  border-color: #6ee7b7;
}

.stat-card.balance {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-color: #fcd34d;
}

.stat-card.quota {
  background: linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%);
  border-color: #c4b5fd;
}

.stat-icon {
  font-size: 36px;
}

.stat-value {
  font-size: 32px;
  font-weight: 800;
  color: #1e293b;
}

.stat-label {
  font-size: 14px;
  color: #475569;
  font-weight: 500;
}

/* 搜索栏和表格卡片 */
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

.total-count {
  color: #64748b;
  font-size: 14px;
  background: rgba(124, 58, 237, 0.08);
  padding: 6px 12px;
  border-radius: 8px;
}

/* 用户信息样式 */
.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-detail {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nickname {
  font-weight: 700;
  color: #1e293b;
  font-size: 14px;
}

.phone {
  font-size: 12px;
  color: #059669;
  font-weight: 500;
}

.openid {
  font-size: 11px;
  color: #94a3b8;
}

/* 邀请人信息卡片 */
.user-info-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%);
  border-radius: 6px;
  border: 1px solid #e9d5ff;
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

/* 数值样式 */
.balance {
  color: #059669;
  font-weight: 700;
  font-size: 15px;
}

.quota-value {
  color: #d97706;
  font-weight: 700;
  font-size: 15px;
}

.quota-value.success {
  color: #059669;
}

.create-time, .time-text {
  font-size: 12px;
  color: #64748b;
}

/* 分页 */
.pagination-wrapper {
  margin-top: 20px;
  padding: 16px;
  display: flex;
  justify-content: flex-end;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
}

/* 表格头部样式 */
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

/* 表格行hover */
:deep(.el-table__row) {
  transition: all 0.2s ease;
}

:deep(.el-table__row:hover) {
  background: linear-gradient(135deg, #faf5ff 0%, #f5f3ff 100%) !important;
}

/* 详情弹窗样式 */
.user-detail-dialog {
  padding: 0 10px;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 20px;
  background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%);
  border-radius: 12px;
  margin-bottom: 20px;
}

.header-info {
  flex: 1;
}

.form-tip {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 4px;
}

.header-name {
  font-size: 22px;
  font-weight: 800;
  color: #1e293b;
}

.header-id {
  font-size: 13px;
  color: #64748b;
  margin-top: 6px;
}

.header-stats {
  display: flex;
  gap: 28px;
}

.stat-item {
  text-align: center;
  background: rgba(255, 255, 255, 0.8);
  padding: 12px 20px;
  border-radius: 10px;
}

.stat-num {
  font-size: 20px;
  font-weight: 800;
  color: #1e293b;
}

.stat-text {
  font-size: 12px;
  color: #64748b;
  margin-top: 4px;
}

.detail-section {
  margin-top: 24px;
}

.section-title {
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 14px;
}

.empty-tip {
  color: #94a3b8;
  font-size: 14px;
  text-align: center;
  padding: 24px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 10px;
  border: 1px dashed #cbd5e1;
}

.sn-code {
  font-family: 'SF Mono', 'Monaco', monospace;
  font-size: 12px;
  color: #0b62aa;
  background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%);
  padding: 3px 8px;
  border-radius: 4px;
  border: 1px solid #c4b5fd;
}

.device-earnings {
  color: #059669;
  font-weight: 700;
}

code {
  font-family: 'SF Mono', 'Monaco', monospace;
  font-size: 12px;
  color: #0b62aa;
  background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%);
  padding: 3px 8px;
  border-radius: 4px;
}

.table-id-code {
  display: inline-block;
  white-space: nowrap;
  word-break: keep-all;
}

.user-info-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.user-info-cell .user-detail {
  min-width: 0;
}

.user-info-cell .user-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-info-cell .user-id {
  white-space: nowrap;
  word-break: keep-all;
}

/* 按钮样式 */
:deep(.el-button--success) {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border: none;
}

:deep(.el-button--warning) {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  border: none;
}

/* 标签样式增强 */
:deep(.el-tag--success) {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  border-color: #6ee7b7;
  color: #047857;
  font-weight: 600;
}

:deep(.el-tag--warning) {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-color: #fcd34d;
  color: #92400e;
  font-weight: 600;
}

:deep(.el-tag--info) {
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  border-color: #cbd5e1;
  color: #64748b;
}

:deep(.el-tag--danger) {
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  border-color: #fca5a5;
  color: #b91c1c;
  font-weight: 600;
}

:deep(.el-tag--primary) {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  border-color: #93c5fd;
  color: #1d4ed8;
  font-weight: 600;
}
/* ========== 编辑用户弹窗样式 ========== */
.user-edit-dialog :deep(.el-dialog__body) {
  padding: 10px 24px 24px;
}

.edit-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-section {
  position: relative;
  padding: 24px 16px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  margin-bottom: 24px;
  background: #fff;
}

.section-badge {
  position: absolute;
  top: -12px;
  left: 16px;
  background: linear-gradient(135deg, #0e7bd4 0%, #0b62aa 100%);
  color: #fff;
  padding: 2px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  box-shadow: 0 2px 4px rgba(79, 70, 229, 0.3);
}

.section-badge.account {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  box-shadow: 0 2px 4px rgba(16, 185, 129, 0.3);
}

.section-badge.level {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  box-shadow: 0 2px 4px rgba(245, 158, 11, 0.3);
}

.section-badge.invite {
  background: linear-gradient(135deg, #ec4899 0%, #db2777 100%);
  box-shadow: 0 2px 4px rgba(236, 72, 153, 0.3);
}

.unit-text {
  position: absolute;
  right: -25px;
  top: 0;
  color: #94a3b8;
  font-size: 13px;
}

.sync-tip {
  margin-top: 8px;
  text-align: center;
  color: #0e7bd4;
  background: #f5f3ff;
  padding: 4px;
  border-radius: 4px;
  font-size: 12px;
}

.form-tip.warning {
  color: #ef4444;
  background: #fef2f2;
  padding: 6px 10px;
  border-radius: 6px;
  margin-top: 8px;
  line-height: 1.4;
  font-weight: 500;
}

.switch-wrapper {
  background: #f8fafc;
  padding: 8px 16px;
  border-radius: 8px;
  display: inline-block;
}

.inviter-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 0;
}

.id-tag {
  margin-left: auto;
  font-size: 11px;
  background: #f1f5f9;
  color: #64748b;
  padding: 1px 6px;
  border-radius: 4px;
}

.dialog-footer {
  display: flex;
  justify-content: center;
  gap: 12px;
  padding-top: 10px;
}

/* 底部缓冲 Padding */
.user-list-page {
  padding-bottom: 80px;
}
</style>
