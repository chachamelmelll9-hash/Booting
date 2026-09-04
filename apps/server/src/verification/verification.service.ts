import { Injectable, Logger } from '@nestjs/common';

import { SupabaseService } from '../supabase/supabase.service';
import { SubmitPhoneDto, VerificationStatusDto } from './dto/verification.dto';

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async getStatus(userId: string): Promise<VerificationStatusDto> {
    const { data } = await this.supabase
      .getClient()
      .from('child_verifications')
      // 가족관계 컬럼은 더 이상 읽지 않는다 (과거 기록으로만 남는다)
      .select('phone, phone_verified_at')
      .eq('user_id', userId)
      .maybeSingle();

    return this.toDto(data);
  }

  async submitPhone(
    userId: string,
    dto: SubmitPhoneDto
  ): Promise<VerificationStatusDto> {
    // TODO-04: 실 SMS 인증 연동 전까지는 6자리 숫자면 통과시킨다.
    //          상태 기계는 그대로 두므로 발송·대조만 갈아끼우면 된다.
    this.logger.log(`phone verification accepted (dev stub) for ${userId}`);

    const { data, error } = await this.supabase
      .getClient()
      .from('child_verifications')
      .upsert(
        {
          user_id: userId,
          phone: dto.phone,
          phone_verified_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .select('phone, phone_verified_at')
      .single();

    if (error) throw new Error(error.message);
    return this.toDto(data);
  }

  private toDto(row: Record<string, any> | null): VerificationStatusDto {
    const phoneVerified = !!row?.phone_verified_at;

    return {
      phoneVerified,
      phoneMasked: row?.phone ? maskPhone(row.phone) : null,
      canCreateProfile: phoneVerified,
    };
  }
}

/** 01012345678 → 010-****-5678 */
function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 9) return '***';
  return `${digits.slice(0, 3)}-****-${digits.slice(-4)}`;
}
