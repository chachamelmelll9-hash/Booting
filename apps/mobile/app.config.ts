import type { ConfigContext, ExpoConfig } from "expo/config";

const isProduction = process.env.PRODUCTION_BUILD === "true";

// AdMob App IDs — the plugin is always included because react-native-google-mobile-ads
// is autolinked and the GMA SDK crashes on Android startup without an APPLICATION_ID.
// When AdMob is not configured, Google's inert sample IDs are used and app measurement
// is delayed so no ad/measurement traffic occurs.
const ADMOB_TEST_ANDROID_APP_ID = "ca-app-pub-3940256099942544~3347511713";
const ADMOB_TEST_IOS_APP_ID = "ca-app-pub-3940256099942544~1458002511";

const isAdMobConfigured = !!(
  process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID ||
  process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID
);

const admobAndroidAppId =
  process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID || ADMOB_TEST_ANDROID_APP_ID;
const admobIosAppId =
  process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID || ADMOB_TEST_IOS_APP_ID;

const admobPlugin: [string, Record<string, unknown>] = [
  "react-native-google-mobile-ads",
  {
    androidAppId: admobAndroidAppId,
    iosAppId: admobIosAppId,
    delayAppMeasurementInit: !isAdMobConfigured,
    userTrackingUsageDescription:
      "This identifier will be used to deliver personalized ads to you.",
  },
];

// Sentry crash reporting — opt-in via EXPO_PUBLIC_SENTRY_DSN (same pattern as AdMob/PostHog).
const isSentryConfigured = !!process.env.EXPO_PUBLIC_SENTRY_DSN;

const sentryPlugin: [string, Record<string, unknown>] = [
  "@sentry/react-native/expo",
  {
    // Source map upload is configured via SENTRY_AUTH_TOKEN / SENTRY_ORG / SENTRY_PROJECT
    // environment variables at build time.
  },
];

/**
 * 카카오 네이티브 앱 키를 app.json 이 아니라 env 에서 주입한다.
 *
 * app.json 은 커밋되지만 `.env.*` 는 gitignore 다. 네이티브 앱 키는 APK 안에
 * 어차피 들어가는 클라이언트 식별자라 비밀은 아니지만, 저장소에 박아두면
 * 앱을 새로 만들 때마다 남의 키가 따라다닌다. 플레이스홀더는 그대로 두고
 * 빌드 시점에 갈아끼운다 — 키가 없으면 플레이스홀더가 남고, 그 상태에서는
 * `initializeKakaoSDK` 도 호출되지 않아 카카오 기능이 조용히 꺼진다.
 */
const KAKAO_KEY_PLACEHOLDER = "__KAKAO_NATIVE_APP_KEY__";

function withKakaoKey(plugins: ExpoConfig["plugins"]): ExpoConfig["plugins"] {
  const key = process.env.EXPO_PUBLIC_KAKAO_NATIVE_KEY;
  if (!key) return plugins;

  return (plugins ?? []).map((plugin) => {
    if (!Array.isArray(plugin) || plugin[0] !== "@react-native-kakao/core") {
      return plugin;
    }
    const options = (plugin[1] ?? {}) as Record<string, unknown>;
    if (options.nativeAppKey !== KAKAO_KEY_PLACEHOLDER) return plugin;
    return [plugin[0], { ...options, nativeAppKey: key }];
  });
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const baseConfig = config as ExpoConfig;

  return {
    ...baseConfig,
    ios: {
      ...baseConfig.ios,
      ...(!isProduction && {
        infoPlist: {
          ...baseConfig.ios?.infoPlist,
          NSAppTransportSecurity: {
            NSAllowsArbitraryLoads: true,
          },
        },
      }),
    },
    android: {
      ...baseConfig.android,
      permissions: [
        ...(baseConfig.android?.permissions ?? []),
        // Only declare the advertising ID permission when AdMob is actually used,
        // so Play Console Data Safety declarations stay accurate.
        ...(isAdMobConfigured
          ? ["com.google.android.gms.permission.AD_ID"]
          : []),
      ],
      ...(!isAdMobConfigured && {
        // The GMA SDK's own manifest merges AD_ID in — strip it for ad-free builds.
        blockedPermissions: [
          ...(baseConfig.android?.blockedPermissions ?? []),
          "com.google.android.gms.permission.AD_ID",
        ],
      }),
    },
    plugins: [
      ...(withKakaoKey(baseConfig.plugins) ?? []),
      admobPlugin,
      ...(isSentryConfigured ? [sentryPlugin] : []),
    ],
  };
};
