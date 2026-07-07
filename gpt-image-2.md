# **GPT-Image-2 图像生成 API**

#### [下载本文档MD文件](https://api.lingyaai.cn/doc/coding/gpt-image-2.md)

**接口路径**：`POST /v1/images/generations`

**推荐模型**：

`gpt-image-2`（OpenAI 新一代图像生成模型，支持文生图与图生图）

**注意：生成图片URL为临时链接（2小时有效），重要作品请保存本地。**

---

### **模型特性**

| 特性 | `gpt-image-2` |
|---------------------|----------------------------|
| **类型** | 图像生成模型 |
| **支持接口** | 图像生成接口 |
| **返回格式** | URL 或 Base64 |
| **图片比例设置** | ✅ 支持 |
| **图生图** | ✅ 支持（最多 16 张） |
| **失败扣费** | ✅ 不扣费 |
| **兼容格式** | DALL·E 格式 |

---

### **请求参数**

#### **Header**
| 参数名 | 类型 | 必需 | 默认值 | 说明 |
|----------------|--------|------|---------------------------|----------------|
| `Authorization`| string | ✅ | `Bearer {{YOUR_API_KEY}}` | API 认证令牌 |
| `Content-Type` | string | ✅ | `application/json` | 请求体类型 |

#### **Body (`application/json`)**
| 参数名 | 类型 | 必需 | 默认值 | 说明 |
|-------------------|------------------|------|----------|----------------------------------------------------------------------|
| `model` | string | ✅ | - | 模型名称：`gpt-image-2` |
| `prompt` | string | ✅ | - | 图像描述文本（支持中英文） |
| `aspect_ratio` | enum[string] | ✅ | `auto` | 图片比例：`auto`、`1:1`、`9:16`、`16:9`、`4:3`、`3:4` |
| `response_format` | string | ❌ | `url` | 返回格式：`url` 或 `b64_json` |
| `image` | array[string] | ❌ | - | **图生图**参考图片列表（URL 或 Base64），可传入 1~16 张 |
| `resolution` | string | ❌ | `1K` | 图片的分辨率：支持 `1K`、`2K`、`4K` 。<br> **⚠️ 注意:**  当 `aspect_ratio` 为 `1:1`、`auto` 或未传参时，分辨率**仅支持 1K**。此时若指定 2K 或 4K 会导致任务创建失败。|

#### **图片输入限制（图生图）**
- **支持格式**：JPEG、PNG、WEBP、JPG
- **最大文件大小**：10MB
- **最大文件数**：16

---

## 📌 使用场景示例

---

## 一、文生图（Text-to-Image）

> 仅通过文字 prompt 生成图片，不传入 `image` 参数。

### 1.1 基础文生图

#### JSON Body
```json
{
    "model": "gpt-image-2",
    "prompt": "一只橘猫躺在窗台上晒太阳，窗外是樱花盛开的春天",
    "aspect_ratio": "16:9"
}
```

#### cURL
```bash
curl -X POST 'https://api.lingyaai.cn/v1/images/generations' \
  -H 'Authorization: Bearer {{YOUR_API_KEY}}' \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "gpt-image-2",
    "prompt": "一只橘猫躺在窗台上晒太阳，窗外是樱花盛开的春天",
    "aspect_ratio": "16:9"
}'
```

---

### 1.2 竖版手机壁纸

#### JSON Body
```json
{
    "model": "gpt-image-2",
    "prompt": "极光星空壁纸，梦幻紫色调，雪山剪影",
    "aspect_ratio": "9:16"
}
```

#### cURL
```bash
curl -X POST 'https://api.lingyaai.cn/v1/images/generations' \
  -H 'Authorization: Bearer {{YOUR_API_KEY}}' \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "gpt-image-2",
    "prompt": "极光星空壁纸，梦幻紫色调，雪山剪影",
    "aspect_ratio": "9:16"
}'
```

---

### 1.3 返回 Base64 格式

#### JSON Body
```json
{
    "model": "gpt-image-2",
    "prompt": "水彩风格的富士山日出，前景是湖面倒影",
    "aspect_ratio": "4:3",
    "response_format": "b64_json"
}
```

---

## 二、图生图（Image-to-Image）

> 传入 `image` 参数（参考图片的 URL 或 Base64），结合 prompt 对图片进行风格转换、编辑、扩展等操作。
> **支持 1~16 张参考图，单张最大 10MB，格式：JPEG / PNG / WEBP / JPG。**

### 2.1 图生图 — 传入图片 URL

#### JSON Body
```json
{
    "model": "gpt-image-2",
    "prompt": "将这张照片转换为吉卜力动画风格，保持原有构图不变，色彩更加温暖明亮",
    "aspect_ratio": "auto",
    "image": [
        "https://example.com/my-photo.jpg"
    ]
}
```

#### cURL
```bash
curl -X POST 'https://api.lingyaai.cn/v1/images/generations' \
  -H 'Authorization: Bearer {{YOUR_API_KEY}}' \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "gpt-image-2",
    "prompt": "将这张照片转换为吉卜力动画风格，保持原有构图不变，色彩更加温暖明亮",
    "aspect_ratio": "auto",
    "image": [
        "https://example.com/my-photo.jpg"
    ]
}'
```

---

### 2.2 图生图 — 传入 Base64 图片

#### JSON Body 示例（Base64 已截断展示）
```json
{
    "model": "gpt-image-2",
    "prompt": "把这张人物照片变成赛博朋克风格的插画，添加霓虹灯光效果",
    "aspect_ratio": "1:1",
    "image": [
        "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAA..."
    ]
}
```

---

### 2.3 图生图 — 多图参考融合

> 传入多张参考图片（最多 16 张），模型会综合参考所有图片进行创作。

#### JSON Body
```json
{
    "model": "gpt-image-2",
    "prompt": "将第一张图的人物融合到第二张图的场景中，保持自然和谐，光影统一",
    "aspect_ratio": "4:3",
    "image": [
        "https://example.com/person.jpg",
        "https://example.com/background.jpg"
    ]
}
```

#### cURL
```bash
curl -X POST 'https://api.lingyaai.cn/v1/images/generations' \
  -H 'Authorization: Bearer {{YOUR_API_KEY}}' \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "gpt-image-2",
    "prompt": "将第一张图的人物融合到第二张图的场景中，保持自然和谐，光影统一",
    "aspect_ratio": "4:3",
    "image": [
        "https://example.com/person.jpg",
        "https://example.com/background.jpg"
    ]
}'
```

---

### 2.4 图生图 — 风景图片编辑

#### JSON Body
```json
{
    "model": "gpt-image-2",
    "prompt": "在这张风景照片中添加一道绚丽的彩虹，并将天空调整为黄昏暖色调",
    "aspect_ratio": "16:9",
    "image": [
        "https://example.com/landscape.jpg"
    ]
}
```

---

## 三、响应格式

### 成功响应（HTTP 200）

#### 返回 URL 格式（默认）
```json
{
    "data": [
        {
            "url": "https://example.com/generated_image.png"
        }
    ]
}
```

#### 返回 Base64 格式
```json
{
    "data": [
        {
            "b64_json": "/9j/4AAQSkZJRgABAQAAAQABAAD..."
        }
    ]
}
```

---

## 四、常见场景速查表

| 场景 | 关键参数 | prompt 示例 |
|------|----------|-------------|
| **基础文生图** | `aspect_ratio: "1:1"` | `"一只柯基在草地上奔跑"` |
| **横版海报** | `aspect_ratio: "16:9"` | `"电影级科幻海报，太空站场景"` |
| **手机壁纸** | `aspect_ratio: "9:16"` | `"极光星空壁纸，梦幻紫色调"` |
| **风格转换** | `image: [url]` | `"转换为油画风格"` |
| **图片编辑** | `image: [url]` | `"移除背景，替换为海滩"` |
| **多图融合** | `image: [url1, url2, ...]` | `"将多张图合成一张"` |
| **社交封面** | `aspect_ratio: "16:9"` | `"简约科技风个人主页封面"` |

---

## 五、关键说明

1. **图片链接有效期**：返回的 URL 为临时链接，**2小时后过期**，请及时下载保存。
2. **失败不扣费**：生成失败时不会扣除额度。
3. **图生图 `image` 参数**：支持传入 **图片 URL** 或 **Base64 字符串**，可混合使用，最多 16 张，单张不超过 10MB。
4. **支持的图片格式**：JPEG、PNG、WEBP、JPG。
5. **支持的比例**：`auto`、`1:1`、`9:16`、`16:9`、`4:3`、`3:4`。
6. **Prompt 建议**：描述越详细，生成效果越好；支持中英文混合 prompt。
