# 鸿蒙（HarmonyOS）适配说明

本 App 的业务代码（`src/` 目录）是**纯 React Native** 实现：不依赖 react-navigation、
不依赖 Expo 专有运行时 API，导航、弹窗、图表全部为自研 JS 实现。因此同一套代码
可以同时运行在安卓与鸿蒙上。

## 两条适配路径

### 1. HarmonyOS 2.x ~ 4.x（含大部分存量华为手机）

这些版本兼容安卓 APK，**直接安装安卓包即可**，无需任何额外工作：

```bash
# 构建 APK（需要 EAS 或本地 Android SDK）
npx expo prebuild -p android
cd android && ./gradlew assembleRelease
# 产物 android/app/build/outputs/apk/release/app-release.apk 可直接装到华为手机
```

### 2. HarmonyOS NEXT / 5.0+（纯血鸿蒙，不再兼容 APK）

使用华为官方支持的 **React Native for OpenHarmony（RNOH）** 运行同一套 JS 代码：

1. 用 DevEco Studio 创建 ArkTS 工程，按 RNOH 文档接入
   `@rnoh/react-native-openharmony`（华为官方仓库：
   https://gitee.com/openharmony-sig/ohos_react_native ）。
2. 在 RN 侧构建鸿蒙 bundle（入口为本目录的 `index.harmony.ts`）：
   ```bash
   npx react-native bundle \
     --platform harmony \
     --entry-file index.harmony.ts \
     --bundle-output ./harmony-bundle/bundle.harmony.js \
     --assets-dest ./harmony-bundle/assets
   ```
3. ArkTS 侧加载 bundle，`appKey` 填 `QuanQiuYunZhiSuan`（与 `index.harmony.ts` 中
   `AppRegistry.registerComponent` 的名字一致）。
4. AsyncStorage 使用 RNOH 社区版
   `@react-native-oh-tpl/async-storage`（API 与安卓版完全一致，无需改业务代码）。

## 平台差异与降级策略

| 能力 | 安卓（Expo） | 鸿蒙 NEXT（RNOH） |
| --- | --- | --- |
| 存储 | @react-native-async-storage | @react-native-oh-tpl/async-storage（同 API） |
| 剪贴板 | expo-clipboard | 自动降级：弹窗展示内容供手动复制（`src/native/clipboard.ts`） |
| 选图/上传 | expo-image-picker | 自动降级：提示“当前平台暂不支持”，其余功能不受影响（`src/native/imagePicker.ts`） |
| 分享邀请 | RN `Share` API | RNOH 已支持；异常时降级为复制链接（`InviteScreen`） |
| 返回键 | `BackHandler` | RNOH 已支持（对应鸿蒙侧滑返回） |
| 状态栏 | RN `StatusBar` | RNOH 已支持 |

若要在鸿蒙上补齐剪贴板/选图能力，可在 `src/native/` 两个封装文件里接入鸿蒙原生
TurboModule（`@ohos.pasteboard`、`@ohos.file.picker`），业务代码无需改动。

## 判断当前平台

RNOH 下 `Platform.OS === 'harmony'`，需要平台特判时统一使用该值。
