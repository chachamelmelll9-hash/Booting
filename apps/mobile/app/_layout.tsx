import 'react-native-reanimated';

import { isAdMobEnabled } from '@features/ads';
import { AnalyticsProvider } from '@features/analytics';
import { useAuth } from '@features/auth';
import { useLanguageStore } from '@features/settings';
import { i18n } from '@chachamelmelll9-hash-service/i18n';
import { initI18nMobile } from '@chachamelmelll9-hash-service/i18n/config/mobile';
import { initializeKakaoSDK } from '@react-native-kakao/core';
import {
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native';
import { AuthColors } from '@shared/config/colors';
import { initSentry, isSentryEnabled, Sentry } from '@shared/lib/sentry';
import { queryClient } from '@shared/query';
import { ToastProvider } from '@shared/ui';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet,View } from 'react-native';
import mobileAds from 'react-native-google-mobile-ads';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export {
  // Catch any errors thrown by the Layout component with a user-friendly fallback.
  ErrorBoundary,
} from '@shared/ui';

// Initialize Sentry crash reporting as early as possible (no-op without DSN).
initSentry();

export const unstable_settings = {
  // Use index to decide whether to go to auth or main tabs.
  initialRouteName: 'index',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // Initialize Kakao SDK
  useEffect(() => {
    const kakaoNativeKey = process.env.EXPO_PUBLIC_KAKAO_NATIVE_KEY;
    if (kakaoNativeKey) {
      initializeKakaoSDK(kakaoNativeKey);
    }
  }, []);

  // Initialize AdMob SDK
  useEffect(() => {
    if (isAdMobEnabled) {
      mobileAds()
        .initialize()
        .then((adapterStatuses) => {
          console.log('AdMob initialized:', adapterStatuses);
        })
        .catch((error) => {
          console.error('AdMob initialization failed:', error);
        });
    }
  }, []);

  // Initialize i18n — when no language has been chosen yet (null),
  // initI18nMobile falls back to the device locale.
  useEffect(() => {
    const initializeI18n = async () => {
      const savedLanguage = useLanguageStore.getState().language;
      await initI18nMobile(savedLanguage ?? undefined);
    };

    initializeI18n();
  }, []);

  // Subscribe to language changes
  useEffect(() => {
    let previousLanguage = useLanguageStore.getState().language;

    const unsubscribe = useLanguageStore.subscribe((state) => {
      if (state.language && state.language !== previousLanguage) {
        i18n.changeLanguage(state.language);
        previousLanguage = state.language;
      }
    });

    return unsubscribe;
  }, []);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

export default isSentryEnabled ? Sentry.wrap(RootLayout) : RootLayout;

function RootLayoutNav() {
  const { isAuthenticated, isInitialized } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const previousAuth = useRef<boolean | null>(null);

  // 로그인 상태가 바뀌면 서버 캐시를 통째로 비운다.
  //
  // 비우지 않으면 다음 사용자가 이전 사용자의 캐시를 그대로 본다 — 이 앱에서는
  // 남의 부모님 프로필·인증 상태·대화 목록이 잠깐이라도 보인다는 뜻이라
  // 단순한 신선도 문제가 아니라 프라이버시 문제다.
  useEffect(() => {
    if (previousAuth.current !== null && previousAuth.current !== isAuthenticated) {
      queryClient.clear();
    }
    previousAuth.current = isAuthenticated;
  }, [isAuthenticated]);
  // 루트 네비게이터가 마운트되기 전에 router.replace 를 호출하면 앱이 렌더 단계에서 죽는다:
  //   "Attempted to navigate before mounting the Root Layout component."
  // 정적 검사(lint/tsc/build)로는 잡히지 않는 런타임 계약이라 실기기 기동으로만 드러난다.
  const rootNavigationState = useRootNavigationState();

  useEffect(() => {
    if (!rootNavigationState?.key) return;
    if (!isInitialized) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inIndex = segments.length < 1 || segments[0] === 'index';

    if (!isAuthenticated && !inAuthGroup && !inIndex) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)/home');
    } else if (isAuthenticated && inIndex) {
      router.replace('/(tabs)/home');
    } else if (!isAuthenticated && inIndex) {
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated, isInitialized, segments, router, rootNavigationState?.key]);

  // 초기화 중에도 navigator 는 반드시 렌더한다 (조기 반환 금지).
  return (
    <SafeAreaProvider>
      <KeyboardProvider>
        <AnalyticsProvider>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider value={DefaultTheme}>
              <ToastProvider>
                <Stack>
                  <Stack.Screen name="index" options={{ headerShown: false }} />
                  <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  {/* 탭 밖의 흐름 — 등록 플로우와 전역 모달 3종 */}
                  <Stack.Screen name="(parent-setup)" options={{ headerShown: false }} />
                  <Stack.Screen
                    name="profile/[id]"
                    options={{ title: '프로필', presentation: 'modal' }}
                  />
                  <Stack.Screen
                    name="matched/[id]"
                    options={{ title: '대화 연결', presentation: 'modal' }}
                  />
                  <Stack.Screen
                    name="report/[id]"
                    options={{ title: '신고하기', presentation: 'modal' }}
                  />
                </Stack>
                {!isInitialized && (
                  <View style={layoutStyles.loadingOverlay}>
                    <ActivityIndicator size="large" color={AuthColors.primary} />
                  </View>
                )}
              </ToastProvider>
            </ThemeProvider>
          </QueryClientProvider>
        </AnalyticsProvider>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}

const layoutStyles = StyleSheet.create({
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: AuthColors.background,
  },
});
