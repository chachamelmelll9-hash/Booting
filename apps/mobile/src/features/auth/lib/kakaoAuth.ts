import { login } from '@react-native-kakao/user';
import { supabase } from '@shared/lib/supabase';

import { oauthCallbackApi } from '../api/authApi';
import { saveTokens, saveUser, type StoredUser } from './tokenStorage';

export type KakaoLoginResult =
  | { success: true; user: StoredUser }
  | { success: false; error: string };

export async function signInWithKakao(): Promise<KakaoLoginResult> {
  try {
    // 1. 네이티브 카카오 SDK로 로그인 (카카오톡 앱 또는 카카오 계정 로그인)
    const kakaoToken = await login();
    if (!kakaoToken.idToken) {
      return {
        success: false,
        error:
          'OpenID Connect가 활성화되지 않았습니다. 카카오 개발자 콘솔에서 설정해주세요.',
      };
    }

    // 2. Supabase에 idToken으로 인증 (웹브라우저 불필요)
    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithIdToken({
        provider: 'kakao',
        token: kakaoToken.idToken,
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
    return { success: false, error: '카카오 로그인 중 오류가 발생했습니다' };
  }
}
