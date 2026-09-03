import { login } from '@react-native-kakao/user';
import { supabase } from '@shared/lib/supabase';

import { oauthCallbackApi } from '../api/authApi';
import { saveTokens, saveUser, type StoredUser } from './tokenStorage';

export type KakaoLoginResult =
  | { success: true; user: StoredUser }
  | { success: false; error: string };

/** 사용자가 카카오 화면에서 그냥 나온 것 — 실패로 떠들지 않는다 */
const CANCEL_HINTS = ['cancel', 'Cancel', 'user_cancelled'];

function isCancel(error: unknown): boolean {
  const text = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  return CANCEL_HINTS.some((h) => text.includes(h));
}

/**
 * id_token 의 `aud` 를 꺼낸다 (개발 로그 전용).
 *
 * Supabase 는 이 값이 provider 설정의 client id 와 같아야 통과시킨다. 카카오
 * 네이티브 SDK 는 요청에 쓴 앱 키를 `aud` 에 넣는데, 콘솔에서 어떤 키로
 * 잡히는지는 문서만으로 확신할 수 없다. 틀리면 Supabase 가 그냥 "Invalid
 * token" 만 돌려주므로, 맞춰 넣을 값을 눈으로 볼 수 있게 찍어 둔다.
 */
function logIdTokenAudience(idToken: string) {
  if (!__DEV__) return;
  try {
    const [, payload] = idToken.split('.');
    const json = JSON.parse(
      // base64url → base64
      global.atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    ) as { aud?: string; iss?: string };
    console.log('[kakao id_token]', { aud: json.aud, iss: json.iss });
  } catch {
    // 로그일 뿐이다 — 못 읽어도 로그인은 계속 간다
  }
}

export async function signInWithKakao(): Promise<KakaoLoginResult> {
  let kakaoToken;
  try {
    // 1. 네이티브 카카오 SDK로 로그인 (카카오톡 앱 또는 카카오 계정 로그인)
    kakaoToken = await login();
  } catch (error) {
    // 카카오 SDK 실패는 여기서만 잡는다. 아래 단계까지 한 try 로 묶으면
    // Supabase·서버 오류까지 "카카오 로그인 오류"로 뭉개져 원인을 못 찾는다.
    if (isCancel(error)) return { success: false, error: '' };
    const detail = error instanceof Error ? error.message : String(error);
    if (__DEV__) console.log('[kakao login failed]', error);
    // KOE004(로그인 비활성)·키 해시 불일치 등은 코드가 문구에 들어 있다.
    // 그대로 보여 준다 — 콘솔에서 무엇을 켜야 하는지 이 문자열이 알려준다.
    return { success: false, error: `카카오 로그인 실패: ${detail}` };
  }

  try {
    if (!kakaoToken.idToken) {
      return {
        success: false,
        error:
          'OpenID Connect가 활성화되지 않았습니다. 카카오 개발자 콘솔에서 설정해주세요.',
      };
    }
    logIdTokenAudience(kakaoToken.idToken);

    // 2. Supabase에 idToken으로 인증 (웹브라우저 불필요)
    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithIdToken({
        provider: 'kakao',
        token: kakaoToken.idToken,
      });

    if (signInError || !signInData.session) {
      if (__DEV__) console.log('[kakao supabase signIn failed]', signInError);
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
  } catch (error) {
    if (__DEV__) console.log('[kakao session exchange failed]', error);
    const detail = error instanceof Error ? error.message : String(error);
    return { success: false, error: `로그인 처리 중 오류: ${detail}` };
  }
}
