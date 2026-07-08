<template>
  <div class="login-page">
    <!-- 左侧品牌区 -->
    <div class="brand-pane">
      <div class="grid-overlay"></div>
      <div class="brand-inner">
        <div class="brand-mark">
          <svg viewBox="0 0 48 48" class="mark-svg" aria-hidden="true">
            <path d="M36 20a10 10 0 0 0-19.4-3.3A8 8 0 0 0 12 32h23a7 7 0 0 0 1-12z"
              fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round" />
            <rect x="19" y="17" width="10" height="10" rx="2" fill="currentColor" opacity="0.9" />
          </svg>
        </div>
        <h1 class="brand-name">全球云智算</h1>
        <p class="brand-slogan">云端算力调度 · 全球节点互联</p>

        <ul class="brand-points">
          <li><span class="dot"></span>设备接入与实时监控</li>
          <li><span class="dot"></span>收益结算与提现审核</li>
          <li><span class="dot"></span>团队邀请与等级体系</li>
        </ul>
      </div>
      <p class="brand-foot">GLOBAL CLOUD COMPUTING CONSOLE</p>
    </div>

    <!-- 右侧表单区 -->
    <div class="form-pane">
      <div class="form-box" :class="{ 'ready': showCard }">
        <h2 class="form-title">管理控制台</h2>
        <p class="form-sub">请使用管理员账号登录</p>

        <el-form :model="form" :rules="rules" ref="formRef" @submit.prevent class="login-form">
          <el-form-item prop="username">
            <el-input
              v-model="form.username"
              placeholder="用户名"
              prefix-icon="User"
              size="large"
            />
          </el-form-item>
          <el-form-item prop="password">
            <el-input
              v-model="form.password"
              type="password"
              placeholder="密码"
              prefix-icon="Lock"
              size="large"
              show-password
              @keyup.enter.prevent="handleLogin"
            />
          </el-form-item>

          <div class="remember-row">
            <el-checkbox v-model="rememberMe">记住我</el-checkbox>
          </div>

          <el-button
            type="primary"
            size="large"
            :loading="loading"
            native-type="button"
            @click="handleLogin"
            class="login-btn"
          >
            {{ loading ? '登录中...' : '进入控制台' }}
          </el-button>
        </el-form>

        <p class="copyright">© 2026 全球云智算</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import axios from 'axios'

const router = useRouter()
const formRef = ref(null)
const loading = ref(false)
const rememberMe = ref(false)
const showCard = ref(false)

const form = reactive({
  username: '',
  password: ''
})

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

const handleLogin = async () => {
  if (loading.value) return
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    loading.value = true
    try {
      localStorage.removeItem('token')
      localStorage.removeItem('userRole')
      localStorage.removeItem('userInfo')

      const res = await axios.post('/api/admin/login', {
        username: form.username,
        password: form.password
      })
      const payload = res?.data || res

      if (Number(payload.code) === 200 && payload.data?.token) {
        const role = payload.data.role || 'admin'
        const username = payload.data.username || form.username
        localStorage.setItem('token', payload.data.token)
        localStorage.setItem('userRole', role)
        localStorage.setItem('userInfo', JSON.stringify({ username, role }))
        if (rememberMe.value) {
          localStorage.setItem('rememberUser', form.username)
        }
        ElMessage.success('登录成功')

        // 根据角色跳转不同页面
        if (role === 'factory') {
          router.push('/device') // 工厂用户直接进入设备页
        } else {
          router.push('/')
        }
      } else {
        ElMessage.error(payload.msg || '登录失败')
      }
    } catch (e) {
      console.error(e)
      ElMessage.error('网络错误，请稍后重试')
    } finally {
      loading.value = false
    }
  })
}

onMounted(() => {
  setTimeout(() => {
    showCard.value = true
  }, 80)
})
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  background: #f4f7fb;
}

/* ── 左侧品牌区 ───────────────────────────── */
.brand-pane {
  flex: 1 1 52%;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 64px;
  color: #eaf6ff;
  background:
    radial-gradient(1200px 600px at -10% -10%, rgba(34, 211, 238, 0.18), transparent 60%),
    radial-gradient(900px 500px at 110% 110%, rgba(59, 130, 246, 0.22), transparent 55%),
    linear-gradient(160deg, #0b1f4b 0%, #123a7c 55%, #0d2c62 100%);
  overflow: hidden;
}

.grid-overlay {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.045) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.045) 1px, transparent 1px);
  background-size: 44px 44px;
  mask-image: radial-gradient(ellipse at 30% 40%, #000 30%, transparent 75%);
  pointer-events: none;
}

.brand-inner {
  position: relative;
  max-width: 460px;
}

.brand-mark {
  width: 72px;
  height: 72px;
  border-radius: 18px;
  background: rgba(34, 211, 238, 0.12);
  border: 1px solid rgba(34, 211, 238, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #4dd6f0;
  margin-bottom: 28px;
}

.mark-svg {
  width: 42px;
  height: 42px;
}

.brand-name {
  font-size: 40px;
  font-weight: 800;
  letter-spacing: 6px;
  margin: 0 0 12px;
  color: #ffffff;
}

.brand-slogan {
  font-size: 15px;
  letter-spacing: 2px;
  color: rgba(214, 236, 255, 0.75);
  margin: 0 0 44px;
}

.brand-points {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.brand-points li {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: rgba(226, 242, 255, 0.85);
}

.brand-points .dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  background: #22d3ee;
  box-shadow: 0 0 10px rgba(34, 211, 238, 0.8);
}

.brand-foot {
  position: absolute;
  left: 64px;
  bottom: 32px;
  font-size: 11px;
  letter-spacing: 4px;
  color: rgba(214, 236, 255, 0.35);
  margin: 0;
}

/* ── 右侧表单区 ───────────────────────────── */
.form-pane {
  flex: 1 1 48%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
}

.form-box {
  width: 360px;
  opacity: 0;
  transform: translateX(24px);
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

.form-box.ready {
  opacity: 1;
  transform: translateX(0);
}

.form-title {
  font-size: 26px;
  font-weight: 700;
  color: #0f2a5c;
  margin: 0 0 6px;
}

.form-sub {
  font-size: 14px;
  color: #7a8aa6;
  margin: 0 0 32px;
}

.login-form :deep(.el-input__wrapper) {
  border-radius: 10px;
  padding: 4px 14px;
}

.remember-row {
  margin-bottom: 22px;
}

.login-btn {
  width: 100%;
  height: 48px;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 6px;
  border: none;
  background: linear-gradient(90deg, #123a7c 0%, #0e7bd4 100%);
}

.login-btn:hover {
  opacity: 0.92;
}

.copyright {
  margin-top: 36px;
  text-align: center;
  font-size: 12px;
  color: #a7b4c9;
}

/* 窄屏：隐藏品牌区，仅保留表单 */
@media (max-width: 860px) {
  .brand-pane {
    display: none;
  }
}
</style>
