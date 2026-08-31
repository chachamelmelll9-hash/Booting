import { isLogined as isKakaoLogined, logout as logoutKakao } from '@react-native-kakao/user';
import { supabase } from '@shared/lib/supabase';
import { create } from 'zustand';

import { refreshApi } from '../api';
import {
  clearAll,
  getRefreshToken,
  getTokens,
  getUser,
  saveTokens,
  type StoredUser,
} from '../lib/tokenStorage';

export interface AuthState {
  user: StoredUser | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
}

export interface AuthActions {
  initialize: () => Promise<void>;
  setAuth: (user: StoredUser) => void;
  clearAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  user: null,
  isAuthenticated: false,
  isInitialized: false,

  initialize: async () => {
    const tokens = await getTokens();
    const user = await getUser();

    if (tokens && user) {
      // 토큰이 곧 만료되면 갱신 (5분 전)
      if (Date.now() > tokens.expiresAt - 5 * 60 * 1000) {
        const refreshToken = await getRefreshToken();
        if (refreshToken) {
          const result = await refreshApi(refreshToken);
          if (result.success) {
            await saveTokens({
              accessToken: result.data.accessToken,
              refreshToken: result.data.refreshToken,
              expiresAt: result.data.expiresAt,
            });
            set({ user, isAuthenticated: true, isInitialized: true });
            return;
          }
        }
        // 갱신 실패 시 로그아웃 상태로
        await clearAll();
        set({ user: null, isAuthenticated: false, isInitialized: true });
        return;
      }
      set({ user, isAuthenticated: true, isInitialized: true });
      return;
    }

    set({ isInitialized: true });
  },

  setAuth: (user) => {
    set({ user, isAuthenticated: true });
  },

  clearAuth: async () => {
    try {
      if (process.env.EXPO_PUBLIC_KAKAO_NATIVE_KEY && (await isKakaoLogined())) {
        await logoutKakao();
      }
    } catch {
      // Ignore Kakao SDK sign-out failures and still clear local auth state.
    }

    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore Supabase client sign-out failures and still clear local auth state.
    }
    await clearAll();
    set({ user: null, isAuthenticated: false });
  },
}));
