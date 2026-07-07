<template>
  <div class="api-doc-page">
    <el-card class="doc-card">
      <template #header>
        <div class="card-header">
          <span class="title">开放平台 API 文档</span>
          <el-button type="primary" link @click="copyDocUrl">复制文档链接</el-button>
        </div>
      </template>
      <div class="doc-content" v-html="renderedMarkdown"></div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'

// 这里为了简单，直接把文档内容硬编码在组件内，也可以从服务器获取
const markdown = `
# 聚芯算力开放平台 API 接口文档 (v2.0)

欢迎使用聚芯算力开放平台。本接口文档面向合作伙伴（商户），用于集成 AI 算力能力、管理用户及设备。

---

## 1. 接口说明

### 1.1 请求域名
\`https://[您的服务器域名]/api/open\`

### 1.2 通用请求头 (Header)
所有开放接口请求均需在 Header 中携带以下信息进行身份验证和签名校验：

| 参数 | 类型 | 必填 | 描述 |
| :--- | :--- | :--- | :--- |
| **App-Id** | String | 是 | 商户唯一标识，在后台管理系统中获取 |
| **Timestamp** | String | 是 | 当前时间戳 (**毫秒级**，如 \`1704067200000\`) |
| **Sign** | String | 是 | 请求签名 (详见 1.3 签名算法) |

### 1.3 签名算法 (Sign)
签名用于保证请求合法性及内容完整性。

**算法步骤：**
1. 获取 \`appId\`（App-Id）
2. 获取 \`payload\`（接口业务参数，详见各接口定义）
3. 获取 \`timestamp\`（Timestamp，毫秒级时间戳）
4. 获取 \`appSecret\`（商户密钥）
5. 将上述四个字符串拼接：\`signSource = appId + payload + timestamp + appSecret\`
6. 对 \`signSource\` 字符串进行 **MD5** 加密（32位小写/大写均可）

**注意：** 时间戳与服务器时间误差不能超过 **5 分钟**，否则请求将被拒绝。

### 1.4 统一响应格式
所有接口均返回以下 JSON 结构：

\`{ "code": 200, "msg": "success", "data": { ... } }\`

| 字段 | 类型 | 描述 |
| :--- | :--- | :--- |
| \`code\` | Integer | 状态码，200 表示成功，其他表示失败 |
| \`msg\` | String | 状态描述信息 |
| \`data\` | Object | 业务数据 (失败时可能为 null) |

### 1.5 错误码参考

| 错误码 | 描述 | 处理建议 |
| :--- | :--- | :--- |
| 200 | 成功 | - |
| 400 | 参数错误 | 检查请求参数是否完整、格式是否正确 |
| 401 | 认证失败 | 检查 App-Id、Sign 是否正确 |
| 403 | 商户账号已被禁用 | 联系管理员启用账号 |
| 403 | 商户服务已到期 | 联系管理员续期 |
| 403 | 商户无权调用该功能 | 联系管理员开通对应权限 |
| 408 | 请求已过期 | 检查系统时间是否准确 |
| 500 | 服务器内部错误 | 稍后重试或联系技术支持 |

---

## 2. 商户系统集成接口

### 2.1 同步外部用户
当您的用户首次登录您的系统或资料更新时，调用此接口将用户信息同步到算力平台。

**接口地址：** \`POST /user/sync\`

**所需权限：** \`user-sync\`

**签名 Payload：** \`externalUserId\`

**请求参数 (JSON Body)：**
| 参数 | 类型 | 必填 | 描述 |
| :--- | :--- | :--- | :--- |
| \`externalUserId\` | String | 是 | 您系统中的用户唯一标识 (如 OpenID 或 UID) |
| \`nickname\` | String | 否 | 用户昵称 |
| \`avatarUrl\` | String | 否 | 用户头像 URL |

**响应示例：**
\`{ "code": 200, "msg": "success", "data": { "id": 10086, "externalUserId": "user_123", "nickname": "张三" } }\`

---

### 2.2 绑定设备 (上机)
将扫描到的设备或手动输入的设备码绑定到指定用户下。

**接口地址：** \`POST /device/bind\`

**所需权限：** \`device-bind\`

**签名 Payload：** \`externalUserId + (sn 或 bindCode)\`

**请求参数 (JSON Body)：**
| 参数 | 类型 | 必填 | 描述 |
| :--- | :--- | :--- | :--- |
| \`externalUserId\` | String | 是 | 外部系统用户标识 |
| \`sn\` | String | 二选一 | 设备 SN 码 |
| \`bindCode\` | String | 二选一 | 设备绑定码 |

**响应示例：**
\`{ "code": 200, "msg": "success", "data": "绑定成功" }\`

---

### 2.3 解绑设备 (下机)
解除用户与设备的绑定关系。

**接口地址：** \`POST /device/unbind\`

**所需权限：** \`device-bind\`

**签名 Payload：** \`externalUserId + sn\`

**请求参数 (JSON Body)：**
| 参数 | 类型 | 必填 | 描述 |
| :--- | :--- | :--- | :--- |
| \`externalUserId\` | String | 是 | 外部系统用户标识 |
| \`sn\` | String | 是 | 设备 SN 码 |

**响应示例：**
\`{ "code": 200, "msg": "success", "data": "解绑成功" }\`

---

### 2.4 查看用户设备列表
查询指定用户当前绑定的所有设备及其状态。

**接口地址：** \`GET /device/list\`

**所需权限：** \`device-list\`

**签名 Payload：** \`externalUserId\`

**Query 参数：**
| 参数 | 类型 | 必填 | 描述 |
| :--- | :--- | :--- | :--- |
| \`externalUserId\` | String | 是 | 外部系统用户标识 |

**响应示例：**
\`{ "code": 200, "msg": "success", "data": [{ "sn": "SN123456", "deviceName": "算力节点A", "status": 1 }] }\`

---

## 3. AI 算力调用接口

### 3.1 提交 AI 任务
支持文生视频、图生视频等 AI 创作任务。

**接口地址：** \`POST /ai-task/submit\`

**所需权限：** 与 \`taskType\` 对应 (如 \`text-to-video\`)

**签名 Payload：** \`taskType\` (如: \`text-to-video\`)

**请求参数 (JSON Body)：**
| 参数 | 类型 | 必填 | 描述 |
| :--- | :--- | :--- | :--- |
| \`externalUserId\` | String | 是 | 外部系统用户标识 (任务将关联到该用户) |
| \`taskType\` | String | 是 | 任务类型: \`text-to-video\`, \`image-to-video\`, \`text-to-image\`, \`image-to-image\` |
| \`prompt\` | String | 是 | 提示词/描述 |
| \`inputImageUrl\` | String | 条件必填 | 参考图 URL (图生视频/图生图时必填) |
| \`options\` | String | 否 | 额外参数 JSON 字符串 |

**响应示例：**
\`{ "code": 200, "msg": "success", "data": "task_abc123def456" }\`

**说明：** 返回的 \`data\` 为任务 ID，用于后续查询任务状态。

---

### 3.2 查询任务状态
根据任务 ID 获取生成结果。

**接口地址：** \`GET /ai-task/status/{taskId}\`

**签名 Payload：** \`taskId\`

**路径参数：**
| 参数 | 类型 | 必填 | 描述 |
| :--- | :--- | :--- | :--- |
| \`taskId\` | String | 是 | 任务 ID (提交任务时返回) |

**Query 参数：**
| 参数 | 类型 | 必填 | 描述 |
| :--- | :--- | :--- | :--- |
| \`externalUserId\` | String | 是 | 外部系统用户标识 (用于权限校验) |

**响应示例：**
\`{ "code": 200, "data": { "taskId": "task_abc123", "status": "completed", "resultUrl": "https://..." } }\`

**任务状态说明：**
| 状态值 | 描述 |
| :--- | :--- |
| \`pending\` | 等待处理 |
| \`processing\` | 处理中 |
| \`completed\` | 已完成 (可获取 resultUrl) |
| \`failed\` | 失败 (查看 errorMsg) |

---

## 4. 收益查询接口

### 4.1 查询用户收益汇总

**接口地址：** \`GET /earnings/summary\`

**所需权限：** \`earnings-query\`

**签名 Payload：** \`externalUserId\`

**响应字段：** totalEarnings(总收益), yesterdayEarnings(昨日收益), balance(余额), withdrawable(可提现), pendingWithdraw(待审核)

---

### 4.2 查询用户收益明细

**接口地址：** \`GET /earnings/list\`

**所需权限：** \`earnings-query\`

**Query 参数：** externalUserId(必填), page, size

---

### 4.3 查询用户提现记录

**接口地址：** \`GET /withdraw/list\`

**所需权限：** \`earnings-query\`

**Query 参数：** externalUserId(必填), page, size

**提现状态：** 0-待审核, 1-已通过, 2-已拒绝, 3-已打款, 4-失败

---

## 5. 商户管理接口 (代理商视角)

### 5.1 获取商户概览统计
获取代理商名下的全局概览数据，包括总用户数、总设备数、在线率及账户佣金余额。

**接口地址：** \`GET /merchant/summary\`

**签名 Payload：** \`appId\` (商户自己的 AppId)

**响应内容：** 商户名称、总用户数、总设备数、在线设备数、下属用户总收益、余额、商户等级、到期时间。

---

### 5.2 获取下属用户清单 (可选)
分页调取所有归属于本商户的用户信息。注：若直接调用设备绑定接口，系统会自动创建背景用户，无需强制调用同步接口。
分页调取所有归属于本商户的用户信息。

**接口地址：** \`GET /merchant/user/list\`

**签名 Payload：** \`appId\`

**Query 参数：** page, size

---

### 5.3 全量设备监控
查看名下归属的所有设备运行状态，用于全局监控。

**接口地址：** \`GET /merchant/device/list\`

**签名 Payload：** \`appId\`

**Query 参数：** page, size

---

### 5.4 发展趋势数据
获取近 30 天的运营增长规划分析数据。

**接口地址：** \`GET /merchant/stats/trend\`

**签名 Payload：** \`appId\`

**响应内容：** labels(日期), userGrowth(每日新增用户), deviceGrowth(每日新增设备), earningsGrowth(每日总产生的用户收益)

---

### 5.5 商户按小时收益明细
按小时记录平铺返回商户名下全部设备的收益流水，适合分页查看和逐小时对账。

**接口地址：** \`GET /merchant/earnings/hourly\`

**所需权限：** \`earnings-query\`

**签名 Payload：** \`appId\`

**Query 参数：** page, size, startTime(\`yyyy-MM-dd HH:mm:ss\`), endTime(\`yyyy-MM-dd HH:mm:ss\`)

**响应说明：** \`total\` 为符合商户设备与时间筛选条件的小时收益记录总数，不受当前分页限制；\`records\` 为当前页数据。

**响应示例：**
\`{ "code": 200, "msg": "success", "data": { "page": 1, "size": 100, "total": 236, "records": [{ "id": 1865240, "deviceSn": "JX-9554BF58D671", "externalUserId": "13", "amount": 0.34, "date": "2026-04-15", "createTime": "2026-04-15 20:13:34" }] } }\`

---

### 5.6 商户按日收益汇总
按“天”聚合商户名下所有收益，适合日报和按天对账。

**接口地址：** \`GET /merchant/earnings/daily\`

**所需权限：** \`earnings-query\`

**签名 Payload：** \`appId\`

**Query 参数：** page, size, startDate(\`yyyy-MM-dd\`), endDate(\`yyyy-MM-dd\`)

**响应示例：**
\`{ "code": 200, "msg": "success", "data": { "page": 1, "size": 30, "total": 3, "records": [{ "date": "2026-04-02", "earnings": 123.45 }] } }\`

---

### 5.7 商户按月收益汇总
按“月”聚合商户名下所有收益，适合月报和结算汇总。

**接口地址：** \`GET /merchant/earnings/monthly\`

**所需权限：** \`earnings-query\`

**签名 Payload：** \`appId\`

**Query 参数：** page, size, startMonth(\`yyyy-MM\`), endMonth(\`yyyy-MM\`)

**响应示例：**
\`{ "code": 200, "msg": "success", "data": { "page": 1, "size": 12, "total": 2, "records": [{ "month": "2026-04", "earnings": 1234.56 }] } }\`

---

## 6. 签名示例 (Java)

\`String signSource = appId + payload + timestamp + appSecret;\`

\`String sign = DigestUtils.md5DigestAsHex(signSource.getBytes(StandardCharsets.UTF_8));\`

## 7. 签名示例 (JavaScript)

\`const signSource = appId + payload + timestamp + appSecret;\`

\`const sign = crypto.createHash('md5').update(signSource).digest('hex');\`
`

// 简单的 Markdown 转 HTML 函数 (仅处理此文档中的常用标记)
const renderedMarkdown = computed(() => {
  let html = markdown
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^\*\* (.*$)/gim, '<b>$1</b>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n\n/g, '<br/>')
    .replace(/---/g, '<hr/>')
    .replace(/\| (.*) \|/g, (match, p1) => {
        const cells = p1.split('|').map(c => `<td>${c.trim()}</td>`).join('')
        return `<tr>${cells}</tr>`
    })
    .replace(/<tr>(.*?)<\/tr>/g, (match) => `<table class="doc-table">${match}</table>`)
    // 清理 table 重复嵌套
    .replace(/<\/table><table class="doc-table">/g, '')

  return html
})

const copyDocUrl = () => {
  const url = window.location.href
  navigator.clipboard.writeText(url).then(() => {
    ElMessage.success('文档链接已复制')
  })
}
</script>

<style scoped>
.api-doc-page {
  padding: 0;
}
.doc-card {
  border-radius: 12px;
  max-width: 900px;
  margin: 0 auto;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.title {
  font-size: 18px;
  font-weight: 700;
}
.doc-content {
  line-height: 1.8;
  color: #2c3e50;
}
:deep(h1), :deep(h2), :deep(h3) {
  color: #1a1a1a;
  margin-top: 24px;
}
:deep(code) {
  background: #f8f9fa;
  padding: 2px 6px;
  border-radius: 4px;
  color: #e83e8c;
  font-family: monospace;
}
:deep(hr) {
  border: none;
  border-top: 1px solid #eee;
  margin: 20px 0;
}
:deep(.doc-table) {
  width: 100%;
  border-collapse: collapse;
  margin: 16px 0;
}
:deep(.doc-table td) {
  border: 1px solid #dfe2e5;
  padding: 8px 12px;
}
:deep(.doc-table tr:nth-child(2n)) {
  background-color: #f6f8fa;
}
</style>
