const SERVER_URL =
  process.env.EXPO_PUBLIC_SERVER_URL || 'http://10.0.2.2:3000/api';

if (!process.env.EXPO_PUBLIC_SERVER_URL) {
  console.warn(
    '[Auth] EXPO_PUBLIC_SERVER_URL not set. Using default: http://10.0.2.2:3000/api'
  );
}

interface AuthUser {
  id: string;
  /** 소셜 로그인은 비어 있을 수 있다 (카카오는 이메일 동의가 없으면 안 준다) */
  email: string;
  /** 이메일이 없을 때 대신 부를 이름 — 카카오 닉네임 */
  displayName?: string;
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: AuthUser;
}

interface SignUpResponse {
  user: AuthUser;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
}

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

interface ApiError {
  code: string;
  message: string;
}

type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: ApiError };

async function authFetch<T>(
  endpoint: string,
  body: Record<string, unknown>
): Promise<ApiResult<T>> {
  try {
    const response = await fetch(`${SERVER_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: {
          code: data.code ?? 'unknown_error',
          message: data.message ?? '오류가 발생했습니다',
        },
      };
    }

    return { success: true, data: data as T };
  } catch {
    return {
      success: false,
      error: {
        code: 'network_error',
        message: '네트워크 오류가 발생했습니다',
      },
    };
  }
}

export async function loginApi(
  email: string,
  password: string
): Promise<ApiResult<LoginResponse>> {
  return authFetch<LoginResponse>('/auth/login', { email, password });
}

/**
 * 개발용 즉시 로그인.
 *
 * 고정 계정을 서버가 (없으면) 만들고 자녀 인증까지 끝난 상태로 세션을 준다.
 * production 서버는 403 을 돌려준다.
 */
export async function devLoginApi(): Promise<ApiResult<LoginResponse>> {
  return authFetch<LoginResponse>('/auth/dev-login', {});
}

export async function signUpApi(
  email: string,
  password: string
): Promise<ApiResult<SignUpResponse>> {
  return authFetch<SignUpResponse>('/auth/signup', { email, password });
}

export async function refreshApi(
  refreshToken: string
): Promise<ApiResult<RefreshResponse>> {
  return authFetch<RefreshResponse>('/auth/refresh', { refreshToken });
}

export async function logoutApi(): Promise<{ success: boolean }> {
  const { serverFetch } = await import('@/shared/api/server');
  return serverFetch<{ success: boolean }>('/auth/logout', {
    method: 'POST',
  });
}

export async function deleteAccountApi(): Promise<{ success: boolean }> {
  const { serverFetch } = await import('@/shared/api/server');
  return serverFetch<{ success: boolean }>('/auth/delete-account', {
    method: 'POST',
  });
}

export async function resetPasswordApi(
  email: string,
  redirectTo?: string
): Promise<ApiResult<{ success: boolean }>> {
  return authFetch<{ success: boolean }>('/auth/reset-password', {
    email,
    redirectTo,
  });
}

export async function oauthCallbackApi(
  accessToken: string,
  refreshToken: string
): Promise<ApiResult<LoginResponse>> {
  return authFetch<LoginResponse>('/auth/oauth-callback', {
    accessToken,
    refreshToken,
  });
}

/**
 * 이 카카오 계정에 연결해 둔 부팅 계정이 있는지 묻는다 — 카카오 로그인의 첫 걸음.
 *
 * 있으면 서버가 그 계정의 세션을 바로 내준다. 없으면 `linked: false` 만 오고
 * 앱은 하던 대로 Supabase 카카오 로그인을 이어간다.
 */
export async function resolveKakaoLinkApi(
  idToken: string
): Promise<ApiResult<{ linked: boolean; session?: LoginResponse }>> {
  return authFetch<{ linked: boolean; session?: LoginResponse }>('/auth/kakao/resolve', {
    idToken,
  });
}
