const SERVER_URL =
  process.env.EXPO_PUBLIC_SERVER_URL || 'http://10.0.2.2:3000/api';

if (!process.env.EXPO_PUBLIC_SERVER_URL) {
  console.warn(
    '[Auth] EXPO_PUBLIC_SERVER_URL not set. Using default: http://10.0.2.2:3000/api'
  );
}

interface AuthUser {
  id: string;
  email: string;
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
