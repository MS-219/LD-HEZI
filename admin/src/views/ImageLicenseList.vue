<template>
  <div class="image-license-page">
    <div class="toolbar">
      <div class="filters">
        <el-input
          v-model="keyword"
          placeholder="搜索镜像名称/授权码/版本"
          clearable
          class="keyword-input"
          @clear="handleSearch"
          @keyup.enter="handleSearch"
        />
        <el-select v-model="status" placeholder="授权状态" clearable class="status-select" @change="handleSearch">
          <el-option label="可用" value="active" />
          <el-option label="已销毁" value="revoked" />
        </el-select>
        <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
      </div>
      <el-button type="primary" :icon="Plus" @click="openCreateDialog">新增镜像授权</el-button>
    </div>

    <el-table :data="licenses" v-loading="loading" stripe class="license-table">
      <el-table-column prop="name" label="镜像名称" min-width="160" />
      <el-table-column prop="imageVersion" label="镜像版本" width="140">
        <template #default="{ row }">
          {{ row.imageVersion || '-' }}
        </template>
      </el-table-column>
      <el-table-column label="授权码" min-width="260">
        <template #default="{ row }">
          <div class="license-key-cell">
            <span class="license-key">{{ row.licenseKey }}</span>
              <el-button type="primary" link :icon="Document" @click="copyText(row.licenseKey)">复制</el-button>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.status === 'active' ? 'success' : 'danger'">
            {{ row.status === 'active' ? '可用' : '已销毁' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="绑定工厂账号" min-width="150">
        <template #default="{ row }">
          <span class="factory-username">{{ row.factoryUsername || '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="激活设备" width="120">
        <template #default="{ row }">
          <el-button type="primary" link @click="openDevices(row)">
            {{ row.activationCount || 0 }} 台
          </el-button>
        </template>
      </el-table-column>
      <el-table-column prop="lastSeenAt" label="最近接入" width="170">
        <template #default="{ row }">
          {{ row.lastSeenAt || '-' }}
        </template>
      </el-table-column>
      <el-table-column prop="createTime" label="创建时间" width="170" />
      <el-table-column prop="remark" label="备注" min-width="160">
        <template #default="{ row }">
          {{ row.remark || '-' }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="250" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link @click="openDevices(row)">设备</el-button>
          <el-button v-if="!hasFactoryBound(row)" type="primary" link @click="openFactoryDialog(row)">绑定工厂</el-button>
          <el-button type="danger" link :disabled="row.status !== 'active'" @click="revokeLicense(row)">
            销毁
          </el-button>
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
        @size-change="fetchLicenses"
        @current-change="fetchLicenses"
      />
    </div>

    <el-dialog v-model="createVisible" title="新增镜像授权" width="520px">
      <el-form :model="createForm" label-width="92px">
        <el-form-item label="镜像名称" required>
          <el-input v-model="createForm.name" placeholder="例如：Ubuntu 算力节点 2026-05" />
        </el-form-item>
        <el-form-item label="镜像版本">
          <el-input v-model="createForm.imageVersion" placeholder="例如：image-2026.05.10" />
        </el-form-item>
        <el-form-item label="工厂账号">
          <el-input v-model="createForm.factoryUsername" clearable placeholder="可选，填写工厂后台登录用户名" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="createForm.remark" type="textarea" :rows="3" placeholder="用途、批次或交付对象" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="createLicense">生成授权码</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="createdVisible" title="镜像授权已生成" width="560px">
      <div v-if="createdLicense" class="created-content">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="镜像名称">{{ createdLicense.name }}</el-descriptions-item>
          <el-descriptions-item label="镜像版本">{{ createdLicense.imageVersion || '-' }}</el-descriptions-item>
          <el-descriptions-item label="绑定工厂账号">{{ createdLicense.factoryUsername || '-' }}</el-descriptions-item>
          <el-descriptions-item label="授权码">
            <div class="license-key-cell">
              <span class="license-key">{{ createdLicense.licenseKey }}</span>
              <el-button type="primary" link :icon="Document" @click="copyText(createdLicense.licenseKey)">复制</el-button>
            </div>
          </el-descriptions-item>
        </el-descriptions>
        <div class="command-box">
          <div class="command-title">写入镜像母机</div>
          <div class="command-line">
            {{ buildWriteCommand(createdLicense) }}
          </div>
          <el-button size="small" type="primary" :icon="Document" @click="copyText(buildWriteCommand(createdLicense))">
            复制命令
          </el-button>
        </div>
      </div>
      <template #footer>
        <el-button type="primary" @click="createdVisible = false">知道了</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="factoryVisible" title="绑定工厂账号" width="460px">
      <el-form :model="factoryForm" label-width="96px">
        <el-form-item label="镜像授权">
          <span>{{ factoryForm.licenseName }}</span>
        </el-form-item>
        <el-form-item label="工厂账号">
          <el-input
            v-model="factoryForm.factoryUsername"
            clearable
            placeholder="填写工厂后台登录用户名，留空则取消绑定"
            @keyup.enter="submitFactory"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="factoryVisible = false">取消</el-button>
        <el-button type="primary" :loading="factorySaving" @click="submitFactory">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="devicesVisible"
      :title="`激活设备 - ${currentLicenseName}`"
      width="980px"
    >
      <el-table :data="devices" v-loading="devicesLoading" stripe>
        <el-table-column prop="deviceSn" label="设备SN" width="170" />
        <el-table-column prop="imageVersion" label="镜像版本" width="130">
          <template #default="{ row }">
            {{ row.imageVersion || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="agentVersion" label="Agent版本" width="120">
          <template #default="{ row }">
            {{ row.agentVersion || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="ip" label="最近IP" width="130">
          <template #default="{ row }">
            {{ row.ip || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="hardwareFingerprint" label="硬件指纹" min-width="220">
          <template #default="{ row }">
            <span class="fingerprint">{{ row.hardwareFingerprint || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="firstSeenAt" label="首次接入" width="170" />
        <el-table-column prop="lastSeenAt" label="最近接入" width="170" />
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
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Document, Plus, Search } from '@element-plus/icons-vue'

const licenses = ref([])
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const keyword = ref('')
const status = ref('')

const createVisible = ref(false)
const creating = ref(false)
const createForm = reactive({
  name: '',
  imageVersion: '',
  factoryUsername: '',
  remark: ''
})
const createdVisible = ref(false)
const createdLicense = ref(null)

const factoryVisible = ref(false)
const factorySaving = ref(false)
const factoryForm = reactive({
  id: null,
  licenseName: '',
  factoryUsername: ''
})

const devicesVisible = ref(false)
const devicesLoading = ref(false)
const devices = ref([])
const devicesPage = ref(1)
const devicesPageSize = ref(10)
const devicesTotal = ref(0)
const currentLicenseId = ref(null)
const currentLicenseName = ref('')

const fetchLicenses = async () => {
  loading.value = true
  try {
    const res = await axios.get('/api/admin/image-licenses/list', {
      params: {
        page: currentPage.value,
        size: pageSize.value,
        status: status.value,
        keyword: keyword.value
      }
    })
    if (res.data.code === 200) {
      licenses.value = res.data.data.records || []
      total.value = res.data.data.total || 0
    } else {
      ElMessage.error(res.data.msg || '获取镜像授权失败')
    }
  } catch (e) {
    ElMessage.error('获取镜像授权失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  currentPage.value = 1
  fetchLicenses()
}

const openCreateDialog = () => {
  createForm.name = ''
  createForm.imageVersion = ''
  createForm.factoryUsername = ''
  createForm.remark = ''
  createVisible.value = true
}

const createLicense = async () => {
  if (!createForm.name.trim()) {
    ElMessage.warning('请输入镜像名称')
    return
  }
  creating.value = true
  try {
    const res = await axios.post('/api/admin/image-licenses/create', {
      name: createForm.name,
      imageVersion: createForm.imageVersion,
      factoryUsername: createForm.factoryUsername,
      remark: createForm.remark
    })
    if (res.data.code === 200) {
      createdLicense.value = res.data.data
      createVisible.value = false
      createdVisible.value = true
      fetchLicenses()
    } else {
      ElMessage.error(res.data.msg || '生成授权码失败')
    }
  } catch (e) {
    ElMessage.error('生成授权码失败')
  } finally {
    creating.value = false
  }
}

const revokeLicense = async (row) => {
  try {
    await ElMessageBox.confirm(
      `销毁后，授权码 ${row.licenseKey} 将不能再激活新设备。已在线、已入库设备不会被删除或下线。确定继续吗？`,
      '销毁镜像授权',
      {
        type: 'warning',
        confirmButtonText: '确认销毁',
        cancelButtonText: '取消'
      }
    )
    const res = await axios.post(`/api/admin/image-licenses/revoke/${row.id}`)
    if (res.data.code === 200) {
      ElMessage.success(res.data.data || '已销毁')
      fetchLicenses()
    } else {
      ElMessage.error(res.data.msg || '销毁失败')
    }
  } catch (e) {
    if (e !== 'cancel') ElMessage.error('销毁失败')
  }
}

const openFactoryDialog = (row) => {
  factoryForm.id = row.id
  factoryForm.licenseName = row.name || row.licenseKey
  factoryForm.factoryUsername = row.factoryUsername || ''
  factoryVisible.value = true
}

const hasFactoryBound = (row) => {
  return !!String(row?.factoryUsername || '').trim()
}

const submitFactory = async () => {
  if (!factoryForm.id) return
  factorySaving.value = true
  try {
    const res = await axios.post(`/api/admin/image-licenses/${factoryForm.id}/factory`, {
      factoryUsername: factoryForm.factoryUsername
    })
    if (res.data.code === 200) {
      ElMessage.success('工厂账号绑定已更新')
      factoryVisible.value = false
      fetchLicenses()
    } else {
      ElMessage.error(res.data.msg || '绑定工厂账号失败')
    }
  } catch (e) {
    ElMessage.error('绑定工厂账号失败')
  } finally {
    factorySaving.value = false
  }
}

const openDevices = (row) => {
  currentLicenseId.value = row.id
  currentLicenseName.value = row.name || row.licenseKey
  devicesPage.value = 1
  devicesVisible.value = true
  fetchDevices()
}

const fetchDevices = async () => {
  if (!currentLicenseId.value) return
  devicesLoading.value = true
  try {
    const res = await axios.get(`/api/admin/image-licenses/${currentLicenseId.value}/devices`, {
      params: {
        page: devicesPage.value,
        size: devicesPageSize.value
      }
    })
    if (res.data.code === 200) {
      devices.value = res.data.data.records || []
      devicesTotal.value = res.data.data.total || 0
    } else {
      ElMessage.error(res.data.msg || '获取激活设备失败')
    }
  } catch (e) {
    ElMessage.error('获取激活设备失败')
  } finally {
    devicesLoading.value = false
  }
}

const buildWriteCommand = (license) => {
  const script = `printf "%s" "${escapeDoubleQuoted(license.licenseKey)}" > /etc/ld-ai-image-license && printf "%s" "${escapeDoubleQuoted(license.imageVersion || '')}" > /etc/ld-ai-image-version && chmod 600 /etc/ld-ai-image-license /etc/ld-ai-image-version`
  return `sudo sh -c '${script.replace(/'/g, "'\\''")}'`
}

const escapeDoubleQuoted = (value) => {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$')
    .replace(/\r?\n/g, '')
}

const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('已复制')
  } catch (e) {
    ElMessage.error('复制失败')
  }
}

onMounted(fetchLicenses)
</script>

<style scoped>
.image-license-page {
  padding: 0;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.filters {
  display: flex;
  align-items: center;
  gap: 10px;
}

.keyword-input {
  width: 300px;
}

.status-select {
  width: 130px;
}

.license-table {
  border-radius: 8px;
}

.license-key-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.license-key,
.fingerprint,
.factory-username {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  color: #1f2937;
  word-break: break-all;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.created-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.command-box {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 14px;
  background: #f8fafc;
}

.command-title {
  font-weight: 700;
  margin-bottom: 10px;
  color: #111827;
}

.command-line {
  padding: 10px;
  margin-bottom: 10px;
  border-radius: 6px;
  background: #111827;
  color: #e5e7eb;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-size: 13px;
  line-height: 1.5;
  word-break: break-all;
}
</style>
