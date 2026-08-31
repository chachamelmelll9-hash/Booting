import { useTranslation } from '@chachamelmelll9-hash-service/i18n';
import {
  BRIDGE_PROTOCOL_VERSION,
  type MobileToWebViewMessage,
  type WebViewToMobileMessage,
} from '@chachamelmelll9-hash-service/webview-bridge';
import { refreshApi } from '@features/auth/api';
import {
  getAccessToken,
  getRefreshToken,
  saveTokens,
} from '@features/auth/lib/tokenStorage';
import { useAuthStore } from '@features/auth/model/useAuthStore';
import { useLanguageStore } from '@features/settings';
import * as Linking from 'expo-linking';
import React, { useCallback, useEffect,useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet,Text, View } from 'react-native';
import {
  WebView,
  type WebViewMessageEvent,
  type WebViewNavigation,
} from 'react-native-webview';

const WEBVIEW_BASE_URL =
  process.env.EXPO_PUBLIC_WEBVIEW_URL || 'http://10.0.2.2:4200';

// e.g. "https://app.example.com" from "https://app.example.com/path"
const WEBVIEW_ORIGIN =
  WEBVIEW_BASE_URL.match(/^https?:\/\/[^/]+/)?.[0] ?? WEBVIEW_BASE_URL;

/** WEBVIEW_READY 브리지 메시지를 기다리는 최대 시간 */
const WEBVIEW_READY_TIMEOUT_MS = 15_000;

interface WebViewEntryScreenProps {
  path: string;
  title?: string;
}

async function handle401(
  code: string
): Promise<{ retry: boolean; newToken?: string }> {
  if (code === 'token_expired') {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
      await useAuthStore.getState().clearAuth();
      return { retry: false };
    }

    const result = await refreshApi(refreshToken);
    if (!result.success) {
      await useAuthStore.getState().clearAuth();
      return { retry: false };
    }

    await saveTokens({
      accessToken: result.data.accessToken,
      refreshToken: result.data.refreshToken,
      expiresAt: result.data.expiresAt,
    });

    return { retry: true, newToken: result.data.accessToken };
  }

  // token_revoked, token_invalid 등은 로그아웃
  await useAuthStore.getState().clearAuth();
  return { retry: false };
}

export function WebViewEntryScreen({ path }: WebViewEntryScreenProps) {
  const { t } = useTranslation(['common', 'auth']);
  const webViewRef = useRef<WebView>(null);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const language = useLanguageStore((s) => s.language);
  const [isWebViewReady, setIsWebViewReady] = useState(false);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // WebView로 메시지 전송
  const sendMessage = useCallback((message: MobileToWebViewMessage) => {
    if (webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify(message));
    }
  }, []);

  // WebView에 세션(accessToken) 전송
  const sendSessionToWebView = useCallback(async () => {
    const accessToken = await getAccessToken();
    sendMessage({
      type: 'SESSION',
      accessToken,
      language: language ?? undefined,
    });
  }, [sendMessage, language]);

  // WebView에서 온 메시지 처리
  const handleMessage = useCallback(
    async (event: WebViewMessageEvent) => {
      try {
        const message: WebViewToMobileMessage = JSON.parse(
          event.nativeEvent.data
        );

        switch (message.type) {
          case 'WEBVIEW_READY':
            if (message.protocolVersion > BRIDGE_PROTOCOL_VERSION) {
              console.warn(
                `WebView bridge protocol version ${message.protocolVersion} is newer than supported ${BRIDGE_PROTOCOL_VERSION}`
              );
            }
            // 웹뷰가 SESSION 수신 전까지 WEBVIEW_READY를 재전송하므로 멱등 유지
            setIsWebViewReady(true);
            sendSessionToWebView();
            break;

          case 'SIGN_OUT_REQUEST':
            clearAuth();
            break;

          case '401': {
            // WebView에서 401 발생 - Mobile이 처리
            const result = await handle401(message.code);

            if (result.retry && result.newToken) {
              // 갱신 성공: WebView에 새 토큰 전달
              sendMessage({
                type: 'TOKEN_UPDATE',
                accessToken: result.newToken,
              });
            } else {
              // 로그아웃: WebView에 로그아웃 명령
              sendMessage({ type: 'LOGOUT' });
            }
            break;
          }

          default:
            console.warn(
              'Unhandled WebView message type:',
              (message as { type?: string }).type
            );
            break;
        }
      } catch (error) {
        console.error('Failed to parse WebView message:', error);
      }
    },
    [sendSessionToWebView, sendMessage, clearAuth]
  );

  // WEBVIEW_BASE_URL 외부로의 내비게이션은 외부 브라우저로 열기
  const handleShouldStartLoadWithRequest = useCallback(
    (request: WebViewNavigation) => {
      const { url } = request;
      if (url.startsWith(WEBVIEW_ORIGIN) || url.startsWith('about:blank')) {
        return true;
      }
      Linking.openURL(url).catch((error) => {
        console.error('Failed to open external URL:', error);
      });
      return false;
    },
    []
  );

  const handleLoadError = useCallback(() => {
    setHasLoadError(true);
  }, []);

  const handleRetry = useCallback(() => {
    setHasLoadError(false);
    setIsWebViewReady(false);
    setReloadKey((key) => key + 1);
  }, []);

  // WEBVIEW_READY가 오지 않으면 무한 스피너 대신 재시도 UI 노출
  useEffect(() => {
    if (!isAuthenticated || isWebViewReady || hasLoadError) {
      return;
    }

    const timeout = setTimeout(() => {
      setHasLoadError(true);
    }, WEBVIEW_READY_TIMEOUT_MS);

    return () => clearTimeout(timeout);
  }, [isAuthenticated, isWebViewReady, hasLoadError, reloadKey]);

  // 인증 상태 또는 언어 변경 시 WebView에 알림
  useEffect(() => {
    if (isWebViewReady) {
      if (isAuthenticated) {
        sendSessionToWebView();
      } else {
        sendMessage({ type: 'LOGOUT' });
      }
    }
  }, [isAuthenticated, language, isWebViewReady, sendSessionToWebView, sendMessage]);

  if (!isAuthenticated) {
    // 인증되지 않았으면 WebView 로드하지 않음
    return (
      <View style={styles.container}>
        <View style={styles.noSession}>
          <Text style={styles.noSessionText}>{t('auth:login_required')}</Text>
        </View>
      </View>
    );
  }

  if (hasLoadError) {
    return (
      <View style={styles.container}>
        <View style={styles.noSession}>
          <Text style={styles.noSessionText}>
            {t('mobile:webview.load_failed', '페이지를 불러오지 못했습니다')}
          </Text>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.retryButton,
              pressed && styles.retryButtonPressed,
            ]}
            onPress={handleRetry}
          >
            <Text style={styles.retryButtonText}>{t('common:retry')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!isWebViewReady && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#2e78b7" />
        </View>
      )}
      <WebView
        key={reloadKey}
        ref={webViewRef}
        source={{ uri: `${WEBVIEW_BASE_URL}${path}` }}
        style={[styles.webview, !isWebViewReady && styles.hidden]}
        onMessage={handleMessage}
        // 보안 설정
        javaScriptEnabled={true}
        domStorageEnabled={true}
        originWhitelist={[`${WEBVIEW_ORIGIN}*`, 'about:blank']}
        onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
        onError={handleLoadError}
        onHttpError={handleLoadError}
        // iOS 설정
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        // Android 설정 — 프로덕션에서는 mixed content 차단
        mixedContentMode={__DEV__ ? 'always' : 'never'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  webview: { flex: 1 },
  hidden: { opacity: 0 },
  loading: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  noSession: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  noSessionText: {
    color: '#e2e8f0',
    fontSize: 16,
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#2e78b7',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  retryButtonPressed: {
    opacity: 0.7,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default WebViewEntryScreen;
