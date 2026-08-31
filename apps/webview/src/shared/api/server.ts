/**
 * WebView Server API Client
 * 401 에러 발생 시 Mobile에 신호를 전달하고, Mobile의 TOKEN_UPDATE/LOGOUT 응답을
 * 기다린 뒤 원 요청을 1회 자동 재시도 (LOGOUT/타임아웃 시 reject)
 */

import type { AuthErrorCode } from '@chachamelmelll9-hash-service/webview-bridge';

import { useBridgeStore } from '../../features/session/lib/bridge';
import { useSessionStore } from '../../features/session/model/useSessionStore';

const TOKEN_REFRESH_TIMEOUT_MS = 10000;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
}

interface ErrorResponse {
  code?: AuthErrorCode;
  message?: string;
}

function getServerUrl(): string {
  const serverUrl = import.meta.env.VITE_SERVER_URL;
  if (!serverUrl) {
    throw new Error(
      'VITE_SERVER_URL is not set. Please configure it in apps/webview/.env.development'
    );
  }
  return serverUrl;
}

// 동시 다발 401에 대해 단일 refresh 대기를 공유 (single in-flight)
let refreshPromise: Promise<string> | null = null;

function waitForTokenRefresh(staleToken: string | null): Promise<string> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = new Promise<string>((resolve, reject) => {
    const settle = (finish: () => void) => {
      clearTimeout(timer);
      unsubscribe();
      refreshPromise = null;
      finish();
    };

    const timer = setTimeout(() => {
      settle(() => reject(new Error('Token refresh timed out')));
    }, TOKEN_REFRESH_TIMEOUT_MS);

    // Mobile 응답은 sessionStore에 반영된다:
    // TOKEN_UPDATE → setAccessToken(새 토큰), LOGOUT → clearSession()
    const unsubscribe = useSessionStore.subscribe((state) => {
      if (state.accessToken && state.accessToken !== staleToken) {
        const newToken = state.accessToken;
        settle(() => resolve(newToken));
      } else if (!state.accessToken && state.isInitialized) {
        settle(() => reject(new Error('Logged out')));
      }
    });
  });

  return refreshPromise;
}

function requestTokenRefresh(staleToken: string | null, error: ErrorResponse): Promise<string> {
  if (refreshPromise) {
    return refreshPromise;
  }

  const waiter = waitForTokenRefresh(staleToken);

  // Mobile에 401 신호 전달 (토큰 갱신/로그아웃 처리는 Mobile이 담당)
  useBridgeStore.getState().sendToMobile({
    type: '401',
    code: error.code ?? 'token_invalid',
    message: error.message ?? 'Authentication failed',
  });

  return waiter;
}

async function request(
  endpoint: string,
  options: RequestOptions,
  accessToken: string | null
): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  return fetch(`${getServerUrl()}${endpoint}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error: ErrorResponse = await response.json().catch(() => ({}));
    throw new Error(error.message ?? `HTTP ${response.status}`);
  }

  return response.json();
}

export async function serverFetch<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const accessToken = useSessionStore.getState().accessToken;
  const response = await request(endpoint, options, accessToken);

  if (response.status !== 401) {
    return parseResponse<T>(response);
  }

  const error: ErrorResponse = await response.json().catch(() => ({}));

  // Mobile이 새 토큰을 전달하면 1회 재시도, LOGOUT/타임아웃이면 reject
  const newToken = await requestTokenRefresh(accessToken, error);
  const retryResponse = await request(endpoint, options, newToken);

  if (retryResponse.status === 401) {
    throw new Error('Unauthorized');
  }

  return parseResponse<T>(retryResponse);
}
