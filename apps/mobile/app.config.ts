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
      ...(baseConfig.plugins ?? []),
      admobPlugin,
      ...(isSentryConfigured ? [sentryPlugin] : []),
    ],
  };
};
