/**
 * 轻量存储封装。
 *
 * 统一走 AsyncStorage（安卓 / 鸿蒙 RNOH 均有官方实现），
 * 对外提供与小程序 wx.getStorageSync 类似的 get/set/remove 语义。
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function getItem(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function setItem(key: string, value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, value);
  } catch {
    // 存储失败不阻塞业务
  }
}

export async function removeItem(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export async function getJSON<T>(key: string): Promise<T | null> {
  const raw = await getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function setJSON(key: string, value: unknown): Promise<void> {
  await setItem(key, JSON.stringify(value));
}
