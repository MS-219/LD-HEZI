# 聚芯算力开放平台 API 接口文档 (v2.1)

欢迎使用聚芯算力开放平台。本接口文档面向合作伙伴（商户/代理商），用于集成 AI 算力能力、管理用户与设备，并提供代理商视角的数据与收益结算。

---

## 1. 接口说明

### 1.1 请求域名
`https://{your-domain}/api/open`

说明：建议使用 HTTPS。如需 HTTP，请以实际部署为准。

### 1.2 通用请求头 (Header)
所有开放接口请求均需在 Header 携带以下信息用于身份校验与签名验证。

| 参数 | 类型 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| **App-Id** | String | 是 | 商户唯一标识（由平台开通） |
| **Timestamp** | String | 是 | 毫秒级时间戳，如 `1704067200000` |
| **Sign** | String | 是 | 请求签名（见 1.3） |

### 1.3 签名算法 (Sign)
签名用于校验请求合法性与内容完整性。

步骤：
1. 获取 `appId`（App-Id）
2. 获取 `payload`（该接口指定的签名拼接内容）
3. 获取 `timestamp`（毫秒级时间戳）
4. 获取 `appSecret`（商户密钥）
5. 拼接：`signSource = appId + payload + timestamp + appSecret`
6. 对 `signSource` 进行 **MD5** 加密，输出 32 位字符串（大小写不敏感）

> 时间戳与服务器时间误差不得超过 5 分钟，否则请求会被拒绝。

### 1.4 各接口签名 Payload 规则

| 接口 | Payload 规则 |
| :--- | :--- |
| `POST /user/sync` | `externalUserId` |
| `POST /device/bind` | `externalUserId + (sn 或 bindCode)` |
| `POST /device/unbind` | `externalUserId + sn` |
| `GET /device/list` | `externalUserId` |
| `POST /ai-task/submit` | `taskType` |
| `GET /ai-task/status/{taskId}` | `taskId` |
| `GET /earnings/summary` | `externalUserId` |
| `GET /earnings/list` | `externalUserId` |
| `GET /withdraw/list` | `externalUserId` |
| `GET /merchant/summary` | `appId` |
| `GET /merchant/user/list` | `appId` |
| `GET /merchant/device/list` | `appId` |
| `GET /merchant/device/earnings` | `appId` |
| `GET /merchant/earnings/hourly` | `appId` |
| `GET /merchant/earnings/daily` | `appId` |
| `GET /merchant/earnings/monthly` | `appId` |
| `GET /merchant/stats/trend` | `appId` |

### 1.5 统一响应格式

```json
{
  "code": 200,
  "msg": "success",
  "data": { }
}
```

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `code` | Integer | 状态码，200 为成功 |
| `msg` | String | 状态信息 |
| `data` | Object | 业务数据，失败时可能为 null |

### 1.6 错误码参考

| 错误码 | 说明 | 建议处理 |
| :--- | :--- | :--- |
| 200 | 成功 | - |
| 400 | 参数错误 | 检查参数完整性与格式 |
| 401 | 认证失败 | 检查 App-Id/Sign |
| 403 | 商户状态异常/无权限/已到期 | 联系管理员 | 
| 408 | 请求过期 | 校验时间戳 |
| 500 | 服务器异常 | 稍后重试 |

说明：实际错误以 `code` 与 `msg` 为准，建议前端直接展示或记录 `msg`。

### 1.7 时间格式与时区
- 所有时间字段建议使用 `YYYY-MM-DD HH:mm:ss`。
- 若未明确说明，时间以服务器时区为准。

---

## 2. 商户系统集成接口

### 2.1 同步外部用户
当用户首次登录或资料更新时调用，将用户信息同步至平台。

**接口地址：** `POST /user/sync`

**所需权限：** `user-sync`

**签名 Payload：** `externalUserId`

**请求参数 (JSON Body)**
| 参数 | 类型 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| `externalUserId` | String | 是 | 外部系统用户唯一标识 |
| `nickname` | String | 否 | 用户昵称 |
| `avatarUrl` | String | 否 | 用户头像 URL |

**响应示例**
```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "id": 10086,
    "externalUserId": "user_123",
    "nickname": "张三",
    "avatarUrl": "https://example.com/avatar.jpg"
  }
}
```

---

### 2.2 绑定设备（上机）
将设备绑定到指定用户。

**接口地址：** `POST /device/bind`

**所需权限：** `device-bind`

**签名 Payload：** `externalUserId + (sn 或 bindCode)`

**请求参数 (JSON Body)**
| 参数 | 类型 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| `externalUserId` | String | 是 | 外部系统用户标识 |
| `sn` | String | 二选一 | 设备 SN |
| `bindCode` | String | 二选一 | 设备绑定码 |

**业务规则**
- 设备首次绑定时会归属当前代理商。
- 设备一旦归属某代理商，后续只能由该代理商的用户再次绑定。

**响应示例**
```json
{
  "code": 200,
  "msg": "success",
  "data": "绑定成功"
}
```

---

### 2.3 解绑设备（下机）
解除用户与设备的绑定关系。

**接口地址：** `POST /device/unbind`

**所需权限：** `device-bind`

**签名 Payload：** `externalUserId + sn`

**请求参数 (JSON Body)**
| 参数 | 类型 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| `externalUserId` | String | 是 | 外部系统用户标识 |
| `sn` | String | 是 | 设备 SN |

**业务规则**
- 解绑只解除用户关系，设备仍归属原代理商。

**响应示例**
```json
{
  "code": 200,
  "msg": "success",
  "data": "解绑成功"
}
```

---

### 2.4 查看用户设备列表
查询指定用户当前绑定的设备列表。

**接口地址：** `GET /device/list`

**所需权限：** `device-list`

**签名 Payload：** `externalUserId`

**Query 参数**
| 参数 | 类型 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| `externalUserId` | String | 是 | 外部系统用户标识 |

**响应示例**
```json
{
  "code": 200,
  "msg": "success",
  "data": [
    {
      "id": 1,
      "sn": "SN123456",
      "name": "算力节点A",
      "status": 1,
      "bindTime": "2024-01-01 12:00:00"
    }
  ]
}
```

---

## 3. AI 算力调用接口

### 3.1 提交 AI 任务
支持文生视频、图生视频、文生图、图生图等任务。

**接口地址：** `POST /ai-task/submit`

**所需权限：** 与 `taskType` 对应（如 `text-to-video`）

**签名 Payload：** `taskType`

**请求参数 (JSON Body)**
| 参数 | 类型 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| `externalUserId` | String | 是 | 外部系统用户标识 |
| `taskType` | String | 是 | `text-to-video` / `image-to-video` / `text-to-image` / `image-to-image` |
| `prompt` | String | 是 | 提示词 |
| `inputImageUrl` | String | 条件必填 | 图生类任务必填 |
| `options` | String | 否 | 额外参数 JSON 字符串 |

**响应示例**
```json
{
  "code": 200,
  "msg": "success",
  "data": "task_abc123def456"
}
```

---

### 3.2 查询任务状态

**接口地址：** `GET /ai-task/status/{taskId}`

**签名 Payload：** `taskId`

**Query 参数**
| 参数 | 类型 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| `externalUserId` | String | 是 | 外部系统用户标识 |

**响应示例**
```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "taskId": "task_abc123def456",
    "taskType": "text-to-video",
    "status": "completed",
    "prompt": "一只猫在草地上奔跑",
    "resultUrl": "https://example.com/video/result.mp4",
    "errorMsg": null,
    "createTime": "2024-01-01 12:00:00",
    "completeTime": "2024-01-01 12:05:00"
  }
}
```

**任务状态**
| 状态 | 说明 |
| :--- | :--- |
| `pending` | 等待处理 |
| `processing` | 处理中 |
| `completed` | 已完成 |
| `failed` | 失败 |

---

## 4. 收益查询接口

### 4.1 查询用户收益汇总

**接口地址：** `GET /earnings/summary`

**所需权限：** `earnings-query`

**签名 Payload：** `externalUserId`

**Query 参数**
| 参数 | 类型 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| `externalUserId` | String | 是 | 外部系统用户标识 |

**响应示例**
```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "totalEarnings": 1234.56,
    "yesterdayEarnings": 12.34,
    "balance": 500.00,
    "withdrawable": 480.00,
    "pendingWithdraw": 100.00
  }
}
```

---

### 4.2 查询用户收益明细

查询指定用户的逐笔收益记录，每条记录包含设备 SN 和精确到秒的发放时间，与小程序「收益明细」页面展示的数据一一对应。
该接口是单个 `externalUserId` 维度查询；如果需要查询商户名下全部设备的小时收益，请使用 `GET /merchant/earnings/hourly`。

**接口地址：** `GET /earnings/list`

**所需权限：** `earnings-query`

**签名 Payload：** `externalUserId`

**Query 参数**
| 参数 | 类型 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| `externalUserId` | String | 是 | 外部系统用户标识 |
| `page` | Integer | 否 | 默认 1 |
| `size` | Integer | 否 | 默认 20 |

**响应字段**
| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `id` | Long | 收益记录 ID |
| `deviceSn` | String | 产生收益的设备 SN（如 `JX24BE10`） |
| `amount` | BigDecimal | 收益金额（元） |
| `date` | String | 收益所属日期 `yyyy-MM-dd` |
| `createTime` | String | 收益发放时间，精确到秒 `yyyy-MM-dd HH:mm:ss` |

**响应示例**
```json
{
  "code": 200,
  "msg": "success",
  "data": [
    {
      "id": 1001,
      "deviceSn": "JX24BE10",
      "amount": 0.35,
      "date": "2026-03-15",
      "createTime": "2026-03-15 10:43:33"
    },
    {
      "id": 1002,
      "deviceSn": "JX9A8732",
      "amount": 0.35,
      "date": "2026-03-15",
      "createTime": "2026-03-15 10:43:33"
    }
  ]
}
```

---

### 4.3 查询用户提现记录

**接口地址：** `GET /withdraw/list`

**所需权限：** `earnings-query`

**签名 Payload：** `externalUserId`

**Query 参数**
| 参数 | 类型 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| `externalUserId` | String | 是 | 外部系统用户标识 |
| `page` | Integer | 否 | 默认 1 |
| `size` | Integer | 否 | 默认 20 |

---

## 5. 商户管理接口 (代理商视角)

用于代理商查看名下用户、设备、收益趋势与余额。

### 5.1 获取商户概览统计

**接口地址：** `GET /merchant/summary`

**签名 Payload：** `appId`

---

### 5.2 获取下属用户列表

**接口地址：** `GET /merchant/user/list`

**签名 Payload：** `appId`

---

### 5.3 获取名下设备列表

**接口地址：** `GET /merchant/device/list`

**签名 Payload：** `appId`

---

### 5.4 获取名下设备收益（按设备统计）

**接口地址：** `GET /merchant/device/earnings`

**签名 Payload：** `appId`

**Query 参数**
| 参数 | 类型 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| `page` | Integer | 否 | 默认 1 |
| `size` | Integer | 否 | 默认 20 |

**响应示例**
```json
{
  "code": 200,
  "msg": "success",
  "data": [
    {
      "sn": "SN888888",
      "name": "算力节点A",
      "status": 1,
      "lastHeartbeat": "2024-01-20 15:30:00",
      "totalEarnings": 123.45,
      "yesterdayEarnings": 3.21
    }
  ]
}
```

---

### 5.5 获取商户按小时收益明细（全部设备）

按"小时记录"维度平铺返回商户名下全部设备的收益明细，适用于商户后台分页查看所有设备的逐小时收益流水。

**接口地址：** `GET /merchant/earnings/hourly`

**统计口径：** 直接查询商户名下设备的收益流水记录，返回的 `id` 为收益流水表真实主键，可作为小时记录唯一 ID。按小时记录自行汇总后，应与日/月汇总接口的统计结果保持一致。

**所需权限：** `earnings-query`

**签名 Payload：** `appId`

**Query 参数**
| 参数 | 类型 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| `page` | Integer | 否 | 默认 1 |
| `size` | Integer | 否 | 默认 20 |
| `startTime` | String | 否 | 开始时间，格式 `yyyy-MM-dd HH:mm:ss` |
| `endTime` | String | 否 | 结束时间，格式 `yyyy-MM-dd HH:mm:ss` |

**响应字段**
| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `page` | Integer | 当前页码 |
| `size` | Integer | 当前每页条数 |
| `total` | Long | 符合商户设备与时间筛选条件的小时收益记录总数，不受当前分页限制 |
| `records` | Array | 当前页小时收益记录列表 |

**records 字段**
| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `id` | Long | 收益记录 ID |
| `deviceSn` | String | 设备 SN |
| `externalUserId` | String | 设备归属用户的外部 ID（如存在） |
| `amount` | BigDecimal | 本小时收益金额 |
| `date` | String | 收益所属日期 `yyyy-MM-dd` |
| `createTime` | String | 收益发放时间，精确到秒 `yyyy-MM-dd HH:mm:ss` |

**响应示例**
```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "page": 1,
    "size": 100,
    "total": 236,
    "records": [
      {
        "id": 1865240,
        "deviceSn": "JX-9554BF58D671",
        "externalUserId": "13",
        "amount": 0.34,
        "date": "2026-04-15",
        "createTime": "2026-04-15 20:13:34"
      },
      {
        "id": 1865311,
        "deviceSn": "JX-812345678901",
        "externalUserId": "13",
        "amount": 0.34,
        "date": "2026-04-15",
        "createTime": "2026-04-15 20:13:34"
      }
    ]
  }
}
```

---

### 5.6 获取发展趋势数据

**接口地址：** `GET /merchant/stats/trend`

**签名 Payload：** `appId`

---

### 5.7 获取商户按日收益汇总（含设备维度明细）

按"天"聚合商户名下所有收益，每日记录包含 `dailyTotal`（当日汇总）和 `devices`（按设备拆分的明细），适用于日报、财务对账和按设备追溯。

**接口地址：** `GET /merchant/earnings/daily`

**统计口径：** 基于商户名下设备的收益流水实时按天聚合，不是独立日汇总表，因此不返回数据库主键。可使用 `date` 作为每日汇总业务唯一键，或使用 `date + deviceSn` 作为设备日明细业务唯一键。

**所需权限：** `earnings-query`

**签名 Payload：** `appId`

**Query 参数**
| 参数 | 类型 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| `page` | Integer | 否 | 默认 1 |
| `size` | Integer | 否 | 默认 30 |
| `startDate` | String | 否 | 开始日期，格式 `yyyy-MM-dd` |
| `endDate` | String | 否 | 结束日期，格式 `yyyy-MM-dd` |

**响应字段**
| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `date` | String | 日期 `yyyy-MM-dd` |
| `dailyTotal` | BigDecimal | 当日所有设备收益合计 |
| `devices` | Array | 当日各设备的收益明细列表 |
| `devices[].deviceSn` | String | 设备 SN |
| `devices[].externalUserId` | String | 设备归属用户的外部 ID |
| `devices[].earnings` | BigDecimal | 该设备当日收益 |

**响应示例**
```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "page": 1,
    "size": 30,
    "total": 2,
    "records": [
      {
        "date": "2026-04-10",
        "dailyTotal": 25.60,
        "devices": [
          { "deviceSn": "JX24BE10", "externalUserId": "user_001", "earnings": 15.20 },
          { "deviceSn": "JX9A8732", "externalUserId": "user_002", "earnings": 10.40 }
        ]
      },
      {
        "date": "2026-04-09",
        "dailyTotal": 18.30,
        "devices": [
          { "deviceSn": "JX24BE10", "externalUserId": "user_001", "earnings": 18.30 }
        ]
      }
    ]
  }
}
```

---

### 5.8 获取商户按月收益汇总（含设备维度明细）

按"月"聚合商户名下所有收益，每月记录包含 `monthlyTotal`（当月汇总）和 `devices`（按设备拆分的明细），适用于月报、结算汇总、经营分析。

**接口地址：** `GET /merchant/earnings/monthly`

**统计口径：** 基于商户名下设备的收益流水实时按月聚合，不是独立月汇总表，因此不返回数据库主键。可使用 `month` 作为每月汇总业务唯一键，或使用 `month + deviceSn` 作为设备月明细业务唯一键。

**所需权限：** `earnings-query`

**签名 Payload：** `appId`

**Query 参数**
| 参数 | 类型 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| `page` | Integer | 否 | 默认 1 |
| `size` | Integer | 否 | 默认 12 |
| `startMonth` | String | 否 | 开始月份，格式 `yyyy-MM` |
| `endMonth` | String | 否 | 结束月份，格式 `yyyy-MM` |

**响应字段**
| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `month` | String | 月份 `yyyy-MM` |
| `monthlyTotal` | BigDecimal | 当月所有设备收益合计 |
| `devices` | Array | 当月各设备的收益明细列表 |
| `devices[].deviceSn` | String | 设备 SN |
| `devices[].externalUserId` | String | 设备归属用户的外部 ID |
| `devices[].earnings` | BigDecimal | 该设备当月收益 |

**响应示例**
```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "page": 1,
    "size": 12,
    "total": 2,
    "records": [
      {
        "month": "2026-04",
        "monthlyTotal": 580.00,
        "devices": [
          { "deviceSn": "JX24BE10", "externalUserId": "user_001", "earnings": 380.00 },
          { "deviceSn": "JX9A8732", "externalUserId": "user_002", "earnings": 200.00 }
        ]
      },
      {
        "month": "2026-03",
        "monthlyTotal": 9876.54,
        "devices": [
          { "deviceSn": "JX24BE10", "externalUserId": "user_001", "earnings": 5000.00 },
          { "deviceSn": "JX9A8732", "externalUserId": "user_002", "earnings": 4876.54 }
        ]
      }
    ]
  }
}
```


## 6. 权限枚举

| 权限 | 说明 |
| :--- | :--- |
| `text-to-video` | 文生视频 |
| `image-to-video` | 图生视频 |
| `text-to-image` | 文生图 |
| `image-to-image` | 图生图 |
| `user-sync` | 用户同步 |
| `device-bind` | 设备绑定/解绑 |
| `device-list` | 设备列表查询 |
| `earnings-query` | 收益查询 |

---

## 7. 签名示例

### Java
```java
String appId = "your_app_id";
String appSecret = "your_app_secret";
String payload = "your_payload";
String timestamp = String.valueOf(System.currentTimeMillis());
String signSource = appId + payload + timestamp + appSecret;
String sign = DigestUtils.md5DigestAsHex(signSource.getBytes(StandardCharsets.UTF_8));
```

### JavaScript
```javascript
const crypto = require('crypto');
const appId = 'your_app_id';
const appSecret = 'your_app_secret';
const payload = 'your_payload';
const timestamp = Date.now().toString();
const signSource = appId + payload + timestamp + appSecret;
const sign = crypto.createHash('md5').update(signSource).digest('hex');
```

### Python
```python
import hashlib, time
app_id = 'your_app_id'
app_secret = 'your_app_secret'
payload = 'your_payload'
timestamp = str(int(time.time() * 1000))
sign_source = app_id + payload + timestamp + app_secret
sign = hashlib.md5(sign_source.encode()).hexdigest()
```

---

## 8. 完整请求示例

### 提交 AI 任务 (cURL)

```bash
curl -X POST "https://your-domain.com/api/open/ai-task/submit" \
  -H "Content-Type: application/json" \
  -H "App-Id: your_app_id" \
  -H "Timestamp: 1704067200000" \
  -H "Sign: a1b2c3d4e5f6..." \
  -d '{
    "externalUserId": "user_123",
    "taskType": "text-to-video",
    "prompt": "一只猫在草地上奔跑",
    "options": "{\"duration\": 5}"
  }'
```

### 查询商户概览 (cURL)

```bash
curl -X GET "https://your-domain.com/api/open/merchant/summary" \
  -H "App-Id: your_app_id" \
  -H "Timestamp: 1704067200000" \
  -H "Sign: d41d8cd98f00b204e9800998ecf8427e"
```
