import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, JWTPayload,jwtVerify } from 'jose';

import {
  AUTH_ERROR_CODES,
  AUTH_ERROR_MESSAGES,
} from './constants/auth-errors';

export interface SupabaseJwtPayload extends JWTPayload {
  sub: string;
  email?: string;
  role?: string;
}

@Injectable()
export class AuthGuard implements CanActivate {
  private jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

  constructor(private readonly configService: ConfigService) {}

  private getJwks() {
    if (!this.jwks) {
      const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
      this.jwks = createRemoteJWKSet(
        new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`)
      );
    }
    return this.jwks;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        code: AUTH_ERROR_CODES.TOKEN_INVALID,
        message: AUTH_ERROR_MESSAGES.token_invalid,
      });
    }

    const token = authHeader.substring(7);
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');

    try {
      const { payload } = await jwtVerify(token, this.getJwks(), {
        issuer: `${supabaseUrl}/auth/v1`,
      });

      const jwtPayload = payload as SupabaseJwtPayload;

      request.user = {
        id: jwtPayload.sub,
        email: jwtPayload.email,
        role: jwtPayload.role,
      };

      return true;
    } catch (error: unknown) {
      // JWT 만료
      if (
        error instanceof Error &&
        'code' in error &&
        error.code === 'ERR_JWT_EXPIRED'
      ) {
        throw new UnauthorizedException({
          code: AUTH_ERROR_CODES.TOKEN_EXPIRED,
          message: AUTH_ERROR_MESSAGES.token_expired,
        });
      }

      // 기타 JWT 오류 (서명 오류, 형식 오류 등)
      throw new UnauthorizedException({
        code: AUTH_ERROR_CODES.TOKEN_INVALID,
        message: AUTH_ERROR_MESSAGES.token_invalid,
      });
    }
  }
}
