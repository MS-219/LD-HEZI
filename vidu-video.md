# Vidu 视频生成接口文档

调用 **灵芽API 视频生成接口** 以生成视频内容，本文档专用于 **Vidu Q3** 系列视频生成模型，支持**文生视频、图生视频、首尾帧生视频、参考生视频以及多主体参考生视频**。

#### [下载本文档MD文件](https://api.lingyaai.cn/doc/coding/vidu-video.md)

---

## 一、支持的模型

### 模型列表

| 模型名称 | 说明 | 适用场景 |
| :--- | :--- | :--- |
| `viduq3-pro` | Vidu Q3 Pro，画质优先 | 文生视频、图生视频、首尾帧 |
| `viduq3-turbo` | Vidu Q3 Turbo，速度优先 | 文生视频、图生视频、首尾帧 |
| `viduq3-turbo-r2v` | Vidu Q3 Turbo 参考生专用别名 | 参考生视频（主体 / 非主体模式） |
| `viduq3-mix` | Vidu Q3 Mix，画质均衡 | 参考生视频（非主体模式） |
| `viduq3` | Vidu Q3 标准版，多镜头一致性 | 参考生视频（主体 / 非主体模式） |

> `viduq3-turbo-r2v` 是 `viduq3-turbo` 的参考生视频别名，上游实际使用 `viduq3-turbo` 模型。需要 Turbo 速度做参考生时使用此模型名。

---

> **提示**：在灵芽中将密钥分配到 **专用分组（目前默认分组即可享受折扣）** 通常会有额外折扣。

#### Vidu 视频生成

| 模型 | 分辨率 | 原价 (CNY) | 限时 75 折优惠 |
| :--- | :--- | :--- | :--- |
| **viduq3-pro** | 540P | ~~￥0.32 / 秒~~ | **￥0.24 / 秒** |
| | 720P | ~~￥0.79 / 秒~~ | **￥0.5925 / 秒** |
| | 1080P | ~~￥0.94 / 秒~~ | **￥0.705 / 秒** |
| **viduq3-turbo** | 540P | ~~￥0.25 / 秒~~ | **￥0.1875 / 秒** |
| | 720P | ~~￥0.38 / 秒~~ | **￥0.285 / 秒** |
| | 1080P | ~~￥0.44 / 秒~~ | **￥0.33 / 秒** |
| **viduq3** | 540P | ~~￥0.32 / 秒~~ | **￥0.24 / 秒** |
| | 720P | ~~￥0.63 / 秒~~ | **￥0.4725 / 秒** |
| | 1080P | ~~￥0.79 / 秒~~ | **￥0.5925 / 秒** |
| **viduq3-mix** | 720P | ~~￥0.79 / 秒~~ | **￥0.5925 / 秒** |
| | 1080P | ~~￥0.94 / 秒~~ | **￥0.705 / 秒** |

> **计费说明**：
> - 按生成视频的**实际时长（秒）** 计费，`duration` 参数直接影响费用。
> - 不同分辨率（`540p` / `720p` / `1080p`）按倍率计费，详见后台分组配置。
> - 实际计费以任务完成后的上游响应为准（多退少补）。

---

## 二、生成视频

由于视频生成任务耗时较长（通常为 1-5 分钟），API 采用异步调用。整个流程包含 **"创建任务 → 轮询获取"** 两个核心步骤。

### API 端点

```
POST /v1/videos
```

### 请求头

| 参数 | 类型 | 必填 | 描述 |
| :--- | :--- | :--- | :--- |
| Authorization | string | 是 | 用户认证令牌（`Bearer sk-xxxx`） |
| Content-Type | string | 是 | **application/json** |

### 通用参数

> 灵芽 Vidu 接入采用**透传模式**，请求体完全对标 Vidu 原厂参数。

| 参数 | 类型 | 必填 | 描述 |
| :--- | :--- | :--- | :--- |
| **model** | string | 是 | 模型名称：`viduq3-pro` / `viduq3-turbo` / `viduq3` / `viduq3-mix` |
| **prompt** | string | 条件必填 | 提示词。文生视频必填；其他场景可选。<br>**最大长度**：单次任务 ≤ 5000 字符（参考生视频非主体模式 ≤ 2000 字符）。 |
| **duration** | integer | 否 | 生成视频时长（秒）。默认 `5`。<br>- 文生 / 图生 / 首尾帧：`1 ~ 16`<br>- 参考生视频：`3 ~ 16`<br>⚠️ **直接影响费用，按秒计费。** |
| **resolution** | string | 否 | 视频分辨率，默认 `720p`。<br>- `viduq3-pro` / `viduq3-turbo` / `viduq3`：`540p` / `720p` / `1080p`<br>- `viduq3-mix`：`720p` / `1080p` |
| **aspect_ratio** | string | 否 | 画面比例，默认 `16:9`。<br>- 文生视频：`16:9` / `9:16` / `1:1` / `3:4` / `4:3`<br>- 参考生视频（主体模式）：`16:9` / `9:16` / `1:1`<br>- 图生 / 首尾帧 / 参考生（非主体）以输入图为准。 |
| **seed** | integer | 否 | 随机种子，相同 seed + 参数可复现。`0` 或省略表示随机。 |
| **movement_amplitude** | string | 否 | 运镜幅度：`auto`（默认）/ `small` / `medium` / `large`。**Q3 系列暂不生效**，保留以兼容旧版。 |
| **bgm** | boolean | 否 | 是否生成背景音乐，默认 `false`。**Q3 系列受限，可能不生效**。 |
| **audio** | boolean | 否 | 是否生成有声视频。**Q3 系列默认 `true`**。 |
| **watermark** | boolean | 否 | 是否添加水印，默认 `false`。 |
| **wm_position** | integer | 否 | 水印位置：`1` 左上 / `2` 右上 / `3` 右下（默认）/ `4` 左下。 |
| **wm_url** | string | 否 | 自定义水印图片 URL，不传则使用 AI 默认水印。 |
| **off_peak** | boolean | 否 | 是否使用非高峰资源（更便宜，48 小时内完成），默认 `false`。**仅 Q3 + audio 时生效**。 |
| **callback_url** | string | 否 | 任务状态变更时的回调 URL，系统会 POST 推送 `processing` / `success` / `failed` 状态。 |
| **payload** | string | 否 | 透传字符串，原样回传，最大 1048576 字符。 |
| **meta_data** | string | 否 | JSON 格式元数据，用于业务追踪。 |

### 图片资源限制（适用于 `images` / `subjects` 字段）

- **格式**：PNG / JPEG / JPG / WEBP
- **像素**：宽高均 **≥ 128 px**
- **图片宽高比**：必须在 `1:4 ~ 4:1` 之间（即长宽比不超过 4 倍）
- **单图大小**：≤ 50MB
- **请求 body 总大小**：≤ 20MB（如使用 base64，多张图请优先使用 URL）
- **传入方式**：HTTPS URL 或 base64

---

### 请求示例

#### 1. 文生视频

#### 专用参数：无（仅通用参数）

```bash
curl --location --request POST 'https://api.lingyaai.cn/v1/videos' \
--header 'Authorization: Bearer sk-xxx' \
--header 'Content-Type: application/json' \
--data-raw '{
    "model": "viduq3-pro",
    "prompt": "蓝天白云，骏马奔腾，猎豹追逐",
    "duration": 5,
    "resolution": "720p",
    "aspect_ratio": "16:9"
}'
```

---

#### 2. 图生视频

#### 专用参数

| 参数 | 类型 | 必填 | 描述 |
| :--- | :--- | :--- | :--- |
| **images** | array[string] | 是 | 输入图片，**仅 1 张**（首帧）。HTTPS URL 或 base64。 |

#### 请求示例
```bash
curl --location --request POST 'https://api.lingyaai.cn/v1/videos' \
--header 'Authorization: Bearer sk-xxx' \
--header 'Content-Type: application/json' \
--data-raw '{
    "model": "viduq3-pro",
    "images": [
        "https://example.com/first_frame.png"
    ],
    "prompt": "镜头缓慢拉近，人物微笑，头发被微风吹动",
    "duration": 5,
    "resolution": "720p"
}'
```

---

#### 3. 首尾帧生视频

#### 专用参数

| 参数 | 类型 | 必填 | 描述 |
| :--- | :--- | :--- | :--- |
| **images** | array[string] | 是 | **恰好 2 张**：第 1 张为首帧、第 2 张为尾帧。<br>额外约束：两张图分辨率比例需在 **0.8 ~ 1.25** 之间（尺寸接近）。 |

#### 请求示例
```bash
curl --location --request POST 'https://api.lingyaai.cn/v1/videos' \
--header 'Authorization: Bearer sk-xxx' \
--header 'Content-Type: application/json' \
--data-raw '{
    "model": "viduq3-pro",
    "images": [
        "https://example.com/first_frame.jpeg",
        "https://example.com/last_frame.jpeg"
    ],
    "prompt": "镜头从平视升至俯拍，光线柔和过渡",
    "duration": 5
}'
```

---

#### 4. 参考生视频（非主体模式，images）

适用于 `viduq3` / `viduq3-turbo` / `viduq3-mix`，按多张参考图融合生成视频。

#### 专用参数

| 参数 | 类型 | 必填 | 描述 |
| :--- | :--- | :--- | :--- |
| **images** | array[string] | 是 | 参考图列表，**1 ~ 7 张**。 |

> 此模式下 `prompt` 长度限制为 **≤ 2000 字符**。
> `viduq3-mix` 的 `resolution` 仅支持 `720p` / `1080p`。

#### 请求示例
```bash
curl --location --request POST 'https://api.lingyaai.cn/v1/videos' \
--header 'Authorization: Bearer sk-xxx' \
--header 'Content-Type: application/json' \
--data-raw '{
    "model": "viduq3",
    "images": [
        "https://example.com/ref1.png",
        "https://example.com/ref2.png",
        "https://example.com/ref3.png"
    ],
    "prompt": "Santa Claus and the bear hug by the lakeside.",
    "off_peak": false
}'
```

---

#### 5. 参考生视频（主体模式，subjects）

适用于 `viduq3` / `viduq3-turbo`，通过命名主体 + 参考图实现多主体融合生成。

> **注意**：`viduq3-mix` 和 `viduq3-pro` **不支持**主体模式。

#### 专用参数

| 参数 | 类型 | 必填 | 描述 |
| :--- | :--- | :--- | :--- |
| **subjects** | array[object] | 是 | 主体列表。<br>**最多 7 个主体**；每个主体对象包含：<br>- `name`：主体标识（字符串，需在 prompt 中通过 `[@name]` 引用）<br>- `images`：该主体参考图 URL 数组，**每主体最多 3 张** |
| **prompt** | string | 是 | 必填。需用 `[@name]` 引用主体，例如 `[@1] 和 [@2] 拥抱`。最大 5000 字符。 |
| **aspect_ratio** | string | 否 | 仅支持 `16:9`（默认）/ `9:16` / `1:1`。 |

#### 请求示例
```bash
curl --location --request POST 'https://api.lingyaai.cn/v1/videos' \
--header 'Authorization: Bearer sk-xxx' \
--header 'Content-Type: application/json' \
--data-raw '{
    "model": "viduq3",
    "subjects": [
        {
            "name": "1",
            "images": [
                "https://example.com/subject1.png"
            ]
        },
        {
            "name": "2",
            "images": [
                "https://example.com/subject2.png"
            ]
        }
    ],
    "prompt": "[@1] 和 [@2] 在一起吃火锅。",
    "duration": 8,
    "resolution": "720p"
}'
```

---

### 响应格式

#### 200 - 提交成功

```json
{
    "id": "task-xxxxxxxxxxxx",
    "object": "video.generation",
    "status": "pending"
}
```

> **注意**：任务 ID 有效期为 **24 小时**，超时后将无法查询结果。请勿重复创建任务，使用返回的 ID 轮询获取即可。

#### 异常响应

```json
{
    "code": "InvalidApiKey",
    "message": "No API-key provided.",
    "request_id": "7438d53d-6eb8-4596-8835-xxxxxx"
}
```

---

## 三、查询任务状态

视频生成通常需要 1-5 分钟，请通过任务 ID 轮询状态。建议轮询间隔为 **15 秒**。

### API 端点

```
GET /v1/videos/{video_id}
```

### 路径参数

| 参数 | 类型 | 必填 | 描述 |
| :--- | :--- | :--- | :--- |
| video_id | string | 是 | 生成接口返回的 `id` |

---

### 请求示例

```bash
curl --location --request GET 'https://api.lingyaai.cn/v1/videos/task-xxxxxxxxxxxx' \
--header 'Authorization: Bearer sk-xxx'
```

---

### 响应格式

#### 200 - 成功完成 (Completed)

```json
{
    "id": "task-xxxxxxxxxxxx",
    "object": "video.generation",
    "model": "viduq3-pro",
    "status": "completed",
    "progress": "100%",
    "created_at": 1769263230,
    "started_at": 1769263245,
    "completed_at": 1769263322,
    "video_url": "https://xxx/xxx.mp4"
}
```

#### 200 - 处理中 (Processing)

```json
{
    "id": "task-xxxxxxxxxxxx",
    "object": "video.generation",
    "model": "viduq3-pro",
    "status": "processing",
    "progress": "50%",
    "created_at": 1769263230,
    "started_at": 1769263245
}
```

#### 200 - 排队中 (Queued)

```json
{
    "id": "task-xxxxxxxxxxxx",
    "object": "video.generation",
    "model": "viduq3-pro",
    "status": "queued",
    "progress": "0%",
    "created_at": 1769263230
}
```

#### 200 - 任务失败 (Failed)

```json
{
    "id": "task-xxxxxxxxxxxx",
    "object": "video.generation",
    "model": "viduq3-pro",
    "status": "failed",
    "created_at": 1769263230,
    "started_at": 1769263245,
    "completed_at": 1769263322,
    "error": {
        "code": "generation_failed",
        "message": "The parameter is invalid xxxxxx"
    }
}
```

---

### 关键字段说明

| 字段 | 类型 | 描述 |
| :--- | :--- | :--- |
| **id** | string | 任务 ID。 |
| **object** | string | 固定为 `video.generation`。 |
| **model** | string | 使用的模型名称。 |
| **status** | string | 任务状态：<br>`queued`：排队中<br>`processing`：处理中<br>`completed`：已完成<br>`failed`：失败 |
| **progress** | string | 生成进度百分比（如 `"50%"`、`"100%"`）。 |
| **created_at** | integer | 任务创建时间（Unix 时间戳）。 |
| **started_at** | integer | 任务开始处理时间（Unix 时间戳）。 |
| **completed_at** | integer | 任务完成时间（Unix 时间戳）。 |
| **video_url** | string | 视频下载链接（仅 `completed` 时返回）。MP4 格式，链接有效期以上游为准，请及时下载。 |
| **error.code** | string | 错误码（仅 `failed` 时返回）。 |
| **error.message** | string | 错误详情（仅 `failed` 时返回）。 |

---

## 四、任务状态流转

```
queued（排队中） → processing（处理中） → completed（成功） / failed（失败）
```

- 初次查询状态通常为 `queued` 或 `processing`。
- 当状态变为 `completed` 时，响应中将包含 `video_url`。
- 若状态为 `failed`，请检查 `error.code` 和 `error.message` 错误信息并重试。
- 任务 ID 有效期为 **24 小时**，超时后将无法查询结果。

---

## 五、各场景适用模型速查

| 场景 | `viduq3` | `viduq3-pro` | `viduq3-turbo` | `viduq3-turbo-r2v` | `viduq3-mix` |
| :--- | :---: | :---: | :---: | :---: | :---: |
| 文生视频 | ❌ | ✅ | ✅ | ❌ | ❌ |
| 图生视频（首帧） | ❌ | ✅ | ✅ | ❌ | ❌ |
| 首尾帧生视频 | ❌ | ✅ | ✅ | ❌ | ❌ |
| 参考生视频（非主体，images） | ✅ | ❌ | ❌ | ✅ | ✅ |
| 参考生视频（主体，subjects） | ✅ | ❌ | ❌ | ✅ | ❌ |

---

## 六、参数限制总览（速查）

| 维度 | 限制 |
| :--- | :--- |
| `prompt` 最大长度 | 5000 字符（参考生视频非主体模式 2000） |
| `duration` 范围 | 文生/图生/首尾帧：`1 ~ 16`；参考生：`3 ~ 16`，默认 `5` |
| `resolution` 可选 | `540p` / `720p` / `1080p`（mix 仅 `720p`/`1080p`） |
| `aspect_ratio` 可选 | 文生：`16:9` / `9:16` / `1:1` / `3:4` / `4:3`；参考主体：`16:9` / `9:16` / `1:1` |
| 单图大小 | ≤ 50MB |
| 单图像素 | 长宽 ≥ 128 px，长宽比在 `1:4 ~ 4:1` |
| 请求 body 总大小 | ≤ 20MB（base64 图片需注意） |
| 图生视频 `images` 数量 | 必须 1 张 |
| 首尾帧 `images` 数量 | 必须 2 张，分辨率比 `0.8 ~ 1.25` |
| 参考生视频 `images` 数量 | 1 ~ 7 张 |
| 多主体 `subjects` 数量 | 最多 7 个主体，每主体最多 3 张图 |
| 任务 ID 有效期 | 24 小时 |
