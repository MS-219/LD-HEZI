/**
 * 图片选择封装（对应 wx.chooseImage / wx.chooseMedia）。
 *
 * 安卓（Expo）走 expo-image-picker；鸿蒙 RNOH 环境没有该模块时返回 null，
 * 调用方自行降级（隐藏上传入口或提示暂不支持）。
 */
let ImagePicker: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ImagePicker = require('expo-image-picker');
} catch {
  ImagePicker = null;
}

export const imagePickerAvailable = !!ImagePicker;

/**
 * 从相册选择图片，返回本地 uri 列表；用户取消或平台不支持返回空数组。
 */
export async function pickImages(count = 1): Promise<string[]> {
  if (!ImagePicker) return [];
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return [];
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: count > 1,
    selectionLimit: count,
    quality: 0.8,
  });
  if (result.canceled) return [];
  return (result.assets || []).map((a: any) => a.uri).slice(0, count);
}
