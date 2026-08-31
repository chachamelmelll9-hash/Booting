import { Platform } from 'react-native';
import { TestIds } from 'react-native-google-mobile-ads';

type AdUnitType = 'banner' | 'nativeAd';

const AD_UNIT_IDS = {
  ios: {
    banner: process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER_ID ?? '',
    nativeAd: process.env.EXPO_PUBLIC_ADMOB_IOS_NATIVE_ID ?? '',
  },
  android: {
    banner: process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID ?? '',
    nativeAd: process.env.EXPO_PUBLIC_ADMOB_ANDROID_NATIVE_ID ?? '',
  },
} as const;

/**
 * Returns the ad unit ID for the given type.
 * In __DEV__ mode, always returns Google's test IDs to avoid policy violations.
 */
export function getAdUnitId(type: AdUnitType): string {
  if (__DEV__) {
    return type === 'banner' ? TestIds.ADAPTIVE_BANNER : TestIds.NATIVE;
  }

  const platform = Platform.OS as 'ios' | 'android';
  return AD_UNIT_IDS[platform][type];
}

/** Whether AdMob is configured (at least one app ID is set). */
export const isAdMobEnabled =
  !!process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID ||
  !!process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID;

export const AD_SETTINGS = {
  loadTimeout: 10_000,
  maxRetries: 3,
  retryDelay: 2_000,
} as const;
