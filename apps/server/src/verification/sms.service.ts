import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

/**
 * 인증 문자 발송.
 *
 * 실제 발송은 사업자(NICE·다날·알리고·Twilio…) 계약과 키가 있어야 한다. 그 키가
 * 없을 때 **어떻게 행동하는가**가 이 파일의 핵심이다.
 *
 *   개발  — 보내지 않고 인증번호를 로그에 찍는다. 에뮬레이터에서는 실제 문자를
 *          받을 수 없고, 그렇다고 등록 동선을 막으면 그 뒤를 아예 못 본다.
 *   운영  — **던진다.** 조용히 통과시키면 "본인확인을 했다"고 말하면서 아무도
 *          확인하지 않는 상태로 서비스가 열린다. 그건 기능이 없는 것보다 나쁘다 —
 *          사용자와 스토어에 하지 않는 일을 한다고 말하는 것이기 때문이다.
 *
 * 사업자가 정해지면 `send()` 안에 한 갈래만 더하면 된다. 나머지(발급·해시·만료·
 * 시도 제한·재발송 간격)는 이미 서버가 하고 있어 바뀌지 않는다.
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  /** 사업자 키가 꽂혀 있는가 */
  get configured(): boolean {
    return !!process.env.SMS_PROVIDER;
  }

  async send(phone: string, text: string): Promise<void> {
    if (this.configured) {
      // 사업자별 발송은 여기서 갈린다. 아직 고르지 않았다.
      throw new ServiceUnavailableException({
        code: 'sms_provider_unimplemented',
        message: `문자 사업자 '${process.env.SMS_PROVIDER}' 연동이 아직 없습니다`,
      });
    }

    if (process.env.NODE_ENV === 'production') {
      this.logger.error('SMS_PROVIDER 가 없어 본인인증 문자를 보낼 수 없다');
      throw new ServiceUnavailableException({
        code: 'sms_not_configured',
        message: '본인인증을 준비 중입니다. 잠시 후 다시 시도해주세요.',
      });
    }

    // 개발 — 받는 사람이 없으니 콘솔이 곧 수신함이다
    this.logger.warn(`[개발] 문자 발송 생략 — ${maskPhone(phone)} 로 보낼 내용: ${text}`);
  }
}

/** 010-****-5678 — 로그에 번호를 통째로 남기지 않는다 */
function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 8) return '***';
  return `${digits.slice(0, 3)}-****-${digits.slice(-4)}`;
}
