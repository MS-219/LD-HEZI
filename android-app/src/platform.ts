import { Platform } from 'react-native';

type AppPlatform = 'android' | 'harmony' | 'ios' | 'web' | 'native';

const rawOS = Platform.OS as string;

export const appPlatform: AppPlatform =
  rawOS === 'harmony' || rawOS === 'android' || rawOS === 'ios' || rawOS === 'web'
    ? rawOS
    : 'native';

export const isHarmony = appPlatform === 'harmony';

export function getDeviceIdPrefix(): string {
  return isHarmony ? 'harmony' : appPlatform;
}
