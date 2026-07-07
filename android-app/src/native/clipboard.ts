/**
 * 剪贴板封装。
 *
 * 安卓（Expo）走 expo-clipboard；鸿蒙 RNOH 环境没有该模块时，
 * 退化为弹窗展示内容供用户手动复制，保证功能不崩。
 */
import { Alert } from 'react-native';

let ExpoClipboard: { setStringAsync(text: string): Promise<boolean> } | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ExpoClipboard = require('expo-clipboard');
} catch {
  ExpoClipboard = null;
}

export async function copyText(text: string, tip = '已复制'): Promise<void> {
  if (!text) return;
  if (ExpoClipboard) {
    await ExpoClipboard.setStringAsync(text);
    Alert.alert(tip);
    return;
  }
  Alert.alert('复制内容', text);
}
