import { i18n } from '@chachamelmelll9-hash-service/i18n';
import {
  BRIDGE_PROTOCOL_VERSION,
  isMobileToWebViewMessage,
  type WebViewToMobileMessage,
} from '@chachamelmelll9-hash-service/webview-bridge';
import { create } from 'zustand';

import { useSessionStore } from '../model/useSessionStore';

// SESSION 수신 전까지 WEBVIEW_READY를 재전송하는 간격
const READY_RESEND_INTERVAL_MS = 3000;

// WebView 환경인지 확인 (송신 경로와 동일하게 ReactNativeWebView 주입 여부로 판단)
function checkIsInWebView(): boolean {
  return !!window.ReactNativeWebView;
}

// RN WebView가 주입한 메시지(origin 빈 값) 또는 자체 오리진 메시지만 신뢰
function isTrustedMessageEvent(event: MessageEvent): boolean {
  if (event.origin && event.origin !== window.location.origin) {
    return false;
  }
  if (event.source && event.source !== window) {
    return false;
  }
  return true;
}

interface BridgeState {
  isInWebView: boolean;
  isListenerInitialized: boolean;
}

interface BridgeActions {
  sendToMobile: (message: WebViewToMobileMessage) => void;
  initializeListener: () => () => void;
}

export const useBridgeStore = create<BridgeState & BridgeActions>((set, get) => ({
  // State
  isInWebView: checkIsInWebView(),
  isListenerInitialized: false,

  // Actions
  sendToMobile: (message) => {
    window.ReactNativeWebView?.postMessage(JSON.stringify(message));
  },

  initializeListener: () => {
    if (get().isListenerInitialized) {

      return () => {};
    }

    const { setAccessToken, clearSession } = useSessionStore.getState();

    const handleMobileMessage = (event: MessageEvent) => {
      if (!isTrustedMessageEvent(event)) {
        return;
      }
      if (typeof event.data !== 'string') {
        return;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(event.data);
      } catch {
        // JSON 파싱 실패 - 다른 소스의 메시지일 수 있음
        return;
      }

      if (!isMobileToWebViewMessage(parsed)) {
        if (parsed && typeof parsed === 'object' && 'type' in parsed) {
          // 프로토콜 스큐(구버전 웹뷰 ↔ 신버전 앱) 감지용 로그
          console.warn(
            '[bridge] Unknown message type from mobile:',
            (parsed as { type: unknown }).type
          );
        }
        return;
      }

      switch (parsed.type) {
        case 'SESSION':
          if (parsed.accessToken) {
            setAccessToken(parsed.accessToken);
          } else {
            clearSession();
          }
          // Sync language from mobile if provided
          if (parsed.language) {
            i18n.changeLanguage(parsed.language);
          }
          break;

        case 'TOKEN_UPDATE':
          setAccessToken(parsed.accessToken);
          break;

        case 'LANGUAGE_UPDATE':
          i18n.changeLanguage(parsed.language);
          break;

        case 'LOGOUT':
          clearSession();
          break;
      }
    };

    // 리스너 등록
    document.addEventListener('message', handleMobileMessage as EventListener);
    window.addEventListener('message', handleMobileMessage);

    // WebView Ready 핸드셰이크 — SESSION 수신 전까지 재전송 (모바일 리스너 지연 대비)
    let readyInterval: ReturnType<typeof setInterval> | undefined;
    if (get().isInWebView) {
      const sendReady = () =>
        get().sendToMobile({
          type: 'WEBVIEW_READY',
          protocolVersion: BRIDGE_PROTOCOL_VERSION,
        });
      sendReady();
      readyInterval = setInterval(() => {
        if (useSessionStore.getState().isInitialized) {
          clearInterval(readyInterval);
          return;
        }
        sendReady();
      }, READY_RESEND_INTERVAL_MS);
    }

    set({ isListenerInitialized: true });

    // cleanup 함수 반환
    return () => {
      if (readyInterval) {
        clearInterval(readyInterval);
      }
      document.removeEventListener('message', handleMobileMessage as EventListener);
      window.removeEventListener('message', handleMobileMessage);
      set({ isListenerInitialized: false });
    };
  },
}));
