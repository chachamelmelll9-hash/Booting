import { supabase } from '@shared/lib/supabase';
import * as AppleAuthentication from 'expo-apple-authentication';

import { oauthCallbackApi } from '../api/authApi';
import { saveTokens, saveUser, type StoredUser } from './tokenStorage';

export type AppleLoginResult =
  | { success: true; user: StoredUser }
  | { success: false; error: string };

export async function signInWithApple(): Promise<AppleLoginResult> {
  try {
    // 1. Apple 네이티브 로그인
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      return { success: false, error: 'Apple 인증 토큰을 받지 못했습니다' };
    }

    // 2. Supabase에 identityToken으로 인증
    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });

    if (signInError || !signInData.session) {
      return {
        success: false,
        error: signInError?.message ?? 'Supabase 인증에 실패했습니다',
      };
    }

    const { access_token, refresh_token } = signInData.session;

    // 3. 서버에 토큰 전달하여 프로필 조회
    const apiResult = await oauthCallbackApi(access_token, refresh_token);

    if (!apiResult.success) {
      return { success: false, error: apiResult.error.message };
    }

    // 4. 토큰 및 유저 정보 저장
    await saveTokens({
      accessToken: apiResult.data.accessToken,
      refreshToken: apiResult.data.refreshToken,
      expiresAt: apiResult.data.expiresAt,
    });
    await saveUser(apiResult.data.user);

    return {
      success: true,
      user: {
        id: apiResult.data.user.id,
        email: apiResult.data.user.email,
      },
    };
  } catch {
    return { success: false, error: 'Apple 로그인 중 오류가 발생했습니다' };
  }
}
