<template>
  <div class="login-page">
    <div class="scanlines"></div>

    <div class="login-shell" :class="{ ready: showCard }">
      <!-- 顶部状态条 -->
      <div class="shell-head">
        <span class="head-dot"></span>
        <span class="head-title">GLOBAL CLOUD · SCHEDULER</span>
        <span class="head-status">● ONLINE</span>
      </div>

      <div class="shell-body">
        <h1 class="console-title">全球云智算</h1>
        <p class="console-sub">调度与节点监控中心</p>

        <el-form :model="form" :rules="rules" ref="formRef" @submit.prevent class="login-form">
          <el-form-item prop="username">
            <el-input
              v-model="form.username"
              placeholder="操作员账号"
              prefix-icon="User"
              size="large"
              class="term-input"
            />
          </el-form-item>
          <el-form-item prop="password">
            <el-input
              v-model="form.password"
              type="password"
              placeholder="访问口令"
              prefix-icon="Lock"
              size="large"
              show-password
              class="term-input"
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
            {{ loading ? '验证中...' : '接入调度中心' }}
          </el-button>
        </el-form>
      </div>

      <div class="shell-foot">
        <span>NODES</span><span>SCHEDULING</span><span>MONITORING</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import request from '../utils/request'

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
      localStorage.removeItem('sl_token')

      const res = await request.post('/api/admin/login', {
        username: form.username,
        password: form.password
      })
      const payload = res?.data || res

      if (Number(payload.code) === 200 && payload.data?.token) {
        localStorage.setItem('sl_token', payload.data.token) // 使用专属 token 名称
        if (rememberMe.value) {
          localStorage.setItem('sl_rememberUser', form.username)
        }
        ElMessage.success('登录成功')
        router.push('/')
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
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(800px 400px at 80% -10%, rgba(14, 123, 212, 0.15), transparent 60%),
    #061226;
  position: relative;
  overflow: hidden;
}

/* 扫描线质感 */
.scanlines {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    rgba(255, 255, 255, 0.015) 0px,
    rgba(255, 255, 255, 0.015) 1px,
    transparent 1px,
    transparent 4px
  );
  pointer-events: none;
}

.login-shell {
  width: 400px;
  border: 1px solid rgba(77, 214, 240, 0.25);
  border-radius: 10px;
  background: rgba(9, 24, 48, 0.92);
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(0, 0, 0, 0.4);
  opacity: 0;
  transform: translateY(16px);
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  z-index: 2;
}

.login-shell.ready {
  opacity: 1;
  transform: translateY(0);
}

/* 顶部状态条 */
.shell-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 18px;
  border-bottom: 1px solid rgba(77, 214, 240, 0.15);
  font-family: 'SF Mono', 'Consolas', monospace;
  font-size: 11px;
  letter-spacing: 2px;
  color: rgba(174, 220, 255, 0.6);
}

.head-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #22d3ee;
  box-shadow: 0 0 8px rgba(34, 211, 238, 0.9);
}

.head-status {
  margin-left: auto;
  color: #34d399;
}

.shell-body {
  padding: 34px 34px 26px;
}

.console-title {
  font-size: 28px;
  font-weight: 800;
  letter-spacing: 5px;
  color: #ffffff;
  margin: 0 0 6px;
}

.console-sub {
  font-size: 13px;
  color: rgba(174, 220, 255, 0.55);
  letter-spacing: 2px;
  margin: 0 0 30px;
}

.term-input :deep(.el-input__wrapper) {
  background: rgba(6, 18, 38, 0.9);
  border: 1px solid rgba(77, 214, 240, 0.2);
  border-radius: 6px;
  box-shadow: none;
}

.term-input :deep(.el-input__wrapper.is-focus) {
  border-color: #22d3ee;
  box-shadow: 0 0 0 2px rgba(34, 211, 238, 0.15);
}

.term-input :deep(.el-input__inner) {
  color: #d9efff;
}

.term-input :deep(.el-input__inner::placeholder) {
  color: rgba(174, 220, 255, 0.35);
}

.term-input :deep(.el-input__prefix .el-icon) {
  color: rgba(77, 214, 240, 0.6);
}

.remember-row {
  margin-bottom: 20px;
}

.remember-row :deep(.el-checkbox__label) {
  color: rgba(174, 220, 255, 0.55);
}

.login-btn {
  width: 100%;
  height: 46px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 4px;
  background: linear-gradient(90deg, #0e7bd4 0%, #22d3ee 100%);
}

.login-btn:hover {
  opacity: 0.9;
}

.shell-foot {
  display: flex;
  justify-content: space-between;
  padding: 12px 18px;
  border-top: 1px solid rgba(77, 214, 240, 0.15);
  font-family: 'SF Mono', 'Consolas', monospace;
  font-size: 10px;
  letter-spacing: 3px;
  color: rgba(174, 220, 255, 0.35);
}
</style>
