/**
 * 全球云智算 App 全局配置（接口地址与小程序 miniprogram/config.ts 保持一致）
 */

export const API_BASE = process.env.EXPO_PUBLIC_API_BASE || 'https://hz.shandongliandong.com';

export const UPLOAD_URL = `${API_BASE}/api/upload/image`;

export const VERSION = '1.0.0';

export const APP_NAME = '全球云智算';

export const config = {
  requestTimeout: 10000,
  pageSize: 10,
  noticeLimit: 5,
};
