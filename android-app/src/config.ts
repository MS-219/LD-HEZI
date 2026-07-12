import * as Application from 'expo-application';

/**
 * 全球云智算 App 全局配置（接口地址与小程序 miniprogram/config.ts 保持一致）
 */

export const API_BASE = process.env.EXPO_PUBLIC_API_BASE || 'https://hz.shandongliandong.com';

export const UPLOAD_URL = `${API_BASE}/api/upload/image`;

// 始终读取 APK 原生清单中的 versionName/versionCode，避免发布后因 JS 常量未同步而循环强制更新。
export const VERSION = Application.nativeApplicationVersion || '0.0.0';
export const VERSION_CODE = Number.parseInt(Application.nativeBuildVersion || '0', 10) || 0;

export const APP_NAME = '全球云智算';

export const config = {
  requestTimeout: 10000,
  pageSize: 10,
  noticeLimit: 5,
};
