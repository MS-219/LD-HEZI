<template>
  <div class="version-page">
    <el-card shadow="never">
      <template #header><div class="header"><div><b>App 强制更新</b><div class="hint">发布后，所有 versionCode 更低的 App 将被强制更新。</div></div><el-button @click="loadList">刷新</el-button></div></template>
      <el-form :model="form" label-width="110px" style="max-width:720px">
        <el-form-item label="版本名称" required><el-input v-model="form.versionName" placeholder="例如 1.1.0" maxlength="32" /></el-form-item>
        <el-form-item label="versionCode" required><el-input-number v-model="form.versionCode" :min="1" :step="1" /></el-form-item>
        <el-form-item label="更新说明"><el-input v-model="form.releaseNotes" type="textarea" :rows="5" maxlength="2000" show-word-limit /></el-form-item>
        <el-form-item label="APK 文件" required>
          <el-upload ref="uploadRef" :auto-upload="false" :limit="1" accept=".apk,application/vnd.android.package-archive" :on-change="onFileChange" :on-remove="onFileRemove">
            <el-button type="primary" plain>选择 APK</el-button>
            <template #tip><div class="el-upload__tip">仅支持 APK，最大 300MB；服务器会计算 SHA-256。</div></template>
          </el-upload>
        </el-form-item>
        <el-form-item><el-button type="primary" :loading="publishing" @click="publish">发布强制更新</el-button></el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" style="margin-top:18px">
      <template #header><b>发布历史</b></template>
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="versionName" label="版本" width="110" />
        <el-table-column prop="versionCode" label="versionCode" width="120" />
        <el-table-column prop="fileName" label="APK" min-width="220" />
        <el-table-column label="大小" width="110"><template #default="{row}">{{ formatSize(row.fileSize) }}</template></el-table-column>
        <el-table-column prop="sha256" label="SHA-256" min-width="260" show-overflow-tooltip />
        <el-table-column prop="releaseNotes" label="更新说明" min-width="240" show-overflow-tooltip />
        <el-table-column prop="publishedAt" label="发布时间" width="180" />
        <el-table-column label="状态" width="90"><template #default="{row}"><el-tag :type="row.published ? 'success' : 'info'">{{ row.published ? '已发布' : '未发布' }}</el-tag></template></el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'

const form = reactive({ versionName: '', versionCode: 1, releaseNotes: '' })
const uploadRef = ref(null)
const apkFile = ref(null)
const publishing = ref(false)
const loading = ref(false)
const list = ref([])
const onFileChange = (file) => { apkFile.value = file.raw }
const onFileRemove = () => { apkFile.value = null }
const formatSize = (size) => !size ? '-' : size >= 1024*1024 ? `${(size/1024/1024).toFixed(1)} MB` : `${(size/1024).toFixed(1)} KB`

const loadList = async () => {
  loading.value = true
  try {
    const res = await axios.get('/api/admin/app-version/list', { params: { page: 1, size: 100 } })
    if (res.data.code === 200) list.value = res.data.data.records || []
    else ElMessage.error(res.data.msg || '加载失败')
  } finally { loading.value = false }
}
const publish = async () => {
  if (!form.versionName.trim()) return ElMessage.warning('请输入版本名称')
  if (!apkFile.value) return ElMessage.warning('请选择 APK 文件')
  try {
    await ElMessageBox.confirm(`发布 versionCode=${form.versionCode} 后，旧版本将被强制更新且不能跳过。确定发布吗？`, '确认发布', { type: 'warning' })
  } catch (e) { return }
  const data = new FormData()
  data.append('apk', apkFile.value)
  data.append('versionName', form.versionName.trim())
  data.append('versionCode', String(form.versionCode))
  data.append('releaseNotes', form.releaseNotes)
  data.append('platform', 'android')
  publishing.value = true
  try {
    const res = await axios.post('/api/admin/app-version/publish', data, { headers: { 'Content-Type': 'multipart/form-data' } })
    if (res.data.code !== 200) return ElMessage.error(res.data.msg || '发布失败')
    ElMessage.success('版本发布成功')
    form.versionName = ''; form.versionCode += 1; form.releaseNotes = ''; apkFile.value = null; uploadRef.value?.clearFiles(); loadList()
  } catch (e) {
    const status = e.response?.status
    if (status === 413) ElMessage.error('APK 超过服务器上传限制，请联系管理员调整 Nginx 配置')
    else if (e.code === 'ECONNABORTED') ElMessage.error('上传超时，请检查网络后重试')
    else ElMessage.error(e.response?.data?.msg || '上传失败，请检查网络连接后重试')
  } finally { publishing.value = false }
}
onMounted(loadList)
</script>

<style scoped>
.version-page { padding: 4px; }
.header { display:flex; align-items:center; justify-content:space-between; }
.hint { margin-top:6px; color:#909399; font-size:13px; font-weight:normal; }
</style>
