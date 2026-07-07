<template>
  <div class="exchange-product-page">
    <!-- 顶部操作栏 -->
    <div class="page-header">
      <div class="header-left">
        <el-input v-model="keyword" placeholder="搜索商品名称" prefix-icon="Search" clearable style="width: 240px"
          @keyup.enter="fetchProducts" />
        <el-select v-model="statusFilter" placeholder="状态" clearable style="width: 120px" @change="fetchProducts">
          <el-option label="上架" :value="1" />
          <el-option label="下架" :value="0" />
        </el-select>
        <el-button type="primary" :icon="Search" @click="fetchProducts">搜索</el-button>
      </div>
      <el-button type="primary" :icon="Plus" @click="showAddDialog">新增商品</el-button>
    </div>

    <!-- 商品表格 -->
    <el-table :data="products" v-loading="loading" stripe>
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column label="商品图片" width="100">
        <template #default="{ row }">
          <el-image :src="row.imageUrl" style="width: 60px; height: 60px; border-radius: 8px" fit="cover"
            v-if="row.imageUrl">
            <template #error>
              <div class="image-placeholder">📦</div>
            </template>
          </el-image>
          <div class="image-placeholder" v-else>📦</div>
        </template>
      </el-table-column>
      <el-table-column prop="name" label="商品名称" min-width="150" />
      <el-table-column label="价格体系" min-width="300">
        <template #default="{ row }">
          <div class="price-grid">
            <el-tag size="small" type="warning">会员 ¥{{ row.priceLevel1 || row.basePrice }}</el-tag>
            <el-tag size="small" type="info">社区 ¥{{ row.priceLevel2 || row.basePrice }}</el-tag>
            <el-tag size="small" type="">县级 ¥{{ row.priceLevel3 || row.basePrice }}</el-tag>
            <el-tag size="small" type="primary">市级 ¥{{ row.priceLevel4 || row.basePrice }}</el-tag>
            <el-tag size="small" type="success">联创 ¥{{ row.priceLevel5 || row.basePrice }}</el-tag>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="stock" label="库存" width="80" align="center" />
      <el-table-column label="状态" width="90" align="center">
        <template #default="{ row }">
          <el-switch v-model="row.status" :active-value="1" :inactive-value="0" @change="toggleStatus(row)" />
        </template>
      </el-table-column>
      <el-table-column prop="sortOrder" label="排序" width="70" align="center" />
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link @click="showEditDialog(row)">编辑</el-button>
          <el-popconfirm title="确定删除该商品?" @confirm="deleteProduct(row.id)">
            <template #reference>
              <el-button type="danger" link>删除</el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination-wrap">
      <el-pagination background layout="total, prev, pager, next" :total="total" :page-size="pageSize"
        v-model:current-page="currentPage" @current-change="fetchProducts" />
    </div>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="editingProduct ? '编辑商品' : '新增商品'" width="780px" destroy-on-close>
      <el-form :model="form" label-width="100px" label-position="right">
        <el-form-item label="商品名称" required>
          <el-input v-model="form.name" placeholder="请输入商品名称" />
        </el-form-item>
        <el-form-item label="商品描述">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="商品描述" />
        </el-form-item>
        <el-form-item label="商品图片">
          <div class="image-upload-area">
            <el-upload class="product-uploader" action="/api/upload/image" :show-file-list="false"
              :on-success="handleUploadSuccess" :before-upload="beforeUpload" accept="image/*">
              <el-image v-if="form.imageUrl" :src="form.imageUrl" class="upload-preview" fit="cover" />
              <div v-else class="upload-placeholder">
                <el-icon :size="28">
                  <Plus />
                </el-icon>
                <span>点击上传</span>
              </div>
            </el-upload>
            <el-input v-model="form.imageUrl" placeholder="或直接输入图片URL" style="margin-top: 8px" clearable />
          </div>
        </el-form-item>
        <el-divider content-position="left">各等级价格（元）</el-divider>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="会员价" required>
              <el-input v-model.number="form.priceLevel1" type="number" placeholder="3488">
                <template #prepend>¥</template>
              </el-input>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="社区价">
              <el-input v-model.number="form.priceLevel2" type="number" placeholder="3188">
                <template #prepend>¥</template>
              </el-input>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="县级价">
              <el-input v-model.number="form.priceLevel3" type="number" placeholder="2988">
                <template #prepend>¥</template>
              </el-input>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="市级价">
              <el-input v-model.number="form.priceLevel4" type="number" placeholder="2788">
                <template #prepend>¥</template>
              </el-input>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="联创价">
              <el-input v-model.number="form.priceLevel5" type="number" placeholder="2488">
                <template #prepend>¥</template>
              </el-input>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="库存">
              <el-input-number v-model="form.stock" :min="0" :step="10" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="排序权重">
              <el-input-number v-model="form.sortOrder" :min="0" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="状态">
              <el-switch v-model="form.status" :active-value="1" :inactive-value="0" active-text="上架"
                inactive-text="下架" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveProduct" :loading="saving">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Search, Plus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'

const API = import.meta.env.VITE_API_BASE || ''
const getToken = () => localStorage.getItem('token')

const products = ref([])
const loading = ref(false)
const keyword = ref('')
const statusFilter = ref(null)
const total = ref(0)
const currentPage = ref(1)
const pageSize = 20
const dialogVisible = ref(false)
const editingProduct = ref(null)
const saving = ref(false)

const defaultForm = () => ({
  name: '', description: '', imageUrl: '',
  priceLevel1: 3488, priceLevel2: 3188, priceLevel3: 2988,
  priceLevel4: 2788, priceLevel5: 2488,
  stock: 100, sortOrder: 0, status: 1
})
const form = ref(defaultForm())

const fetchProducts = async () => {
  loading.value = true
  try {
    const params = { page: currentPage.value, size: pageSize }
    if (keyword.value) params.keyword = keyword.value
    if (statusFilter.value !== null && statusFilter.value !== '') params.status = statusFilter.value
    const { data } = await axios.get(`${API}/api/admin/exchange/products`, {
      params, headers: { Authorization: `Bearer ${getToken()}` }
    })
    if (data.code === 200) {
      products.value = data.data.records
      total.value = data.data.total
    }
  } finally {
    loading.value = false
  }
}

const showAddDialog = () => {
  editingProduct.value = null
  form.value = defaultForm()
  dialogVisible.value = true
}

const showEditDialog = (row) => {
  editingProduct.value = row
  form.value = { ...row, basePrice: row.priceLevel1 || row.basePrice }
  dialogVisible.value = true
}

const saveProduct = async () => {
  if (!form.value.name) { ElMessage.warning('请输入商品名称'); return }
  if (!form.value.priceLevel1) { ElMessage.warning('请输入会员价'); return }

  saving.value = true
  try {
    const payload = { ...form.value, basePrice: form.value.priceLevel1 }
    if (editingProduct.value) payload.id = editingProduct.value.id
    const { data } = await axios.post(`${API}/api/admin/exchange/product`, payload, {
      headers: { Authorization: `Bearer ${getToken()}` }
    })
    if (data.code === 200) {
      ElMessage.success('保存成功')
      dialogVisible.value = false
      fetchProducts()
    } else {
      ElMessage.error(data.msg || '保存失败')
    }
  } finally {
    saving.value = false
  }
}

const toggleStatus = async (row) => {
  await axios.post(`${API}/api/admin/exchange/product/${row.id}/toggle`, {}, {
    headers: { Authorization: `Bearer ${getToken()}` }
  })
  ElMessage.success(row.status === 1 ? '已上架' : '已下架')
}

const deleteProduct = async (id) => {
  const { data } = await axios.delete(`${API}/api/admin/exchange/product/${id}`, {
    headers: { Authorization: `Bearer ${getToken()}` }
  })
  if (data.code === 200) {
    ElMessage.success('删除成功')
    fetchProducts()
  }
}

const handleUploadSuccess = (response) => {
  if (response.code === 200) {
    form.value.imageUrl = response.data.url || response.data
    ElMessage.success('图片上传成功')
  } else {
    ElMessage.error(response.msg || '上传失败')
  }
}

const beforeUpload = (rawFile) => {
  if (rawFile.size > 5 * 1024 * 1024) {
    ElMessage.error('图片大小不能超过 5MB')
    return false
  }
  return true
}

onMounted(fetchProducts)
</script>

<style scoped>
.exchange-product-page {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-left {
  display: flex;
  gap: 12px;
  align-items: center;
}

.price-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

.image-placeholder {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.image-upload-area {
  width: 100%;
}

.product-uploader :deep(.el-upload) {
  width: 120px;
  height: 120px;
  border: 1px dashed #dcdfe6;
  border-radius: 8px;
  cursor: pointer;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.2s;
}

.product-uploader :deep(.el-upload:hover) {
  border-color: #409eff;
}

.upload-preview {
  width: 120px;
  height: 120px;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: #8c939d;
  font-size: 12px;
}
</style>
