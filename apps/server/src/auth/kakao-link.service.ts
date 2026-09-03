import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify } from 'jose';

import { SupabaseService } from '../supabase/supabase.service';
import { AuthService, LoginResponse } from './auth.service';

const KAKAO_ISSUER = 'https://kauth.kakao.com';
const PROVIDER = 'kakao';

export interface KakaoResolveResult {
  /** 연결된 계정이 있어 그 계정으로 로그인했다 */
  linked: boolean;
  session?: LoginResponse;
}

/**
 * 카카오 계정 연결.
 *
 * 왜 우리가 직접 검증하나: Supabase 는 이메일이 같을 때만 소셜 신원을 기존
 * 계정에 붙여 준다. 카카오는 이메일을 주지 않는다 — 동의항목이 비즈니스 앱
 * (사업자등록) 전용이라 열 수 없다. 그래서 이메일로 가입한 사람이 카카오로
 * 들어오면 계정이 하나 더 생긴다.
 *
 * 카카오가 **항상** 주는 값은 id_token 의 `sub`(회원번호)다. 그걸 우리가 직접
 * 검증해서 계정에 이어 둔다. 검증을 카카오 공개키(JWKS)로 하는 이유는 분명하다 —
 * 이 토큰만 있으면 그 계정으로 로그인이 되므로, 앱이 보내 준 값을 그대로 믿으면
 * 아무 `sub` 나 적어 남의 계정을 여는 통로가 된다.
 */
@Injectable()
export class KakaoLinkService {
  private readonly logger = new Logger(KakaoLinkService.name);

  /** 카카오 공개키. jose 가 알아서 캐시하고 만료되면 다시 받아 온다 */
  private readonly jwks = createRemoteJWKSet(new URL(`${KAKAO_ISSUER}/.well-known/jwks.json`));

  constructor(
    private readonly supabase: SupabaseService,
    private readonly auth: AuthService
  ) {}

  /**
   * id_token 의 `aud` 는 요청에 쓴 앱 키다 (안드로이드 네이티브 SDK 는 네이티브 앱 키).
   * 이 값을 검사하지 않으면 다른 앱에서 발급된 카카오 토큰으로도 로그인이 된다.
   */
  private audience(): string {
    const key = process.env.KAKAO_NATIVE_APP_KEY;
    if (!key) {
      this.logger.error('KAKAO_NATIVE_APP_KEY 가 없어 카카오 연결을 쓸 수 없다');
      throw new BadRequestException({
        code: 'kakao_not_configured',
        message: '카카오 연결이 설정되지 않았습니다',
      });
    }
    return key;
  }

  /** 카카오 공개키로 검증하고 회원번호·닉네임을 꺼낸다 */
  private async verify(idToken: string): Promise<{ uid: string; nickname?: string }> {
    try {
      const { payload } = await jwtVerify(idToken, this.jwks, {
        issuer: KAKAO_ISSUER,
        audience: this.audience(),
      });
      const uid = typeof payload.sub === 'string' ? payload.sub : '';
      if (!uid) throw new Error('no sub');
      const nickname = typeof payload.nickname === 'string' ? payload.nickname : undefined;
      return { uid, nickname };
    } catch (error) {
      this.logger.warn(`kakao id_token 검증 실패: ${String(error)}`);
      throw new UnauthorizedException({
        code: 'invalid_kakao_token',
        message: '카카오 인증에 실패했습니다',
      });
    }
  }

  private async findUserId(uid: string): Promise<string | null> {
    const { data } = await this.supabase
      .getClient()
      .from('social_identities')
      .select('user_id')
      .eq('provider', PROVIDER)
      .eq('provider_uid', uid)
      .maybeSingle();
    return data?.user_id ?? null;
  }

  /**
   * 카카오로 로그인할 때 가장 먼저 묻는 자리.
   *
   * 연결해 둔 계정이 있으면 그 계정의 세션을 내준다. 없으면 `linked: false` 만
   * 돌려주고 앱이 하던 대로(Supabase 카카오 provider) 진행한다 — 연결을 안 해 둔
   * 사람의 로그인을 막을 이유는 없다.
   */
  async resolve(idToken: string): Promise<KakaoResolveResult> {
    const { uid } = await this.verify(idToken);
    const userId = await this.findUserId(uid);
    if (!userId) return { linked: false };

    return { linked: true, session: await this.auth.issueSessionForUser(userId) };
  }

  /** 로그인한 사람이 자기 계정에 카카오를 붙인다 */
  async link(userId: string, idToken: string): Promise<{ linked: true }> {
    const { uid } = await this.verify(idToken);

    const owner = await this.findUserId(uid);
    if (owner && owner !== userId) {
      // 이 카카오는 다른 부팅 계정이 이미 쓰고 있다. 말없이 옮기면 저쪽 사람이
      // 어느 날 카카오로 로그인했다가 남의 계정을 보게 된다.
      throw new ConflictException({
        code: 'kakao_already_linked',
        message: '이 카카오 계정은 다른 계정에 연결되어 있습니다',
      });
    }
    if (owner === userId) return { linked: true };

    const { error } = await this.supabase
      .getClient()
      .from('social_identities')
      .insert({ provider: PROVIDER, provider_uid: uid, user_id: userId });

    if (error) {
      // 한 계정에 카카오는 하나만 (social_identities_one_per_provider)
      if (error.code === '23505') {
        throw new ConflictException({
          code: 'kakao_link_exists',
          message: '이미 다른 카카오 계정이 연결되어 있습니다',
        });
      }
      throw new BadRequestException({ code: 'kakao_link_failed', message: error.message });
    }
    return { linked: true };
  }

  async unlink(userId: string): Promise<{ linked: false }> {
    await this.supabase
      .getClient()
      .from('social_identities')
      .delete()
      .eq('provider', PROVIDER)
      .eq('user_id', userId);
    return { linked: false };
  }

  async status(userId: string): Promise<{ linked: boolean; linkedAt: string | null }> {
    const { data } = await this.supabase
      .getClient()
      .from('social_identities')
      .select('linked_at')
      .eq('provider', PROVIDER)
      .eq('user_id', userId)
      .maybeSingle();
    return { linked: !!data, linkedAt: data?.linked_at ?? null };
  }
}
