<template>
  <div class="terminal-container">
    <div class="terminal-header">
      <el-page-header @back="goBack">
        <template #content>
          <span class="header-title"> 远程终端 - {{ sn }} </span>
        </template>
        <template #extra>
          <el-tag :type="isConnected ? 'success' : 'danger'">{{ isConnected ? '已连接' : '已断开' }}</el-tag>
          <el-button @click="clearTerminal" style="margin-left: 10px;">清屏</el-button>
        </template>
      </el-page-header>
    </div>
    <div ref="terminalRef" class="xterm-box"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import 'xterm/css/xterm.css'

const route = useRoute()
const router = useRouter()
const sn = ref(route.query.sn || route.query.id)
const terminalRef = ref(null)
const isConnected = ref(false)

let term = null
let fitAddon = null
let socket = null
let inputDisposable = null
let pasteHandler = null

const sendTerminalInput = (data) => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(data)
  }
}

const normalizePastedText = (text) => text.replace(/\r\n/g, '\r').replace(/\n/g, '\r')

const bindTerminalInput = () => {
  if (inputDisposable) {
    inputDisposable.dispose()
  }
  inputDisposable = term.onData(sendTerminalInput)

  if (pasteHandler && terminalRef.value) {
    terminalRef.value.removeEventListener('paste', pasteHandler, true)
  }
  pasteHandler = (event) => {
    const text = event.clipboardData?.getData('text/plain')
    if (!text) return
    event.preventDefault()
    event.stopPropagation()
    sendTerminalInput(normalizePastedText(text))
  }
  terminalRef.value?.addEventListener('paste', pasteHandler, true)
}

const initTerminal = () => {
  if (!sn.value) {
    ElMessage.error('缺少设备标识，无法连接')
    return
  }
  
  term = new Terminal({
    cursorBlink: true,
    fontFamily: 'Menlo, Monaco, "Courier New", monospace',
    fontSize: 14,
    theme: {
      background: '#1e1e1e'
    }
  })
  
  fitAddon = new FitAddon()
  term.loadAddon(fitAddon)
  term.open(terminalRef.value)
  fitAddon.fit()
  bindTerminalInput()

  term.writeln('\x1b[1;32m[全球云智算终端]\x1b[0m 欢迎使用远程维护系统...')
  term.writeln('\x1b[1;33m[系统]\x1b[0m 终端标识: ' + sn.value)
  term.writeln('\x1b[1;33m[系统]\x1b[0m 正在建立通信隧道...\r\n')

  // 初始化 WebSocket
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = window.location.host
  // 根据后端 WebSocketConfig.java (line 27) 的监听路径，去掉多加的 /api 前缀
  const wsUrl = `${protocol}//${host}/ws/admin/terminal/${sn.value}`
  
  socket = new WebSocket(wsUrl)
  
  socket.onopen = () => {
    isConnected.value = true
  }

  socket.onmessage = (event) => {
    term.write(event.data)
  }

  socket.onclose = () => {
    isConnected.value = false
    term.writeln('\r\n\x1b[1;31m[系统] 通信链路已断开。\x1b[0m')
  }

  socket.onerror = () => {
    isConnected.value = false
    term.writeln('\r\n\x1b[1;31m[系统] 通信发生错误。\x1b[0m')
  }

}

const clearTerminal = () => {
  term.clear()
}

const goBack = () => {
  router.push('/device')
}

const handleResize = () => {
  if (fitAddon) {
    fitAddon.fit()
  }
}

onMounted(() => {
  initTerminal()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  if (terminalRef.value && pasteHandler) {
    terminalRef.value.removeEventListener('paste', pasteHandler, true)
  }
  if (inputDisposable) inputDisposable.dispose()
  if (socket) socket.close()
  if (term) term.dispose()
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.terminal-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f5f7fa;
}

.terminal-header {
  padding: 15px 20px;
  background-color: #fff;
  border-bottom: 1px solid #dcdfe6;
}

.header-title {
  font-weight: 600;
  font-size: 16px;
}

.xterm-box {
  flex: 1;
  padding: 10px;
  background-color: #1e1e1e;
  overflow: hidden;
}

/* 覆盖 xterm 样式 */
:deep(.xterm-viewport) {
  background-color: #1e1e1e !important;
}
</style>
