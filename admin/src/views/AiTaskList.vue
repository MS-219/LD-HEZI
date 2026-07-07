<template>
  <div class="ai-task-page">
    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stat-cards">
      <el-col :span="6">
        <div class="stat-card total">
          <div class="stat-icon">📝</div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.totalTasks || 0 }}</div>
            <div class="stat-label">总任务数</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card today">
          <div class="stat-icon">📅</div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.todayTasks || 0 }}</div>
            <div class="stat-label">今日任务</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card processing">
          <div class="stat-icon">⏳</div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.processingCount || 0 }}</div>
            <div class="stat-label">处理中</div>
          </div>
          <div class="stat-extra">
            <span class="pending">等待: {{ stats.pendingCount || 0 }}</span>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card completed">
          <div class="stat-icon">✅</div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.completedCount || 0 }}</div>
            <div class="stat-label">已完成</div>
          </div>
          <div class="stat-extra">
            <span class="failed">失败: {{ stats.failedCount || 0 }}</span>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 图表区域 -->
    <el-row :gutter="20" class="chart-section">
      <el-col :span="16">
        <el-card class="chart-card">
          <template #header>
            <span class="card-title">任务类型分布</span>
          </template>
          <div class="chart-bars">
            <div class="bar-item" v-for="item in typeStats" :key="item.type">
              <div class="bar-wrapper">
                <div class="bar" :style="{ height: getBarHeight(item.count) + 'px' }">
                  <span class="bar-value">{{ item.count }}</span>
                </div>
              </div>
              <div class="bar-icon">{{ item.icon }}</div>
              <div class="bar-label">{{ item.label }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card class="info-card">
          <template #header>
            <span class="card-title">快速操作</span>
          </template>
          <div class="quick-actions">
            <el-button type="primary" @click="refreshData" :loading="loading" style="width: 100%;">
              🔄 刷新数据
            </el-button>
            <el-button @click="resetFilters" style="width: 100%; margin-top: 12px;">
              🔍 重置筛选
            </el-button>
          </div>
          <div class="type-summary">
            <div class="summary-item" v-for="item in typeStats" :key="item.type">
              <span class="summary-icon">{{ item.icon }}</span>
              <span class="summary-label">{{ item.label }}</span>
              <span class="summary-value">{{ item.count }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 搜索栏 -->
    <el-card class="search-card" shadow="never">
      <el-row :gutter="16" align="middle">
        <el-col :span="6">
          <el-select v-model="filters.status" placeholder="状态" clearable @change="handleSearch" style="width: 100%;">
            <el-option label="全部状态" value="" />
            <el-option label="⏳ 等待中" value="pending" />
            <el-option label="🔄 处理中" value="processing" />
            <el-option label="✅ 已完成" value="completed" />
            <el-option label="❌ 失败" value="failed" />
          </el-select>
        </el-col>
        <el-col :span="10">
          <el-input 
            v-model="filters.keyword" 
            placeholder="搜索提示词/任务ID/用户昵称" 
            prefix-icon="Search"
            clearable
            @clear="handleSearch"
            @keyup.enter="handleSearch"
          />
        </el-col>
        <el-col :span="8" style="text-align: right;">
          <el-button type="primary" @click="handleSearch">🔍 搜索</el-button>
          <el-button @click="resetFilters">重置</el-button>
        </el-col>
      </el-row>
    </el-card>

    <!-- 任务列表 -->
    <el-card class="table-card" shadow="never">
      <el-tabs v-model="filters.taskType" @tab-change="handleSearch" class="task-type-tabs">
        <el-tab-pane label="全部任务" name="" />
        <el-tab-pane label="🎥 文生视频" name="text-to-video" />
        <el-tab-pane label="🎞️ 图生视频" name="image-to-video" />
        <el-tab-pane label="🎨 文生图片" name="text-to-image" />
        <el-tab-pane label="🖼️ 以图生图" name="image-to-image" />
      </el-tabs>

      <el-table :data="taskList" v-loading="loading" stripe>
        <el-table-column label="预览" width="100">
          <template #default="{ row }">
            <el-image 
              v-if="row.resultUrl && !row.taskType?.includes('video')"
              :src="row.resultUrl" 
              :preview-src-list="[row.resultUrl]"
              fit="cover" 
              class="list-thumbnail"
              preview-teleported
            >
              <template #error>
                <div class="image-slot">
                  <span style="font-size: 20px;">🖼️</span>
                </div>
              </template>
            </el-image>
            <video 
              v-else-if="row.resultUrl && row.taskType?.includes('video')"
              :src="row.resultUrl" 
              class="list-thumbnail video"
              muted
              @mouseenter="$event.target.play()"
              @mouseleave="$event.target.pause()"
            />
            <div v-else class="no-preview">
              <span style="font-size: 20px;">📄</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="taskId" label="任务ID" width="120">
          <template #default="{ row }">
            <el-tooltip :content="row.taskId" placement="top">
              <span class="task-id-text">{{ row.taskId?.substring(0, 8) }}...</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="类型" width="130">
          <template #default="{ row }">
            <el-tag :type="getTaskTypeTag(row.taskType).type" effect="dark" round>
              {{ getTaskTypeTag(row.taskType).icon }} {{ getTaskTypeTag(row.taskType).label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="prompt" label="提示词" min-width="200">
          <template #default="{ row }">
            <el-tooltip :content="row.prompt" placement="top" :disabled="!row.prompt || row.prompt.length < 30">
              <span class="prompt-text">{{ row.prompt || '-' }}</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="getStatusTag(row.status).type" effect="dark" round>
              {{ getStatusTag(row.status).icon }} {{ getStatusTag(row.status).label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="costQuota" label="消耗" width="80">
          <template #default="{ row }">
            <span class="quota">⚡{{ row.costQuota || 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column label="用户" width="160">
          <template #default="{ row }">
            <div class="user-info-cell">
              <el-avatar :size="28" :src="row.avatarUrl || 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'" />
              <div class="user-detail">
                <div class="user-name">{{ row.nickname || '未知用户' }}</div>
                <div class="user-id">ID: {{ row.userId }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" width="170" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="viewTask(row)">详情</el-button>
            <el-button size="small" type="primary" v-if="row.status === 'failed'" @click="retryTask(row)">重试</el-button>
            <el-button size="small" type="danger" @click="deleteTask(row)">删除</el-button>
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
          @size-change="fetchTasks"
          @current-change="fetchTasks"
        />
      </div>
    </el-card>

    <!-- 任务详情弹窗 -->
    <el-dialog v-model="detailVisible" title="任务详情" width="700px">
      <el-descriptions :column="2" border v-if="currentTask">
        <el-descriptions-item label="任务ID" :span="2">
          <code>{{ currentTask.taskId }}</code>
        </el-descriptions-item>
        <el-descriptions-item label="类型">
          <el-tag :type="getTaskTypeTag(currentTask.taskType).type" effect="dark">
            {{ getTaskTypeTag(currentTask.taskType).icon }} {{ getTaskTypeTag(currentTask.taskType).label }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="getStatusTag(currentTask.status).type" effect="dark">
            {{ getStatusTag(currentTask.status).icon }} {{ getStatusTag(currentTask.status).label }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="用户ID">{{ currentTask.userId || '-' }}</el-descriptions-item>
        <el-descriptions-item label="消耗聚芯算力值">
          <span class="quota">⚡ {{ currentTask.costQuota || 0 }}</span>
        </el-descriptions-item>
        
        <!-- 解析后的参数 -->
        <template v-if="parseOptions(currentTask.options)">
          <el-descriptions-item v-for="(val, key) in parseOptions(currentTask.options)" :key="key" :label="getOptionLabel(key)">
            {{ val }}
          </el-descriptions-item>
        </template>

        <el-descriptions-item label="提示词" :span="2">
          <div class="full-prompt">{{ currentTask.prompt || '-' }}</div>
        </el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ currentTask.createTime || '-' }}</el-descriptions-item>
        <el-descriptions-item label="完成时间">{{ currentTask.completeTime || '-' }}</el-descriptions-item>
        <el-descriptions-item label="错误信息" :span="2" v-if="currentTask.errorMsg">
          <span style="color: #ef4444;">{{ currentTask.errorMsg }}</span>
        </el-descriptions-item>
      </el-descriptions>

      <!-- 原始图片 (如果有) -->
      <div class="result-preview" v-if="currentTask?.inputImageUrl">
        <div class="preview-title">原始图片 ({{ currentTask.inputImageUrl.split(',').length }})</div>
        <div class="input-images-grid">
          <el-image 
            v-for="(url, index) in currentTask.inputImageUrl.split(',')" 
            :key="index"
            :src="url" 
            fit="cover" 
            class="grid-preview-image" 
            :preview-src-list="currentTask.inputImageUrl.split(',')" 
            :initial-index="index"
          />
        </div>
      </div>

      <!-- 结果预览 -->
      <div class="result-preview" v-if="currentTask?.resultUrl">
        <div class="preview-title">生成结果</div>
        <video v-if="currentTask.taskType?.includes('video')" :src="currentTask.resultUrl" controls class="preview-video" />
        <el-image v-else :src="currentTask.resultUrl" fit="contain" class="preview-image" :preview-src-list="[currentTask.resultUrl]" />
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'

const taskList = ref([])
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

const stats = ref({})
const detailVisible = ref(false)
const currentTask = ref(null)

const filters = reactive({
  taskType: '',
  status: '',
  keyword: ''
})

// 任务类型统计
const typeStats = computed(() => [
  { type: 'text-to-video', label: '文生视频', icon: '🎥', count: stats.value.textToVideoCount || 0 },
  { type: 'image-to-video', label: '图生视频', icon: '🎞️', count: stats.value.imageToVideoCount || 0 },
  { type: 'text-to-image', label: '文生图片', icon: '🎨', count: stats.value.textToImageCount || 0 },
  { type: 'image-to-image', label: '以图生图', icon: '🖼️', count: stats.value.imageToImageCount || 0 }
])

// 柱状图高度
const getBarHeight = (count) => {
  const max = Math.max(...typeStats.value.map(t => t.count), 1)
  return Math.max(30, (count / max) * 120)
}

// 获取任务类型标签
const getTaskTypeTag = (type) => {
  const types = {
    'text-to-video': { icon: '🎥', label: '文生视频', type: 'primary' },
    'image-to-video': { icon: '🎞️', label: '图生视频', type: 'success' },
    'text-to-image': { icon: '🎨', label: '文生图片', type: 'warning' },
    'image-to-image': { icon: '🖼️', label: '以图生图', type: 'danger' }
  }
  return types[type] || { icon: '❓', label: type, type: 'info' }
}

// 获取状态标签
const getStatusTag = (status) => {
  const statuses = {
    'pending': { icon: '⏳', label: '等待中', type: 'warning' },
    'processing': { icon: '🔄', label: '处理中', type: 'primary' },
    'completed': { icon: '✅', label: '已完成', type: 'success' },
    'failed': { icon: '❌', label: '失败', type: 'danger' }
  }
  return statuses[status] || { icon: '❓', label: status, type: 'info' }
}

// 解析参数选项
const parseOptions = (options) => {
  if (!options) return null
  const res = {}
  options.split(',').forEach(item => {
    const [key, val] = item.split('=')
    if (key && val && key !== 'apiTaskId') {
      res[key] = val
    }
  })
  return Object.keys(res).length > 0 ? res : null
}

const getOptionLabel = (key) => {
  const labels = {
    'duration': '时长(秒)',
    'aspectRatio': '比例',
    'resolution': '分辨率',
    'size': '尺寸',
    'style': '风格'
  }
  return labels[key] || key
}

// 加载统计数据
const fetchStats = async () => {
  try {
    const res = await axios.get('/api/admin/ai-tasks/statistics')
    if (res.data.code === 200) {
      stats.value = res.data.data
    }
  } catch (e) {
    console.error('获取统计数据失败:', e)
  }
}

// 加载任务列表
const fetchTasks = async () => {
  loading.value = true
  try {
    const res = await axios.get('/api/admin/ai-tasks/list', {
      params: {
        page: currentPage.value,
        size: pageSize.value,
        taskType: filters.taskType || undefined,
        status: filters.status || undefined,
        keyword: filters.keyword || undefined
      }
    })
    if (res.data.code === 200) {
      const data = res.data.data
      taskList.value = data.records || []
      total.value = data.total || 0
    }
  } catch (e) {
    console.error('获取任务列表失败:', e)
    ElMessage.error('获取任务列表失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  currentPage.value = 1
  fetchTasks()
}

const resetFilters = () => {
  filters.taskType = ''
  filters.status = ''
  filters.keyword = ''
  currentPage.value = 1
  fetchTasks()
}

const refreshData = () => {
  fetchStats()
  fetchTasks()
  ElMessage.success('数据已刷新')
}

const viewTask = (row) => {
  currentTask.value = row
  detailVisible.value = true
}

const retryTask = async (row) => {
  try {
    const res = await axios.post(`/api/admin/ai-tasks/${row.taskId}/retry`)
    if (res.data.code === 200) {
      ElMessage.success('已加入重试队列')
      fetchTasks()
    } else {
      ElMessage.error(res.data.msg || '重试失败')
    }
  } catch (e) {
    ElMessage.error('操作失败')
  }
}

const deleteTask = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除此任务吗？', '确认删除', {
      type: 'warning'
    })

    const res = await axios.delete(`/api/admin/ai-tasks/${row.id}`)
    if (res.data.code === 200) {
      ElMessage.success('删除成功')
      fetchStats()
      fetchTasks()
    } else {
      ElMessage.error(res.data.msg || '删除失败')
    }
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error('操作失败')
    }
  }
}

onMounted(() => {
  fetchStats()
  fetchTasks()
})
</script>

<style scoped>
.ai-task-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 统计卡片 */
.stat-cards {
  margin-bottom: 8px;
}

.stat-card {
  border-radius: 16px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: none;
  color: #fff;
  position: relative;
  overflow: hidden;
}

.stat-card:hover {
  transform: translateY(-5px);
}

.stat-card.total {
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  box-shadow: 0 8px 20px rgba(99, 102, 241, 0.25);
}

.stat-card.today {
  background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
  box-shadow: 0 8px 20px rgba(6, 182, 212, 0.25);
}

.stat-card.processing {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  box-shadow: 0 8px 20px rgba(245, 158, 11, 0.25);
}

.stat-card.completed {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  box-shadow: 0 8px 20px rgba(16, 185, 129, 0.25);
}

.stat-icon {
  font-size: 32px;
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(4px);
}

.stat-value {
  font-size: 30px;
  font-weight: 800;
  color: #fff;
  letter-spacing: -0.5px;
}

.stat-label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.85);
  margin-top: 4px;
  font-weight: 500;
}

.stat-extra {
  font-size: 12px;
  display: flex;
  gap: 12px;
  background: rgba(0, 0, 0, 0.1);
  padding: 4px 12px;
  border-radius: 20px;
  width: fit-content;
}

.stat-extra .pending, .stat-extra .failed {
  color: #fff;
  font-weight: 600;
}

/* 图表与快速操作 */
.chart-section {
  margin-bottom: 8px;
}

.chart-card, .info-card {
  border-radius: 16px;
  border: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  background: #fff;
}

.card-title {
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
}

.chart-bars {
  display: flex;
  justify-content: space-around;
  align-items: flex-end;
  height: 220px;
  padding: 20px 0;
  background: linear-gradient(to bottom, #f8fafc, #fff);
  border-radius: 12px;
}

.bar-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  flex: 1;
}

.bar-wrapper {
  height: 150px;
  display: flex;
  align-items: flex-end;
  width: 100%;
  justify-content: center;
}

.bar {
  width: 50px;
  background: linear-gradient(to top, #6366f1, #a855f7);
  border-radius: 10px 10px 4px 4px;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 8px;
  min-height: 35px;
  transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
}

.bar:hover {
  filter: brightness(1.1);
  transform: scaleX(1.1);
}

.bar-value {
  font-size: 14px;
  font-weight: 800;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0,0,0,0.2);
}

.bar-icon {
  font-size: 24px;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
}

.bar-label {
  font-size: 12px;
  color: #64748b;
  font-weight: 600;
}

.quick-actions {
  margin-bottom: 24px;
}

.type-summary {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  transition: all 0.2s;
}

.summary-item:hover {
  transform: translateX(4px);
  border-color: #6366f1;
}

.summary-icon {
  font-size: 20px;
}

.summary-label {
  flex: 1;
  font-size: 13px;
  color: #475569;
  font-weight: 600;
}

.summary-value {
  font-size: 18px;
  font-weight: 800;
  color: #1e293b;
}

/* 搜索栏与列表 */
.search-card {
  border-radius: 12px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border: 1px solid #e2e8f0;
}

.table-card {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  border: none;
}

/* 表格头部与行样式 */
:deep(.el-table__header-wrapper th) {
  background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%) !important;
  color: #4c1d95 !important;
  font-weight: 600;
  font-size: 13px;
  border-bottom: 2px solid #a78bfa !important;
}

:deep(.el-table__row) {
  transition: all 0.2s ease;
}

:deep(.el-table__row:hover) {
  background: linear-gradient(135deg, #faf5ff 0%, #f5f3ff 100%) !important;
}

.list-thumbnail {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  border: 2px solid #fff;
  box-shadow: 0 4px 10px rgba(0,0,0,0.1);
  display: block;
  overflow: hidden;
}

.list-thumbnail.video {
  object-fit: cover;
  background: #000;
}

.task-id-text {
  font-family: 'SF Mono', 'Monaco', monospace;
  color: #7c3aed;
  background: #f5f3ff;
  padding: 2px 6px;
  border-radius: 6px;
  font-size: 11px;
  border: 1px solid #ddd6fe;
}

.prompt-text {
  font-size: 13px;
  color: #475569;
  line-height: 1.4;
}

.quota {
  color: #d97706;
  font-weight: 700;
  font-size: 14px;
}

.user-info-cell {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 8px;
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
  color: #7c3aed;
  font-weight: 500;
}

.pagination-wrapper {
  margin-top: 20px;
  padding: 16px;
  display: flex;
  justify-content: flex-end;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
}

/* 弹窗样式 */
.full-prompt {
  background: #f8fafc;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  color: #1e293b;
  font-family: system-ui;
  line-height: 1.6;
}

.preview-title {
  color: #1e293b;
  font-size: 15px;
  border-left: 4px solid #6366f1;
  padding-left: 10px;
}

.grid-preview-image {
  border-radius: 12px;
  border: 2px solid #fff;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.preview-video, .preview-image {
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.15);
}

/* 标签样式增强 */
:deep(.el-tag--dark) {
  border: none;
}

:deep(.el-tag--primary) { background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); }
:deep(.el-tag--success) { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
:deep(.el-tag--warning) { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }
:deep(.el-tag--danger) { background: linear-gradient(135deg, #f43f5e 0%, #e11d48 100%); }

/* 底部缓冲 Padding */
.ai-task-page {
  padding-bottom: 80px;
}
</style>
