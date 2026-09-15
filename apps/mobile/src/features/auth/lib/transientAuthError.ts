/**
 * 토큰 갱신 실패 중 **세션을 지우면 안 되는** 것들.
 *
 * 서버는 GoTrue 네트워크 오류·5xx 를 503 `auth_provider_unavailable`, 429 를
 * `over_request_rate_limit` 로 내려주고, 앱의 fetch 자체가 실패하면
 * `network_error` 다. 셋 다 토큰이 나쁘다는 뜻이 아니다 — 여기서 로그아웃시키면
 * 서버가 잠깐 흔들릴 때마다 사용자가 로그인 화면으로 튕긴다 (09-15 발표 준비 중
 * "로그인 또 풀렸어" — 서버 로그에는 같은 시각 Supabase `fetch failed` 만 있었다).
 *
 * api 모듈이 아니라 lib 에 두는 이유: 테스트가 `@features/auth/api` 를 통째로
 * 모킹한다. 거기 두면 모킹된 모듈에서 이 함수가 사라져 호출 자체가 터진다.
 */
export function isTransientAuthError(code: string | undefined): boolean {
  return (
    code === 'network_error' ||
    code === 'auth_provider_unavailable' ||
    code === 'over_request_rate_limit'
  );
}
