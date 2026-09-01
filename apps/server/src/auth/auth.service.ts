import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { decodeJwt } from 'jose';

import { SupabaseService } from '../supabase/supabase.service';
import {
  AUTH_ERROR_CODES,
  AUTH_ERROR_MESSAGES,
} from './constants/auth-errors';

export class GoTrueRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'GoTrueRequestError';
  }
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface AuthUser {
  id: string;
  email: string;
}

export interface LoginResponse extends AuthTokens {
  user: AuthUser;
}

export interface SignUpResponse {
  user: AuthUser;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  private get authUrl(): string {
    return `${this.supabaseService.getUrl()}/auth/v1`;
  }

  private get apiKey(): string {
    return this.supabaseService.getAnonKey();
  }

  private get serviceRoleKey(): string {
    return this.supabaseService.getServiceRoleKey();
  }

  private async gotruePost<T>(
    path: string,
    body: Record<string, unknown>,
    headers?: Record<string, string>,
  ): Promise<T> {
    const res = await fetch(`${this.authUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: this.apiKey,
        ...headers,
      },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      const message =
        (typeof json.msg === 'string' && json.msg) ||
        (typeof json.error_description === 'string' && json.error_description) ||
        (typeof json.message === 'string' && json.message) ||
        'Unknown error';
      throw new GoTrueRequestError(message, res.status);
    }
    return json as T;
  }

  /**
   * GoTrue 5xx/429/네트워크 오류를 자격 증명 오류로 뭉개지 않도록
   * 클라이언트 잘못이 아닌 오류를 먼저 걸러 rethrow한다.
   */
  private throwIfUpstreamError(err: unknown): void {
    if (err instanceof GoTrueRequestError) {
      if (err.status === 429) {
        throw new HttpException(
          {
            code: 'over_request_rate_limit',
            message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요',
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      if (err.status >= 500) {
        this.logger.error(`GoTrue responded with ${err.status}: ${err.message}`);
        throw new ServiceUnavailableException({
          code: 'auth_provider_unavailable',
          message: '인증 서버에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요',
        });
      }
      return;
    }
    this.logger.error(`GoTrue request failed: ${String(err)}`);
    throw new ServiceUnavailableException({
      code: 'auth_provider_unavailable',
      message: '인증 서버에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요',
    });
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    let data: {
      access_token: string;
      refresh_token: string;
      expires_at?: number;
      user: { id: string; email?: string };
    };

    try {
      data = await this.gotruePost('/token?grant_type=password', { email, password });
    } catch (err: unknown) {
      this.throwIfUpstreamError(err);
      throw new BadRequestException({
        code: 'invalid_credentials',
        message: '이메일 또는 비밀번호가 올바르지 않습니다',
      });
    }

    if (!data.user?.email) {
      throw new BadRequestException({
        code: 'invalid_credentials',
        message: '이메일 또는 비밀번호가 올바르지 않습니다',
      });
    }

    const expiresAt = data.expires_at ?? Math.floor(Date.now() / 1000) + 3600;

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: expiresAt * 1000,
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    };
  }

  /**
   * 개발용 즉시 로그인.
   *
   * 고정 계정을 (없으면) 만들고 자녀 인증까지 끝난 상태로 맞춘 뒤 세션을 준다.
   * 에뮬레이터에서 매번 이메일·비밀번호를 치고 인증 단계를 지나느라 정작
   * 검증하려는 화면까지 가지 못하는 문제를 없앤다.
   *
   * **production 에서는 호출 자체가 막힌다** — 열려 있으면 아무나 계정을
   * 얻는 통로가 된다.
   */
  async devLogin(): Promise<LoginResponse> {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException({
        code: 'not_available',
        message: '사용할 수 없는 기능입니다',
      });
    }

    const email = process.env.DEV_LOGIN_EMAIL || 'demo@seed.booting.app';
    const password = process.env.DEV_LOGIN_PASSWORD || 'BootingDemo123!';
    const client = this.supabaseService.getClient();

    const { error: createError } = await client.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    // 이미 있으면 그대로 쓴다
    if (createError && !/already/i.test(createError.message)) {
      this.logger.warn(`dev login createUser: ${createError.message}`);
    }

    const session = await this.login(email, password);

    // 자녀 인증은 통과한 상태로 둔다 (인증 화면을 다시 지나지 않게)
    await client.from('child_verifications').upsert(
      {
        user_id: session.user.id,
        phone: '01000000000',
        phone_verified_at: new Date().toISOString(),
        family_doc_status: 'approved',
        family_verified_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    this.logger.log(`dev login issued for ${email}`);
    return session;
  }

  async signUp(email: string, password: string): Promise<SignUpResponse> {
    let data: {
      access_token?: string;
      refresh_token?: string;
      expires_at?: number;
      id?: string;
      email?: string;
      user?: { id: string; email?: string };
    };

    try {
      data = await this.gotruePost('/signup', { email, password });
    } catch (err: unknown) {
      this.throwIfUpstreamError(err);
      const message = (err as { message?: string })?.message ?? '';
      if (message.includes('already registered')) {
        throw new BadRequestException({
          code: 'user_already_exists',
          message: '이미 등록된 이메일입니다',
        });
      }
      throw new BadRequestException({
        code: 'signup_failed',
        message,
      });
    }

    // GoTrue signup returns user at top level or nested
    const userId = data.user?.id ?? data.id;
    const userEmail = data.user?.email ?? data.email;

    if (!userId || !userEmail) {
      throw new BadRequestException({
        code: 'signup_failed',
        message: '회원가입에 실패했습니다',
      });
    }

    const response: SignUpResponse = {
      user: { id: userId, email: userEmail },
    };

    if (data.access_token) {
      const expiresAt = data.expires_at ?? Math.floor(Date.now() / 1000) + 3600;
      response.accessToken = data.access_token;
      response.refreshToken = data.refresh_token;
      response.expiresAt = expiresAt * 1000;
    }

    return response;
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    let data: {
      access_token: string;
      refresh_token: string;
      expires_at?: number;
    };

    try {
      data = await this.gotruePost('/token?grant_type=refresh_token', {
        refresh_token: refreshToken,
      });
    } catch (err: unknown) {
      this.throwIfUpstreamError(err);
      throw new UnauthorizedException({
        code: AUTH_ERROR_CODES.TOKEN_REVOKED,
        message: AUTH_ERROR_MESSAGES.token_revoked,
      });
    }

    const expiresAt = data.expires_at ?? Math.floor(Date.now() / 1000) + 3600;

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: expiresAt * 1000,
    };
  }

  async logout(userId: string): Promise<{ success: boolean }> {
    try {
      await fetch(`${this.authUrl}/admin/users/${userId}/logout`, {
        method: 'POST',
        headers: {
          apikey: this.serviceRoleKey,
          Authorization: `Bearer ${this.serviceRoleKey}`,
        },
      });
    } catch (err) {
      this.logger.warn(`Failed to invalidate server session for user ${userId}: ${String(err)}`);
    }
    return { success: true };
  }

  async oauthCallback(accessToken: string, refreshToken: string): Promise<LoginResponse> {
    const res = await fetch(`${this.authUrl}/user`, {
      headers: {
        apikey: this.apiKey,
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      if (res.status >= 500) {
        this.logger.error(`GoTrue /user responded with ${res.status}`);
        throw new ServiceUnavailableException({
          code: 'auth_provider_unavailable',
          message: '인증 서버에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요',
        });
      }
      throw new UnauthorizedException({
        code: 'invalid_oauth_token',
        message: 'OAuth 토큰이 유효하지 않습니다',
      });
    }

    const user = (await res.json()) as { id: string; email?: string; user_metadata?: { email?: string } };

    const email = user.email ?? user.user_metadata?.email ?? '';

    let expiresAt: number;
    try {
      const { exp } = decodeJwt(accessToken);
      expiresAt = exp ? exp * 1000 : Date.now() + 3600 * 1000;
    } catch {
      expiresAt = Date.now() + 3600 * 1000;
    }

    return {
      accessToken,
      refreshToken,
      expiresAt,
      user: {
        id: user.id,
        email,
      },
    };
  }

  async deleteAccount(userId: string): Promise<{ success: boolean }> {
    try {
      const res = await fetch(`${this.authUrl}/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          apikey: this.serviceRoleKey,
          Authorization: `Bearer ${this.serviceRoleKey}`,
        },
      });

      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        const message =
          (typeof json.msg === 'string' && json.msg) ||
          (typeof json.message === 'string' && json.message) ||
          'Account deletion failed';
        throw new Error(message);
      }
    } catch (err: unknown) {
      this.logger.error(`Failed to delete account for user ${userId}: ${String(err)}`);
      throw new BadRequestException({
        code: 'account_deletion_failed',
        message: '계정 삭제에 실패했습니다',
      });
    }

    return { success: true };
  }

  async resetPassword(
    email: string,
    redirectTo?: string,
  ): Promise<{ success: boolean }> {
    try {
      await this.gotruePost('/recover', {
        email,
        redirect_to: redirectTo ?? 'booting-mobile://reset-password',
      });
    } catch (err: unknown) {
      this.throwIfUpstreamError(err);
      throw new BadRequestException({
        code: 'reset_password_failed',
        message: (err as { message?: string })?.message ?? 'Password reset failed',
      });
    }

    return { success: true };
  }
}
