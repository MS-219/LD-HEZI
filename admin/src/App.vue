<template>
  <router-view></router-view>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Element Plus 全局样式优化 */
.el-card {
  border: none !important;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08) !important;
}

.el-button--primary {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%) !important;
  border: none !important;
}

.el-button--primary:hover {
  opacity: 0.9;
}

/* 滚动条美化 */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #a1a1a1;
}

/* 所有页面内容撑满 */
.statistics-page,
.device-list-page,
.user-list-page,
.notice-list-page,
.withdraw-list-page,
.earnings-page,
.ai-task-page,
.feedback-page,
.settings-page {
  min-height: calc(100vh - 112px);
  background: #f8fafc;
}

/* Element Plus 表格优化 */
.el-table {
  border-radius: 8px;
}

.el-card {
  border-radius: 12px !important;
}
</style>
