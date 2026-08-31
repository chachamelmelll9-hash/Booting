import { create } from 'zustand';

interface SessionState {
  accessToken: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
}

interface SessionActions {
  setAccessToken: (accessToken: string) => void;
  clearSession: () => void;
  initializeTimeout: (isInWebView: boolean) => () => void;
}

export const useSessionStore = create<SessionState & SessionActions>((set, get) => ({
  // State
  accessToken: null,
  isAuthenticated: false,
  isInitialized: false,

  // Actions
  setAccessToken: (accessToken) => {
    set({
      accessToken,
      isAuthenticated: true,
      isInitialized: true,
    });
  },

  clearSession: () => {
    set({
      accessToken: null,
      isAuthenticated: false,
      isInitialized: true,
    });
  },

  // 초기화 타임아웃 (WebView 환경이 아닌 경우 대비)
  // WebView 환경에서는 브리지가 WEBVIEW_READY를 재전송하며 SESSION 수신을 계속 기다린다.
  initializeTimeout: (isInWebView) => {
    const timeout = setTimeout(() => {
      if (!get().isInitialized && !isInWebView) {
        set({ isInitialized: true });
      }
    }, 3000);

    return () => clearTimeout(timeout);
  },
}));
