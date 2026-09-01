import { BadRequestException, Injectable, Logger } from '@nestjs/common';

import { domainError, ERROR_CODES } from '../common/constants/errors';
import { SupabaseService } from '../supabase/supabase.service';
import { ConsentDto } from './dto/parent-profile.dto';

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
