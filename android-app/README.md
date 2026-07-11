# 全球云智算 App（安卓 + 鸿蒙）

从微信小程序完整迁移的移动端 App，使用 Expo + React Native 实现。
业务代码（`src/`）为纯 React Native，无 react-navigation、无 Expo 专有运行时依赖，
同一套代码可运行在安卓与鸿蒙（HarmonyOS）上，鸿蒙接入方式见 [HARMONYOS.md](./HARMONYOS.md)。

## 运行

```bash
npm install
npm run android
```

默认 API 地址是 `https://hz.shandongliandong.com`。本地联调可创建 `.env`：

```bash
EXPO_PUBLIC_API_BASE=http://你的后端地址:8080
```

## 正式包

安卓正式包已输出在 `release/`：

- `release/LD-HeZi-1.0.0-release.apk`
- `release/LD-HeZi-1.0.0-release.aab`

鸿蒙 NEXT 使用 RNOH 宿主工程加载 JS bundle：

```bash
npm run bundle:harmony
```

产物会输出到 `harmony-bundle/`，再放入 DevEco Studio 的 ArkTS/RNOH 工程打包
`.hap` / `.app`。完整 RNOH 平台环境可改用 `npm run bundle:harmony:rnoh`。
详细步骤见 [HARMONYOS.md](./HARMONYOS.md)。

## 功能覆盖（与小程序对齐，AI 创作相关功能按需求移除）

底部 Tab（3 个，小程序原“创作”Tab 为 AI 功能已移除）：

- **首页**：Banner 轮播、昨日/累计收益、节点统计（含伙伴设备入口）、平台公告
- **设备**：设备列表、在线/离线筛选、搜索、绑定码添加设备（查询→确认→绑定）、
  编辑备注、解绑、复制设备号
- **我的**：自动登录、头像/昵称修改、钱包卡片（余额/累计收益/算力值）、
  设备统计、功能菜单、退出登录

栈内页面（19 个）：

| 页面 | 对应小程序页 |
| --- | --- |
| 公告详情 | notice-detail |
| 设备详情（含近7日收益趋势图） | device-detail |
| 完善资料 | complete-profile |
| 申请提现（银行卡/支付宝/微信收款码） | withdraw |
| 提现记录 | withdraw-record / withdraw-list（合并） |
| 收益明细（明细/按日/按月，设备收益/分润收益） | earnings-detail |
| 收款信息设置 | edit-payment |
| 邀请好友（邀请码/分享/等级进度/绑定邀请人） | invite |
| 伙伴设备（团队成员列表） | partner-devices |
| 成员设备 | member-devices |
| 全部伙伴设备 | all-partner-devices |
| 伙伴设备详情 | partner-device-detail |
| 帮助中心 | help |
| 意见反馈（含图片上传） | feedback |
| 兑换设备商城 | exchange |
| 兑换详情（等级价格/数量/地址/下单） | exchange-detail |
| 兑换订单（状态筛选/分页） | exchange-orders |
| 订单详情（物流轨迹/确认收货） | exchange-order-detail |
| 收货地址管理 | address-manage |

未迁移：`ai-create`、`creation`、`creation-history`（AI 相关，按需求排除）、
`logs`（微信模板残留）、`webview`（无业务引用）。

## 登录方式

App 使用手机号 + 阿里云短信验证码登录：

- `POST /api/user/sms/send` 发送验证码
- `POST /api/user/sms/login` 校验验证码并登录/注册
- 登录请求携带稳定 `deviceId`，旧版匿名设备账号首次短信登录时会自动绑定手机号，
  保留原有设备、收益、邀请关系和订单数据
- 支持邀请码注册与全局 401 登录态失效处理

阿里云 AccessKey 仅配置在后端环境变量中，App 不保存任何短信服务密钥。

## 目录结构

```
App.tsx               Expo（安卓）入口
index.harmony.ts      鸿蒙（RNOH）入口
src/
  AppRoot.tsx         根组件：底部 Tab + 导航容器
  navigation.tsx      轻量栈导航（纯 JS，支持实体返回键）
  session.tsx         登录会话管理
  api.ts              统一请求 / 上传 / token 过期处理
  config.ts           API 地址等全局配置
  platform.ts         Android / Harmony 平台识别与设备 ID 前缀
  storage.ts          AsyncStorage 封装
  theme.ts            主题色
  components/         公共组件（NavBar、Card、InputDialog 等）
  native/             平台能力封装（剪贴板、选图，鸿蒙自动降级）
  utils/format.ts     时间/金额/卡号等格式化
  screens/            22 个页面
```
