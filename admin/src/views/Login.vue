<template>
  <div class="login-page">
    <!-- 动态背景 -->
    <div class="bg-animation">
      <div class="particles">
        <div class="particle" v-for="i in 50" :key="i" :style="getParticleStyle(i)"></div>
      </div>
      <div class="glow-orbs">
        <div class="orb orb-1"></div>
        <div class="orb orb-2"></div>
        <div class="orb orb-3"></div>
      </div>
    </div>

    <!-- 登录卡片 - 居中 -->
    <div class="login-wrapper">
      <div class="login-card" :class="{ 'animate-in': showCard }">
        <!-- Logo -->
        <div class="logo-section">
          <div class="logo-circle">
            <span class="logo-icon">⚡</span>
          </div>
          <h1 class="brand-title">聚芯算力</h1>
          <p class="brand-subtitle">智能算力共享平台 · 管理后台</p>
        </div>

        <!-- 登录表单 -->
        <el-form :model="form" :rules="rules" ref="formRef" @submit.prevent class="login-form">
          <el-form-item prop="username">
            <el-input 
              v-model="form.username" 
              placeholder="请输入用户名" 
              prefix-icon="User"
              size="large"
              class="custom-input"
            />
          </el-form-item>
          <el-form-item prop="password">
            <el-input 
              v-model="form.password" 
              type="password" 
              placeholder="请输入密码"
              prefix-icon="Lock"
              size="large"
              show-password
              class="custom-input"
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
            <span v-if="!loading">登 录</span>
            <span v-else>登录中...</span>
          </el-button>
        </el-form>

        <!-- 底部 -->
        <div class="login-footer">
          <div class="features">
            <span class="feature">🌐 全球节点</span>
            <span class="feature">🔒 安全稳定</span>
            <span class="feature">💰 实时结算</span>
          </div>
          <p class="copyright">© 2025 聚芯算力 - 智能算力共享平台</p>
          <p class="record-no">
            <a
              href="https://beian.miit.gov.cn/"
              target="_blank"
              rel="noopener noreferrer"
              class="record-link"
            >
              浙ICP备2025220408号
            </a>
          </p>
        </div>
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

// 粒子样式生成
const getParticleStyle = (i) => {
  const size = Math.random() * 4 + 2
  return {
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    width: `${size}px`,
    height: `${size}px`,
    animationDelay: `${Math.random() * 5}s`,
    animationDuration: `${Math.random() * 10 + 10}s`
  }
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
  }, 100)
})
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0a0a1a 0%, #1a1a3e 50%, #0f0f2a 100%);
  overflow: hidden;
  position: relative;
}

/* 动态背景 */
.bg-animation {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

/* 粒子效果 */
.particles {
  position: absolute;
  width: 100%;
  height: 100%;
}

.particle {
  position: absolute;
  background: rgba(99, 102, 241, 0.6);
  border-radius: 50%;
  animation: float-particle linear infinite;
}

@keyframes float-particle {
  0% {
    transform: translateY(100vh) scale(0);
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  90% {
    opacity: 1;
  }
  100% {
    transform: translateY(-100vh) scale(1);
    opacity: 0;
  }
}

/* 光晕效果 */
.glow-orbs {
  position: absolute;
  width: 100%;
  height: 100%;
}

.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  animation: float-orb 15s ease-in-out infinite;
}

.orb-1 {
  width: 500px;
  height: 500px;
  background: rgba(99, 102, 241, 0.3);
  top: -200px;
  left: -200px;
  animation-delay: 0s;
}

.orb-2 {
  width: 400px;
  height: 400px;
  background: rgba(139, 92, 246, 0.25);
  bottom: -150px;
  right: -150px;
  animation-delay: -5s;
}

.orb-3 {
  width: 300px;
  height: 300px;
  background: rgba(59, 130, 246, 0.2);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation-delay: -10s;
}

@keyframes float-orb {
  0%, 100% {
    transform: translate(0, 0) scale(1);
  }
  25% {
    transform: translate(50px, -50px) scale(1.1);
  }
  50% {
    transform: translate(-30px, 30px) scale(0.9);
  }
  75% {
    transform: translate(20px, 20px) scale(1.05);
  }
}

/* 登录卡片容器 */
.login-wrapper {
  position: relative;
  z-index: 10;
}

.login-card {
  width: 420px;
  padding: 48px;
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  opacity: 0;
  transform: translateY(30px) scale(0.95);
  transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

.login-card.animate-in {
  opacity: 1;
  transform: translateY(0) scale(1);
}

/* Logo 区域 */
.logo-section {
  text-align: center;
  margin-bottom: 40px;
}

.logo-circle {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  box-shadow: 0 10px 40px rgba(99, 102, 241, 0.4);
  animation: pulse-glow 3s infinite;
}

@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 0 10px 40px rgba(99, 102, 241, 0.4);
  }
  50% {
    box-shadow: 0 10px 60px rgba(99, 102, 241, 0.6), 0 0 30px rgba(139, 92, 246, 0.3);
  }
}

.logo-icon {
  font-size: 36px;
  animation: bounce-icon 2s ease-in-out infinite;
}

@keyframes bounce-icon {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-5px);
  }
}

.brand-title {
  font-size: 32px;
  font-weight: 800;
  color: #fff;
  margin: 0 0 8px 0;
  letter-spacing: 4px;
  background: linear-gradient(135deg, #fff 0%, #a5b4fc 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.brand-subtitle {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
}

/* 表单样式 */
.login-form {
  margin-bottom: 24px;
}

:deep(.custom-input .el-input__wrapper) {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 6px 16px;
  box-shadow: none;
  transition: all 0.3s;
}

:deep(.custom-input .el-input__wrapper:hover) {
  border-color: rgba(99, 102, 241, 0.5);
  background: rgba(255, 255, 255, 0.08);
}

:deep(.custom-input .el-input__wrapper.is-focus) {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
  background: rgba(255, 255, 255, 0.1);
}

:deep(.custom-input .el-input__inner) {
  color: #fff;
  font-size: 15px;
}

:deep(.custom-input .el-input__inner::placeholder) {
  color: rgba(255, 255, 255, 0.4);
}

:deep(.custom-input .el-input__prefix .el-icon) {
  color: rgba(255, 255, 255, 0.5);
}

.remember-row {
  margin-bottom: 24px;
}

:deep(.el-checkbox__label) {
  color: rgba(255, 255, 255, 0.6);
}

:deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
  background-color: #6366f1;
  border-color: #6366f1;
}

.login-btn {
  width: 100%;
  height: 52px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 4px;
  transition: all 0.3s;
  position: relative;
  overflow: hidden;
}

.login-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  transition: left 0.5s;
}

.login-btn:hover::before {
  left: 100%;
}

.login-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 15px 35px rgba(99, 102, 241, 0.4);
}

/* 底部 */
.login-footer {
  text-align: center;
}

.features {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-bottom: 20px;
}

.feature {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.copyright {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.3);
  margin: 0;
}

.record-no {
  margin: 8px 0 0;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
  letter-spacing: 0.5px;
}

.record-link {
  color: inherit;
  text-decoration: none;
  transition: color 0.2s ease;
}

.record-link:hover {
  color: rgba(255, 255, 255, 0.72);
}
</style>
