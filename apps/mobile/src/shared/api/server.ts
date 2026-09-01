/**
 * Server API Client
 * JWT 토큰을 첨부하여 서버 API 호출
 * 401 에러 시 자동 갱신 및 재시도
 */

import { refreshApi } from '@/features/auth/api';
import {
  getAccessToken,
  getRefreshToken,
  saveTokens,
} from '@/features/auth/lib/tokenStorage';
import { useAuthStore } from '@/features/auth/model/useAuthStore';

const SERVER_URL =
  process.env.EXPO_PUBLIC_SERVER_URL || 'http://10.0.2.2:3000/api';

export class AuthenticationError extends Error {
  constructor(
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  skipAuth?: boolean;
  /** @internal 401 갱신 후 재시도 여부 — 무한 재귀 방지용 */
  _retried?: boolean;
}

async function tryRefreshToken(): Promise<string | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    await useAuthStore.getState().clearAuth();
    return null;
  }

  const result = await refreshApi(refreshToken);
  if (!result.success) {
    await useAuthStore.getState().clearAuth();
    return null;
  }

  await saveTokens({
    accessToken: result.data.accessToken,
    refreshToken: result.data.refreshToken,
    expiresAt: result.data.expiresAt,
  });

  return result.data.accessToken;
}

export async function serverFetch<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (!options.skipAuth) {
    const accessToken = await getAccessToken();
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
  }

  const response = await fetch(`${SERVER_URL}${endpoint}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 401) {
    const error = await response
      .json()
      .catch(() => ({ code: 'unknown', message: `HTTP ${response.status}` }));

    // token_expired인 경우에만 갱신 시도 (재시도는 1회로 제한)
    if (error.code === 'token_expired' && !options._retried) {
      const newToken = await tryRefreshToken();
      if (newToken) {
        // 새 토큰으로 재시도
        return serverFetch(endpoint, { ...options, _retried: true });
      }
    } else {
      // token_revoked, token_invalid, 파싱 실패 등은 로그아웃
      await useAuthStore.getState().clearAuth();
    }

    throw new AuthenticationError(error.message, error.code);
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    // 서버는 도메인 에러를 { code, message } 로 내려준다. 화면이 코드로 분기할 수
    // 있도록 code 를 잃지 않고 실어 보낸다.
    const failure = new Error(error.message ?? `HTTP ${response.status}`) as Error & {
      code?: string;
      status?: number;
    };
    failure.code = error.code;
    failure.status = response.status;
    throw failure;
  }

  // 204 No Content 에는 본문이 없다 — json() 을 부르면 파싱 에러가 난다
  if (response.status === 204) return undefined as T;

  return response.json();
}
