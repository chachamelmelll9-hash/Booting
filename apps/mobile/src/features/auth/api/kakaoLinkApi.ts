import { serverFetch } from '@shared/api/server';

export interface KakaoLinkStatus {
  linked: boolean;
  linkedAt: string | null;
}

/**
 * 카카오 계정 연결 — 로그인한 사람이 자기 계정에 카카오를 붙이고 뗀다.
 *
 * 로그인 경로(`resolveKakaoLinkApi`)와 달리 여기는 인증이 필요하다. 누가 붙이는지
 * 알아야 하기 때문이다. 그래서 토큰을 실어 주는 `serverFetch` 를 쓴다.
 */
export const kakaoLinkApi = {
  status: () => serverFetch<KakaoLinkStatus>('/auth/kakao/link'),
  link: (idToken: string) =>
    serverFetch<{ linked: true }>('/auth/kakao/link', { method: 'POST', body: { idToken } }),
  unlink: () => serverFetch<{ linked: false }>('/auth/kakao/link', { method: 'DELETE' }),
};
