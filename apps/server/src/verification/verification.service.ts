import { Injectable, Logger } from '@nestjs/common';

import { SupabaseService } from '../supabase/supabase.service';
import {
  SubmitFamilyDocDto,
  SubmitPhoneDto,
  VerificationStatusDto,
} from './dto/verification.dto';

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async getStatus(userId: string): Promise<VerificationStatusDto> {
    const { data } = await this.supabase
      .getClient()
      .from('child_verifications')
      // family_doc_path 는 조회하지 않는다 — 실수로 DTO 에 새는 경로를 원천 차단
      .select('phone, phone_verified_at, family_doc_status, family_verified_at, reject_reason')
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
      .select('phone, phone_verified_at, family_doc_status, family_verified_at, reject_reason')
      .single();

    if (error) throw new Error(error.message);
    return this.toDto(data);
  }

  async submitFamilyDoc(
    userId: string,
    dto: SubmitFamilyDocDto
  ): Promise<VerificationStatusDto> {
    // TODO-05: MVP 는 자동 승인이다. 실제 출시 전 반드시 실심사로 교체해야 한다.
    //          자동 승인이라도 상태 컬럼을 그대로 쓰므로 심사 도입 시 스키마 변경이 없다.
    const now = new Date().toISOString();

    const { data, error } = await this.supabase
      .getClient()
      .from('child_verifications')
      .upsert(
        {
          user_id: userId,
          family_doc_path: dto.storagePath,
          family_doc_status: 'approved',
          family_verified_at: now,
          reject_reason: null,
        },
        { onConflict: 'user_id' }
      )
      .select('phone, phone_verified_at, family_doc_status, family_verified_at, reject_reason')
      .single();

    if (error) throw new Error(error.message);
    return this.toDto(data);
  }

  private toDto(row: Record<string, any> | null): VerificationStatusDto {
    const phoneVerified = !!row?.phone_verified_at;
    const familyDocStatus = row?.family_doc_status ?? 'none';
    const familyVerified = familyDocStatus === 'approved';

    return {
      phoneVerified,
      phoneMasked: row?.phone ? maskPhone(row.phone) : null,
      familyDocStatus,
      familyVerified,
      rejectReason: row?.reject_reason ?? null,
      canCreateProfile: phoneVerified && familyVerified,
    };
  }
}

/** 01012345678 → 010-****-5678 */
function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 9) return '***';
  return `${digits.slice(0, 3)}-****-${digits.slice(-4)}`;
}
