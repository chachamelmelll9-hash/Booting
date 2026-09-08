import { createHash, randomInt, timingSafeEqual } from 'node:crypto';

import { BadRequestException, Injectable, Logger } from '@nestjs/common';

import { SupabaseService } from '../supabase/supabase.service';
import {
  PhoneCodeSentDto,
  RequestPhoneCodeDto,
  SubmitPhoneDto,
  VerificationStatusDto,
} from './dto/verification.dto';
import { SmsService } from './sms.service';

/** 입력 제한 시간. 짧으면 어르신 곁에서 대신 넣어드리는 경우에 촉박하고, 길면 문자를 주운 사람에게 시간을 준다 */
const CODE_TTL_MS = 3 * 60 * 1000;
/** 재발송 간격 — 문자는 건당 비용이고, 남의 번호로 문자 폭탄을 보내는 통로가 되면 안 된다 */
const RESEND_COOLDOWN_MS = 60 * 1000;
/** 한 번호에 허용하는 시도 — 여섯 자리는 100만 가지라 다섯 번이면 사실상 못 맞힌다 */
const MAX_ATTEMPTS = 5;

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly sms: SmsService
  ) {}

  async getStatus(userId: string): Promise<VerificationStatusDto> {
    const client = this.supabase.getClient();

    const [{ data }, kakaoLinked] = await Promise.all([
      client
        .from('child_verifications')
        // 가족관계 컬럼은 더 이상 읽지 않는다 (과거 기록으로만 남는다)
        .select('phone, phone_verified_at')
        .eq('user_id', userId)
        .maybeSingle(),
      this.kakaoLinked(userId),
    ]);

    return this.toDto(data, kakaoLinked);
  }

  /**
   * 카카오 계정이 붙어 있는가.
   *
   * `social_identities` 의 기본키가 (provider, provider_uid) 라 **카카오 계정
   * 하나는 부팅 계정 하나에만** 붙는다. 그래서 이 연결 자체가 "계정을 몇 개든
   * 만들 수는 없다" 를 담보한다 — 지금 본인확인에 남은 일이 그것이다.
   *
   * 전화번호까지 받아오지는 못한다. 카카오의 `phone_number` 동의항목은 비즈니스
   * 앱 전환(사업자등록번호)이 있어야 열린다. 그래서 이 확인은 '실명확인' 이
   * 아니고, 화면 문구도 그렇게 말하지 않는다.
   */
  private async kakaoLinked(userId: string): Promise<boolean> {
    const { data } = await this.supabase
      .getClient()
      .from('social_identities')
      .select('user_id')
      .eq('provider', 'kakao')
      .eq('user_id', userId)
      .maybeSingle();
    return !!data;
  }

  /**
   * 인증번호 발송.
   *
   * 이미 인증을 마친 분께는 다시 보내지 않는다 — 인증은 한 번이면 되고, 다시
   * 열어 두면 번호만 바꿔 가며 계정을 늘리는 통로가 된다.
   */
  async requestCode(userId: string, dto: RequestPhoneCodeDto): Promise<PhoneCodeSentDto> {
    const client = this.supabase.getClient();
    const phone = normalize(dto.phone);

    const { data: row } = await client
      .from('child_verifications')
      .select('phone, phone_verified_at, code_sent_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (row?.phone_verified_at) {
      throw new BadRequestException({
        code: 'phone_already_verified',
        message: '이미 본인인증이 완료되었습니다',
      });
    }

    // 다른 사람이 이미 인증한 번호인지 먼저 본다. 인덱스가 막아 주기는 하지만,
    // 그 시점에는 문자를 이미 보낸 뒤라 비용도 나가고 남의 폰도 울린다.
    const { data: taken } = await client
      .from('child_verifications')
      .select('user_id')
      .eq('phone', phone)
      .not('phone_verified_at', 'is', null)
      .maybeSingle();
    if (taken && taken.user_id !== userId) {
      throw new BadRequestException({
        code: 'phone_taken',
        message: '이미 다른 계정에서 인증된 번호입니다',
      });
    }

    const waited = row?.code_sent_at ? Date.now() - Date.parse(row.code_sent_at as string) : null;
    if (waited !== null && waited < RESEND_COOLDOWN_MS) {
      throw new BadRequestException({
        code: 'resend_too_soon',
        message: `잠시 후 다시 시도해주세요 (${Math.ceil((RESEND_COOLDOWN_MS - waited) / 1000)}초)`,
      });
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const now = new Date();

    const { error } = await client.from('child_verifications').upsert(
      {
        user_id: userId,
        phone,
        code_hash: hash(code),
        code_expires_at: new Date(now.getTime() + CODE_TTL_MS).toISOString(),
        code_attempts: 0,
        code_sent_at: now.toISOString(),
        updated_at: now.toISOString(),
      },
      { onConflict: 'user_id' }
    );
    if (error) throw new BadRequestException({ code: 'code_issue_failed', message: error.message });

    // 발송이 실패하면 여기서 던진다 — 성공했다고 알려 놓고 문자가 안 오면
    // 사용자는 오지 않는 문자를 계속 기다린다
    await this.sms.send(phone, `[부팅] 인증번호 ${code} (3분 안에 입력해주세요)`);

    return {
      resendAfterSec: Math.ceil(RESEND_COOLDOWN_MS / 1000),
      expiresInSec: Math.ceil(CODE_TTL_MS / 1000),
    };
  }

  /**
   * 인증번호 확인.
   *
   * 틀린 이유를 잘게 알려주지 않는다 (만료인지 오타인지). 나눠서 알려주면 남의
   * 번호에 대고 유효한 코드가 살아 있는지를 셀 수 있다.
   */
  async submitPhone(userId: string, dto: SubmitPhoneDto): Promise<VerificationStatusDto> {
    const client = this.supabase.getClient();
    const phone = normalize(dto.phone);

    const { data: row } = await client
      .from('child_verifications')
      .select('phone, phone_verified_at, code_hash, code_expires_at, code_attempts')
      .eq('user_id', userId)
      .maybeSingle();

    if (row?.phone_verified_at) return this.toDto(row);

    const invalid = () =>
      new BadRequestException({
        code: 'phone_code_invalid',
        message: '인증번호가 맞지 않습니다. 다시 확인해주세요.',
      });

    if (!row?.code_hash || !row.code_expires_at) throw invalid();
    if (row.phone !== phone) throw invalid();
    if (Date.parse(row.code_expires_at as string) < Date.now()) throw invalid();

    const attempts = (row.code_attempts as number) ?? 0;
    if (attempts >= MAX_ATTEMPTS) {
      throw new BadRequestException({
        code: 'phone_code_attempts',
        message: '시도 횟수를 넘었습니다. 인증번호를 다시 받아주세요.',
      });
    }

    if (!equals(hash(dto.token), row.code_hash as string)) {
      await client
        .from('child_verifications')
        .update({ code_attempts: attempts + 1 })
        .eq('user_id', userId);
      throw invalid();
    }

    // 통과 — 코드는 즉시 버린다. 남겨 두면 같은 코드로 다시 쓸 수 있다.
    const { data, error } = await client
      .from('child_verifications')
      .update({
        phone_verified_at: new Date().toISOString(),
        code_hash: null,
        code_expires_at: null,
        code_attempts: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select('phone, phone_verified_at')
      .single();

    if (error) throw new BadRequestException({ code: 'phone_verify_failed', message: error.message });
    this.logger.log(`phone verified for ${userId}`);
    return this.toDto(data);
  }

  /**
   * @param kakaoLinked 확인하지 않았으면 undefined — 그때는 이 값으로 문을 열지 않는다.
   *   (인증 직후처럼 방금 갱신한 행만 들고 있는 경우다. 화면은 곧 status 를 다시 묻는다.)
   */
  private toDto(
    row: Record<string, unknown> | null,
    kakaoLinked = false
  ): VerificationStatusDto {
    const phoneVerified = !!row?.phone_verified_at;

    return {
      phoneVerified,
      kakaoLinked,
      phoneMasked: row?.phone ? maskPhone(row.phone as string) : null,
      /**
       * 둘 중 **하나만** 되면 연다.
       *
       * 지금 실제로 열리는 문은 카카오 쪽이다 — 문자 발송은 사업자 계약이 있어야
       * 하고, 그때까지 운영에서는 SmsService 가 막는다. 그렇다고 문자 경로를
       * 지우지는 않는다. 계약이 붙는 순간 이 줄을 고치지 않고도 살아난다.
       */
      canCreateProfile: phoneVerified || kakaoLinked,
    };
  }
}

/** 하이픈·공백을 걷어낸 숫자만 남긴다 — 010-1234-5678 과 01012345678 이 다른 번호가 되면 안 된다 */
function normalize(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * 인증번호 해시.
 *
 * 여섯 자리는 경우의 수가 100만뿐이라 소금 없는 해시는 표로 다 뒤집힌다.
 * 서버 비밀을 섞어, DB 만 읽은 사람은 되돌리지 못하게 한다.
 */
function hash(code: string): string {
  const secret = process.env.SUPABASE_SECRET_KEY ?? 'booting-dev-code-secret';
  return createHash('sha256').update(`${secret}:${code}`).digest('base64url');
}

/** 길이가 다르면 timingSafeEqual 이 던진다 */
function equals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/** 01012345678 → 010-****-5678 */
function maskPhone(phone: string): string {
  const digits = normalize(phone);
  if (digits.length < 8) return '***';
  return `${digits.slice(0, 3)}-****-${digits.slice(-4)}`;
}
