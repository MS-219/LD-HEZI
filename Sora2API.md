# [OpenAI 视频接口文档（Sora2 统一视频格式）](https://api.lingyaai.cn/doc/#/coding/sora-2-unify?id=openai-%e8%a7%86%e9%a2%91%e6%8e%a5%e5%8f%a3%e6%96%87%e6%a1%a3%ef%bc%88sora2-%e7%bb%9f%e4%b8%80%e8%a7%86%e9%a2%91%e6%a0%bc%e5%bc%8f%ef%bc%89)

调用 OpenAI 视频生成接口 以生成视频内容，支持模型 Sora（包括 ），也支持兼容的可灵、即梦、Vidu 等实现 OpenAI 视频格式的模型。`sora-2-all`

---

## [一、生成视频](https://api.lingyaai.cn/doc/#/coding/sora-2-unify?id=%e4%b8%80%e3%80%81%e7%94%9f%e6%88%90%e8%a7%86%e9%a2%91)

### [API 端点](https://api.lingyaai.cn/doc/#/coding/sora-2-unify?id=api-%e7%ab%af%e7%82%b9)

```
POST /v1/videos复制到剪贴板错误复制
```

### [请求头](https://api.lingyaai.cn/doc/#/coding/sora-2-unify?id=%e8%af%b7%e6%b1%82%e5%a4%b4)

| 参数     | 类型 | 必填 | 描述                             |
| -------- | ---- | ---- | -------------------------------- |
| 授权     | 弦   | 是   | 用户认证令牌（Bearer： sk-xxxx） |
| 内容类型 | 弦   | 是   | application/json                 |

---

### [请求参数](https://api.lingyaai.cn/doc/#/coding/sora-2-unify?id=%e8%af%b7%e6%b1%82%e5%8f%82%e6%95%b0)

| 参数         | 类型 | 必填 | 描述                                                       |
| ------------ | ---- | ---- | ---------------------------------------------------------- |
| 模型         | 弦   | 是   | 视频生成模型，如 `sora-2-all`                            |
| 提示         | 弦   | 是   | 视频内容文本提示词                                         |
| 图片         | 数组 | 否   | 图片参考输入数组，支持 URL 或 Base64，仅支持一张图作为首帧 |
| 持续时间     | 整数 | 否   | 视频时长（秒），目前固定为 `10`                          |
| aspect_ratio | 弦   | 否   | 视频宽高比，支持 （横屏）、（竖屏）`16:9``9:16`         |

---

### [请求示例](https://api.lingyaai.cn/doc/#/coding/sora-2-unify?id=%e8%af%b7%e6%b1%82%e7%a4%ba%e4%be%8b)

**纯文本生成：**

```
curl --location --request POST 'https://api.lingyaai.cn/v1/videos' \
  -H "Authorization: Bearer sk-xxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "sora-2-all",
    "prompt": "A calico cat playing a piano on stage",
    "duration": 10,
    "aspect_ratio": "16:9"
  }'复制到剪贴板错误复制
```

**图生视频（首帧参考）：**

```
curl --location --request POST 'https://api.lingyaai.cn/v1/videos' \
  -H "Authorization: Bearer sk-xxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "sora-2-all",
    "prompt": "基于这张图片生成视频，画面中的人物开始走动",
    "images": ["https://example.com/image.jpg"],
    "duration": 10,
    "aspect_ratio": "9:16"
  }'复制到剪贴板错误复制
```

---

### [响应格式](https://api.lingyaai.cn/doc/#/coding/sora-2-unify?id=%e5%93%8d%e5%ba%94%e6%a0%bc%e5%bc%8f)

#### [200 - 提交成功](https://api.lingyaai.cn/doc/#/coding/sora-2-unify?id=_200-%e6%8f%90%e4%ba%a4%e6%88%90%e5%8a%9f)

```
{
    "id": "cgt-20260124220030-9s4dc"
}Copy to clipboardErrorCopied
```

#### [响应字段说明](https://api.lingyaai.cn/doc/#/coding/sora-2-unify?id=%e5%93%8d%e5%ba%94%e5%ad%97%e6%ae%b5%e8%af%b4%e6%98%8e)

| 字段 | 类型   | 描述                             |
| ---- | ------ | -------------------------------- |
| id   | string | 视频任务ID，用于后续查询任务状态 |

---

## [二、查询视频任务](https://api.lingyaai.cn/doc/#/coding/sora-2-unify?id=%e4%ba%8c%e3%80%81%e6%9f%a5%e8%af%a2%e8%a7%86%e9%a2%91%e4%bb%bb%e5%8a%a1)

根据任务ID查询视频生成状态与结果。

### [API 端点](https://api.lingyaai.cn/doc/#/coding/sora-2-unify?id=api-%e7%ab%af%e7%82%b9-1)

```
GET /v1/videos/{video_id}Copy to clipboardErrorCopied
```

### [路径参数](https://api.lingyaai.cn/doc/#/coding/sora-2-unify?id=%e8%b7%af%e5%be%84%e5%8f%82%e6%95%b0)

| 参数     | 类型   | 必填 | 描述           |
| -------- | ------ | ---- | -------------- |
| video_id | string | 是   | 视频任务标识符 |

---

### [请求示例](https://api.lingyaai.cn/doc/#/coding/sora-2-unify?id=%e8%af%b7%e6%b1%82%e7%a4%ba%e4%be%8b-1)

```
curl 'https://api.lingyaai.cn/v1/videos/cgt-20260124220030-9s4dc' \
  -H "Authorization: Bearer sk-xxxx"Copy to clipboardErrorCopied
```

---

### [响应格式](https://api.lingyaai.cn/doc/#/coding/sora-2-unify?id=%e5%93%8d%e5%ba%94%e6%a0%bc%e5%bc%8f-1)

#### [200 - 成功响应示例](https://api.lingyaai.cn/doc/#/coding/sora-2-unify?id=_200-%e6%88%90%e5%8a%9f%e5%93%8d%e5%ba%94%e7%a4%ba%e4%be%8b)

```
{
  "id": "cgt-20260124220030-9s4dc",
  "object": "video",
  "model": "sora-2-all",
  "status": "completed",
  "progress": 100,
  "created_at": 1712697600,
  "completed_at": 1712698000,
  "expires_at": 1712784400,
  "size": "1024x1808",
  "seconds": "10",
  "quality": "standard",
  "remixed_from_video_id": null,
  "error": null,
  "video_url": "https://example.com/video.mp4"
}Copy to clipboardErrorCopied
```

#### [字段说明](https://api.lingyaai.cn/doc/#/coding/sora-2-unify?id=%e5%ad%97%e6%ae%b5%e8%af%b4%e6%98%8e)

| 字段                  | 类型    | 描述                                                                                        |
| --------------------- | ------- | ------------------------------------------------------------------------------------------- |
| id                    | string  | 视频任务唯一标识符                                                                          |
| object                | string  | 固定为 `"video"`                                                                          |
| model                 | string  | 使用的模型名称                                                                              |
| status                | string  | 当前任务状态（ 排队中、 处理中、 完成、 失败）`queued``processing``completed``failed` |
| progress              | integer | 完成百分比（0-100）                                                                         |
| created_at            | integer | 创建时间戳                                                                                  |
| completed_at          | integer | 完成时间戳                                                                                  |
| expires_at            | integer | 下载资源过期时间戳                                                                          |
| size                  | string  | 视频分辨率                                                                                  |
| seconds               | string  | 视频长度（秒）                                                                              |
| quality               | string  | 视频质量                                                                                    |
| remixed_from_video_id | string  | 若为混音视频，显示源视频ID                                                                  |
| error                 | object  | 错误信息（仅在失败时）                                                                      |
| video_url             | string  | 视频下载链接（仅完成时有值）                                                                |

---

## [三、调用时长与生成耗时参考](https://api.lingyaai.cn/doc/#/coding/sora-2-unify?id=%e4%b8%89%e3%80%81%e8%b0%83%e7%94%a8%e6%97%b6%e9%95%bf%e4%b8%8e%e7%94%9f%e6%88%90%e8%80%97%e6%97%b6%e5%8f%82%e8%80%83)

| 时长（秒） | 预计生成时间 |
| ---------- | ------------ |
| 10         | 约 1–3 分钟 |

---

## [四、官方审查说明](https://api.lingyaai.cn/doc/#/coding/sora-2-unify?id=%e5%9b%9b%e3%80%81%e5%ae%98%e6%96%b9%e5%ae%a1%e6%9f%a5%e8%af%b4%e6%98%8e)

视频生成将经过至少三个审查阶段：

1. **输入图片审查** ：检测是否包含真人或逼真的人像。
2. **提示词内容审查** ：过滤暴力、色情、版权、或涉及活着的名人等违规内容。
3. **生成结果审查** ：若结果不符合规范，可能在生成过程（接近 90%）时失败。

---

## [五、错误响应](https://api.lingyaai.cn/doc/#/coding/sora-2-unify?id=%e4%ba%94%e3%80%81%e9%94%99%e8%af%af%e5%93%8d%e5%ba%94)

| 状态码 | 类型                  | 示例与说明               |
| ------ | --------------------- | ------------------------ |
| 400    | invalid_request_error | 参数错误，如缺少必要字段 |
| 401    | authentication_error  | 未授权，API密钥无效      |
| 403    | permission_error      | 无权限执行该操作         |
| 429    | rate_limit_error      | 达到限流阈值，请稍后重试 |
| 500    | server_error          | 服务器内部错误           |

示例：

```
{
  "error": {
    "message": "Invalid request parameters",
    "type": "invalid_request_error",
    "code": "invalid_parameter"
  }
}复制到剪贴板错误复制
```

---

✅ **总结**

| 功能     | 端点                      | 方法 |
| -------- | ------------------------- | ---- |
| 生成视频 | `/v1/videos`            | 发布 |
| 查询任务 | `/v1/videos/{video_id}` | 获取 |

此接口统一了视频生成的调用方式，使用 JSON 格式请求。用户可通过提供提示词、参考图像（首帧）与宽高比参数生成视频，并通过任务ID查询生成状态与下载链接。
