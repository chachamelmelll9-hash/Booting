/**
 * 부모님 화면 API.
 *
 * 자녀용 `serverFetch` 를 쓰지 않는다. 그쪽은 Supabase 세션 토큰을 붙이고
 * 401 이면 갱신·로그아웃까지 하는데, 부모님은 계정이 없어 그 흐름이 통째로
 * 맞지 않는다. 부모님 토큰은 코드 로그인으로 받은 불투명 문자열 하나뿐이다.
 */
import type {
  ParentInboxItem,
  ParentInterestResult,
  ParentLoginResult,
  ParentProfileDetail,
} from './booting.types';

const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL || 'http://10.0.2.2:3000/api';

async function parentFetch<T>(
  endpoint: string,
  options: { method?: 'GET' | 'POST'; body?: unknown; token?: string } = {}
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options.token) headers['Authorization'] = `Bearer ${options.token}`;

  const response = await fetch(`${SERVER_URL}${endpoint}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as {
      message?: string;
      code?: string;
    };
    const failure = new Error(error.message ?? `HTTP ${response.status}`) as Error & {
      code?: string;
      status?: number;
    };
    failure.code = error.code;
    failure.status = response.status;
    throw failure;
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const parentApi = {
  login: (code: string) =>
    parentFetch<ParentLoginResult>('/parent/login', { method: 'POST', body: { code } }),
  logout: (token: string) => parentFetch<void>('/parent/logout', { method: 'POST', token }),
  inbox: (token: string) => parentFetch<ParentInboxItem[]>('/parent/profiles', { token }),
  detail: (token: string, connectionId: string) =>
    parentFetch<ParentProfileDetail>(`/parent/profiles/${connectionId}`, { token }),
  // markViewed 는 없앴다 — 상세 요청 안에서 서버가 함께 찍는다
  express: (token: string, connectionId: string) =>
    parentFetch<ParentInterestResult>(`/parent/profiles/${connectionId}/interest`, {
      method: 'POST',
      token,
    }),
  decline: (token: string, connectionId: string) =>
    parentFetch<void>(`/parent/profiles/${connectionId}/decline`, { method: 'POST', token }),
};

export const parentKeys = {
  inbox: ['parent', 'inbox'] as const,
  detail: (connectionId: string) => ['parent', 'detail', connectionId] as const,
};
