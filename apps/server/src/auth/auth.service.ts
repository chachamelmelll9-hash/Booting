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
  /**
   * 이메일 대신 부를 이름 (소셜 로그인 전용).
   *
   * 카카오는 이메일을 안 줄 수 있다 — 동의항목에 이메일이 없거나 사용자가
   * 선택 동의를 거절하면 `email` 이 빈 문자열이 된다. 그러면 '내 정보' 의
   * 계정 칸이 빈 상자로 남는다. 카카오가 주는 닉네임을 대신 넣어 준다.
   */
  displayName?: string;
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

  /**
   * 이미 신원이 확인된 사용자에게 세션을 발급한다 — 비밀번호 없이.
   *
   * 소셜 연결 로그인이 쓴다. 카카오 쪽에서 "이 사람이 맞다"를 이미 증명받았고
   * (id_token 을 카카오 공개키로 검증했다) 이 계정에 연결해 둔 기록도 있으니,
   * 남은 일은 원래 계정의 세션을 내주는 것뿐이다.
   *
   * GoTrue 에는 "이 유저로 로그인시켜라" 는 관리자 API 가 없다. 대신 매직링크를
   * **발급만** 하고(메일은 나가지 않는다) 그 토큰을 우리가 즉시 검증해 세션으로
   * 바꾼다. 이 경로는 카카오 검증을 통과한 뒤에만 열린다.
   */
  async issueSessionForUser(userId: string): Promise<LoginResponse> {
    const admin = this.supabaseService.getClient();
    const { data: found, error } = await admin.auth.admin.getUserById(userId);
    if (error || !found.user) {
      throw new UnauthorizedException({
        code: 'linked_account_missing',
        message: '연결된 계정을 찾을 수 없습니다',
      });
    }

    const email = found.user.email;
    if (!email) {
      // 이메일 없이 만들어진 계정(소셜 전용)에는 매직링크를 낼 수 없다.
      // 연결은 이메일로 가입한 계정에만 걸리므로 여기 오면 데이터가 어긋난 것이다.
      throw new UnauthorizedException({
        code: 'linked_account_no_email',
        message: '연결된 계정으로 로그인할 수 없습니다',
      });
    }

    let link: { hashed_token?: string };
    let session: {
      access_token: string;
      refresh_token: string;
      expires_at?: number;
      user: { id: string; email?: string };
    };
    try {
      link = await this.gotruePost('/admin/generate_link', { type: 'magiclink', email }, {
        Authorization: `Bearer ${this.serviceRoleKey}`,
      });
      if (!link.hashed_token) throw new Error('generate_link returned no token');

      session = await this.gotruePost('/verify', {
        type: 'magiclink',
        token_hash: link.hashed_token,
      });
    } catch (err: unknown) {
      this.throwIfUpstreamError(err);
      throw new UnauthorizedException({
        code: 'linked_login_failed',
        message: '연결된 계정으로 로그인하지 못했습니다',
      });
    }

    const expiresAt = session.expires_at ?? Math.floor(Date.now() / 1000) + 3600;
    return {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: expiresAt * 1000,
      user: { id: session.user.id, email: session.user.email ?? email },
    };
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
  /**
   * @param fresh 매번 **새 계정**으로 들어간다.
   *
   * 고정 계정(`demo`)에는 부모님 프로필이 이미 등록·공개돼 있어서, 그 버튼으로는
   * 등록 흐름을 지날 수 없다 — 인사 화면이 "다 끝난 사람" 으로 보고 추천 화면으로
   * 건너뛴다. 등록을 처음부터 보려면 아무것도 없는 계정이 있어야 한다.
   *
   * 자녀 인증은 두 경우 모두 통과시킨다. 문자 인증은 개발에서 지날 수 없고,
   * 여기서 보려는 것은 그 뒤의 **부모님 프로필 등록**이다.
   */
  async devLogin(fresh = false): Promise<LoginResponse> {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException({
        code: 'not_available',
        message: '사용할 수 없는 기능입니다',
      });
    }

    const password = process.env.DEV_LOGIN_PASSWORD || 'BootingDemo123!';
    const email = fresh
      ? `dev.${Date.now().toString(36)}@seed.booting.app`
      : process.env.DEV_LOGIN_EMAIL || 'demo@seed.booting.app';
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

    const user = (await res.json()) as {
      id: string;
      email?: string;
      user_metadata?: {
        email?: string;
        // 카카오는 닉네임을 provider 마다 다른 키로 넣는다. 실측(카카오)에서는
        // name 과 preferred_username 둘 다 닉네임이었다.
        name?: string;
        preferred_username?: string;
        full_name?: string;
      };
    };

    const email = user.email ?? user.user_metadata?.email ?? '';
    const displayName =
      user.user_metadata?.name ??
      user.user_metadata?.full_name ??
      user.user_metadata?.preferred_username;

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
        ...(displayName ? { displayName } : {}),
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
