import { randomBytes } from 'node:crypto';

import { BadRequestException, Injectable, Logger } from '@nestjs/common';

import { domainError, ERROR_CODES } from '../common/constants/errors';
import { SupabaseService } from '../supabase/supabase.service';
import { CONSENT_VERSION } from './consent-document';
import { ConsentDto } from './dto/parent-profile.dto';

/**
 * 동의 링크 유효 기간.
 *
 * 무기한이면 유출된 링크가 언제까지고 쓰인다. 반대로 너무 짧으면 부모님이
 * 카카오톡을 하루 뒤에 보시고 못 누르신다 — 사흘이면 두 쪽 다 무리가 없다.
 */
const CONSENT_LINK_TTL_MS = 3 * 24 * 60 * 60 * 1000;

@Injectable()
export class ConsentService {
  private readonly logger = new Logger(ConsentService.name);

  constructor(private readonly supabase: SupabaseService) {}

  /** 유효한 동의(철회되지 않은 것) 한 건 */
  async getActive(parentProfileId: string) {
    const { data } = await this.supabase
      .getClient()
      .from('parent_consents')
      .select('*')
      .eq('parent_profile_id', parentProfileId)
      .is('revoked_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return data ?? null;
  }

  async hasConsent(parentProfileId: string): Promise<boolean> {
    const consent = await this.getActive(parentProfileId);
    return !!consent?.consented_at;
  }

  async request(parentProfileId: string, dto: ConsentDto) {
    const existing = await this.getActive(parentProfileId);
    if (existing?.consented_at) {
      throw new BadRequestException(domainError(ERROR_CODES.CONSENT_ALREADY_GIVEN));
    }
    if (dto.method === 'sms' && !dto.phone) {
      throw new BadRequestException(
        domainError(ERROR_CODES.CONSENT_REQUIRED, '부모님 휴대폰 번호를 입력해주세요')
      );
    }

    const now = new Date().toISOString();

    // TODO-04: 실제 SMS 발송·응답 대조가 붙기 전까지는 두 방식 모두 즉시 동의로 기록한다.
    //          연동 시 sms 는 sent_at 만 남기고 consented_at 은 콜백에서 채우게 바꾼다.
    //          `consented_at` 컬럼과 상태 판정 로직은 그대로 쓰므로 교체 범위가 작다.
    if (dto.method === 'sms') {
      this.logger.warn(
        `SMS consent stubbed — no message actually sent (profile ${parentProfileId})`
      );
    }

    const { data, error } = await this.supabase
      .getClient()
      .from('parent_consents')
      .insert({
        parent_profile_id: parentProfileId,
        method: dto.method,
        parent_name: dto.parentName,
        phone: dto.phone ?? null,
        sent_at: dto.method === 'sms' ? now : null,
        consented_at: now,
      })
      .select('*')
      .single();

    if (error) throw new BadRequestException({ code: 'consent_failed', message: error.message });
    return data;
  }

  /**
   * 부모님께 보낼 동의 링크를 만든다.
   *
   * 아직 동의가 아니다 — `consented_at` 은 비워 두고, 부모님이 그 페이지에서
   * 직접 누르셨을 때만 채운다. 자녀가 대신 눌러 주는 경로는 없다.
   *
   * 다시 요청하면 앞의 미완료 건을 버리고 새로 만든다. 링크가 여러 개 살아
   * 있으면 어느 것이 유효한지 아무도 모른다.
   */
  async createLink(parentProfileId: string, dto: ConsentDto) {
    const existing = await this.getActive(parentProfileId);
    if (existing?.consented_at) {
      throw new BadRequestException(domainError(ERROR_CODES.CONSENT_ALREADY_GIVEN));
    }

    const client = this.supabase.getClient();
    if (existing) {
      await client.from('parent_consents').delete().eq('id', existing.id);
    }

    const now = new Date();
    const { data, error } = await client
      .from('parent_consents')
      .insert({
        parent_profile_id: parentProfileId,
        method: 'link',
        parent_name: dto.parentName,
        phone: dto.phone ?? null,
        // 부모님께는 계정이 없다. 이 토큰이 곧 신원이라 추측 불가능해야 한다
        token: randomBytes(32).toString('base64url'),
        sent_at: now.toISOString(),
        expires_at: new Date(now.getTime() + CONSENT_LINK_TTL_MS).toISOString(),
        consent_version: CONSENT_VERSION,
      })
      .select('*')
      .single();

    if (error) throw new BadRequestException({ code: 'consent_failed', message: error.message });
    return data;
  }

  async findByToken(token: string) {
    if (!token) return null;
    const { data } = await this.supabase
      .getClient()
      .from('parent_consents')
      .select('*')
      .eq('token', token)
      .maybeSingle();
    return data ?? null;
  }

  /**
   * 부모님이 동의 페이지에서 누르셨다.
   *
   * 이미 동의했거나 만료됐으면 아무것도 하지 않는다 — 만료된 링크로 뒤늦게
   * 동의가 찍히면 그 기록이 무엇을 증명하는지 알 수 없어진다.
   */
  async agreeByToken(
    token: string,
    evidence: { ip?: string; userAgent?: string }
  ): Promise<boolean> {
    const found = await this.findByToken(token);
    if (!found || found.revoked_at || found.consented_at) return false;
    if (found.expires_at && new Date(found.expires_at) < new Date()) return false;

    const { error } = await this.supabase
      .getClient()
      .from('parent_consents')
      .update({
        consented_at: new Date().toISOString(),
        agreed_ip: evidence.ip ?? null,
        agreed_user_agent: evidence.userAgent?.slice(0, 500) ?? null,
        consent_version: CONSENT_VERSION,
      })
      .eq('id', found.id)
      // 두 번 눌러도 첫 기록을 덮지 않는다
      .is('consented_at', null);

    if (error) {
      this.logger.warn(`consent agree failed: ${error.message}`);
      return false;
    }
    return true;
  }

  /**
   * 동의 철회. 프로필은 즉시 비공개로 내려간다 —
   * 동의 없이 공개 상태로 남아 있는 순간이 없어야 한다.
   */
  async revoke(parentProfileId: string) {
    const client = this.supabase.getClient();
    const now = new Date().toISOString();

    await client
      .from('parent_consents')
      .update({ revoked_at: now })
      .eq('parent_profile_id', parentProfileId)
      .is('revoked_at', null);

    await client
      .from('parent_profiles')
      .update({ status: 'hidden', published_at: null })
      .eq('id', parentProfileId);
  }
}
