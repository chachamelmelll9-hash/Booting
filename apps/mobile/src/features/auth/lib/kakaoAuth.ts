import { login, scopes as kakaoScopes } from '@react-native-kakao/user';
import { supabase } from '@shared/lib/supabase';

import { oauthCallbackApi, resolveKakaoLinkApi } from '../api/authApi';
import { saveTokens, saveUser, type StoredUser } from './tokenStorage';

export type KakaoLoginResult =
  | { success: true; user: StoredUser }
  | { success: false; error: string };

/** 세션을 저장하고 결과를 만든다 — 연결 로그인과 일반 로그인이 함께 쓴다 */
async function finishLogin(session: {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: StoredUser;
}): Promise<KakaoLoginResult> {
  await saveTokens({
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    expiresAt: session.expiresAt,
  });
  await saveUser(session.user);
  // 저장한 것을 그대로 돌려준다. 필드를 골라 다시 담으면 새 필드가 생길 때마다
  // 여기서 조용히 떨어진다 (displayName 이 실제로 그렇게 빠졌다).
  return { success: true, user: session.user };
}

/** 사용자가 카카오 화면에서 그냥 나온 것 — 실패로 떠들지 않는다 */
const CANCEL_HINTS = ['cancel', 'Cancel', 'user_cancelled'];

export function isKakaoCancel(error: unknown): boolean {
  const text = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  return CANCEL_HINTS.some((h) => text.includes(h));
}

const isCancel = isKakaoCancel;

/**
 * 카카오톡은 깔려 있는데 그 안에 카카오계정이 안 들어가 있는 상태.
 *
 * SDK 는 카카오톡이 깔려 있으면 무조건 카카오톡으로 로그인하려 들고, 그 앱이
 * 로그아웃 상태면 여기서 끝나 버린다 — 사용자에게는 "카카오 로그인 실패" 라는
 * 말만 남는다. 자기 폰의 카카오톡이 로그아웃돼 있는지는 아무도 모른다.
 *
 * 흔한 일이다: 새 기기, 카톡을 지웠다 다시 깐 경우, 그리고 개발 에뮬레이터.
 * 이 경우 카카오계정(웹) 로그인으로 한 번 더 시도한다 — 아이디·비밀번호를
 * 넣는 화면이 뜨고, 거기서 끝까지 갈 수 있다.
 */
const NOT_CONNECTED_HINT = 'not connected to Kakao account';

async function loginWithKakao() {
  try {
    return await login();
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    if (!text.includes(NOT_CONNECTED_HINT)) throw error;
    if (__DEV__) console.log('[kakao] 카카오톡 미연결 → 카카오계정 로그인으로 재시도');
    return await login({ useKakaoAccountLogin: true });
  }
}

/** 카카오톡 메시지 전송 동의항목 — '나에게 보내기' 가 이걸 요구한다 */
const TALK_MESSAGE_SCOPE = 'talk_message';

/**
 * 카카오 SDK 세션에 '카카오톡 메시지 전송' 동의를 확보한다.
 *
 * 우리 계정 로그인과는 별개다 — Supabase 세션은 건드리지 않고, 카카오 SDK 가
 * 들고 있는 토큰에 동의항목만 붙인다.
 *
 * `useKakaoAccountLogin: true` 로 가는 이유: `scopes` 는 카카오톡 앱 로그인과
 * 같이 실을 수 없다 (라이브러리가 거부한다 — 실측). 카카오계정 로그인이면
 * 동의 화면이 떠서 그 자리에서 항목을 받을 수 있다.
 */
async function messageScopeState(): Promise<'granted' | 'missing' | 'no-token'> {
  try {
    const granted = await kakaoScopes([TALK_MESSAGE_SCOPE]);
    return granted.some((s) => s.id === TALK_MESSAGE_SCOPE && s.agreed)
      ? 'granted'
      : 'missing';
  } catch {
    // 동의 상태를 물어보는 것 자체가 토큰을 쓴다. 실패하면 아직 로그인 전이다.
    //
    // `isLogined()` 로 묻지 않는 이유: 그 함수는 저장된 토큰이 있는지만 보고
    // true 를 주는데 정작 그 토큰으로 부르면 `TokenNotFound` 가 난다 (실측).
    return 'no-token';
  }
}

export async function ensureKakaoMessageScope(): Promise<void> {
  let state = await messageScopeState();
  if (state === 'granted') return;

  if (state === 'no-token') {
    /**
     * 로그인이 먼저다. `login({ scopes })` 는 '추가 동의 받기'
     * (`loginWithNewScopes`) 로 가는데, 그건 **이미 로그인돼 있어야** 동작한다 —
     * 토큰이 없으면 화면도 안 뜨고 `TokenNotFound` 로 끝난다 (실측).
     */
    await loginWithKakao();
    state = await messageScopeState();
    if (state === 'granted') return;
  }

  // 로그인은 됐는데 이 동의만 없다 → 여기서 그 항목만 더 받는다
  await login({ useKakaoAccountLogin: true, scopes: [TALK_MESSAGE_SCOPE] });
}

/**
 * 카카오 로그인만 해서 id_token 을 받아 온다 — 세션은 만들지 않는다.
 *
 * 계정 연결이 쓴다. 이미 우리 계정으로 로그인해 있는 사람이라, 여기서
 * Supabase 로그인까지 해 버리면 카카오 쪽 계정으로 갈아타 버린다.
 */
export async function getKakaoIdToken(): Promise<string> {
  const token = await loginWithKakao();
  if (!token.idToken) {
    throw new Error('OpenID Connect가 활성화되지 않았습니다. 카카오 개발자 콘솔에서 설정해주세요.');
  }
  return token.idToken;
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

/**
 * 계정 연결은 **이메일로만** 된다.
 *
 * Supabase 는 들어온 이메일이 인증된 값이면 같은 이메일의 기존 계정에 카카오
 * 신원을 자동으로 붙인다. 이메일이 없으면 같은 사람인지 알 방법이 없어
 * 계정이 하나 더 생긴다 (이메일로 가입한 뒤 카카오로 들어온 사람).
 *
 * 그 이메일은 여기서 요청하지 않는다 — `login({ scopes })` 는 카카오톡 앱
 * 로그인과 같이 못 쓴다 (`useKakaoAccountLogin` 이 false 면 라이브러리가
 * 거부한다. 실측). 웹 계정 로그인으로 바꿔야 하는데, 그러자고 카카오톡으로
 * 바로 되던 로그인을 아이디·비밀번호 입력으로 되돌릴 이유가 없다.
 *
 * 대신 카카오 콘솔 [카카오 로그인] > [동의항목] 에 '카카오계정(이메일)' 을
 * 넣는다. 동의 화면에 항목으로 떠서 scope 를 실어 보내지 않아도 들어온다
 * (프로필 사진이 지금 그렇게 오고 있다). 이미 동의를 마친 사용자는 연결이
 * 끊기기 전까지 새 항목을 다시 묻지 않는다는 점만 유의한다.
 */
export async function signInWithKakao(): Promise<KakaoLoginResult> {
  let kakaoToken;
  try {
    // 1. 네이티브 카카오 SDK로 로그인 (카카오톡 앱, 안 되면 카카오계정)
    kakaoToken = await loginWithKakao();
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

    // 2. 이 카카오에 연결해 둔 계정이 있으면 그 계정으로 들어간다.
    //    Supabase 보다 먼저 묻는 이유: Supabase 는 이메일이 같을 때만 붙여 주는데
    //    카카오는 이메일을 주지 않아, 여기서 안 걸러내면 계정이 하나 더 생긴다.
    const linked = await resolveKakaoLinkApi(kakaoToken.idToken);
    if (linked.success && linked.data.linked && linked.data.session) {
      return finishLogin(linked.data.session);
    }
    // 연결이 없으면(또는 확인에 실패하면) 하던 대로 간다 — 연결을 안 해 둔
    // 사람의 로그인까지 막을 이유는 없다
    if (!linked.success && __DEV__) console.log('[kakao link resolve failed]', linked.error);

    // 3. Supabase에 idToken으로 인증 (웹브라우저 불필요)
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

    // 4. 서버에 토큰 전달하여 프로필 조회
    const apiResult = await oauthCallbackApi(access_token, refresh_token);

    if (!apiResult.success) {
      return { success: false, error: apiResult.error.message };
    }

    return finishLogin(apiResult.data);
  } catch (error) {
    if (__DEV__) console.log('[kakao session exchange failed]', error);
    const detail = error instanceof Error ? error.message : String(error);
    return { success: false, error: `로그인 처리 중 오류: ${detail}` };
  }
}
