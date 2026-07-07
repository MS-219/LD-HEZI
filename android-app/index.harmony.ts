/**
 * 鸿蒙（HarmonyOS NEXT / React Native for OpenHarmony）入口。
 *
 * RNOH 宿主工程（ArkTS）通过 bundle 加载本文件注册的组件：
 *   RNApp / RNSurface 的 appKey 填 'QuanQiuYunZhiSuan'。
 *
 * 业务代码（src/）为纯 React Native 实现，未使用 Expo 专有 API；
 * expo-clipboard / expo-image-picker 在鸿蒙环境缺失时已在
 * src/native/ 封装层自动降级，不会导致崩溃。
 *
 * 详细接入步骤见 HARMONYOS.md。
 */
import { AppRegistry } from 'react-native';
import AppRoot from './src/AppRoot';

AppRegistry.registerComponent('QuanQiuYunZhiSuan', () => AppRoot);
