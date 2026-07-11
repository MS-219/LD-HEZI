# LD-HeZi 二开项目

本项目从 `/Users/pings/Documents/XMKF/LD-AI` 拆出，作为独立本地二开工程使用。

## 目录结构

- `backend/`: Spring Boot 3.2 + Java 21 后端服务，MyBatis-Plus + MySQL。
- `admin/`: Vue 3 + Vite 运营后台。
- `SL-admin/`: Vue 3 + Vite 算力调度/设备运营后台。
- `miniprogram/`: 微信小程序端。
- `device_agent/`: 设备侧 Agent、安装脚本、代理/隧道控制脚本。
- `edge-agent/`: Python 边缘 AI 任务 Agent。
- `deploy/`, `docker-compose.yml`, `deploy*.sh`: 部署配置和脚本。

## 本地启动

后端：

```bash
cd backend
mvn spring-boot:run
```

运营后台：

```bash
cd admin
npm install
npm run dev
```

算力调度后台：

```bash
cd SL-admin
npm install
npm run dev
```

微信小程序：

```bash
cd miniprogram
npm install
```

然后用微信开发者工具打开 `miniprogram/`。

## App 短信验证码登录

Android / Harmony App 使用阿里云短信服务完成手机号验证码登录。后端启动前配置：

```bash
export ALIBABA_CLOUD_ACCESS_KEY_ID=你的AccessKeyId
export ALIBABA_CLOUD_ACCESS_KEY_SECRET=你的AccessKeySecret
export ALIYUN_SMS_SIGN_NAME='成都联动云芯数字科技'
export ALIYUN_SMS_TEMPLATE_CODE='SMS_336585113'
```

短信模板必须包含 `${code}` 变量。AccessKey 只能配置在后端服务器，禁止写入 App。
已有数据库升级前先执行 `backend/sql/add_app_user_phone_unique.sql` 中的重复手机号检查及唯一索引变更。

## 二开前优先处理

1. 替换品牌文案：当前仍有“全球云智算”“LD-AI”等母版名称。
2. 替换域名：当前仍引用 `juxinsuanli.cn`、`api.juxinsuanli.cn`、`ld.juxinsuanli.cn`。
3. 迁移密钥：`backend/src/main/resources/application.yml` 中包含微信和 AI 服务配置，二开时应改为环境变量。
4. 初始化数据库：基础 SQL 在 `backend/sql/`，主库名默认为 `juxinsuanli`。
5. 检查远程执行能力：`device_agent/` 与 `edge-agent/` 支持命令/代码下发，生产化前需要严格鉴权、签名、白名单和审计。

## 复制说明

本地二开目录没有复制母版的 `.git`、`node_modules`、`dist`、`target`、`.DS_Store`、`__pycache__` 等生成物。
