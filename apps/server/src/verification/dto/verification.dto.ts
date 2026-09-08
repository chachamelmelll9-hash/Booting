import { Matches } from 'class-validator';

/**
 * 휴대폰 번호.
 *
 * 하이픈 없이 숫자만 받는다 — 화면이 숫자 자판을 띄우고, 서버도 저장 전에
 * 숫자만 남긴다. 형식을 느슨하게 두면(예전 `\d{4,15}`) 아무 숫자나 '인증된
 * 번호' 로 남아, 정작 그 번호로 연락할 수 없다.
 */
const KR_MOBILE = /^01[016789]\d{7,8}$/;

export class RequestPhoneCodeDto {
  @Matches(KR_MOBILE, { message: '휴대폰 번호를 확인해주세요 (예: 01012345678)' })
  phone!: string;
}

export class SubmitPhoneDto {
  @Matches(KR_MOBILE, { message: '휴대폰 번호를 확인해주세요 (예: 01012345678)' })
  phone!: string;

  /** 발송한 인증번호는 항상 여섯 자리다 */
  @Matches(/^\d{6}$/, { message: '인증번호 여섯 자리를 입력해주세요' })
  token!: string;
}

/** 인증번호를 보냈다 — 언제 다시 보낼 수 있는지까지 알려준다 */
export interface PhoneCodeSentDto {
  /** 재발송이 가능해지기까지 남은 초 */
  resendAfterSec: number;
  /** 입력 제한 시간(초) — 화면의 남은 시간 표시에 쓴다 */
  expiresInSec: number;
}

/**
 * 인증 상태.
 *
 * 가족관계증명서는 더 이상 받지 않는다 — 남의 부모님을 막는 실제 장치는
 * **부모님 본인의 동의**이고, 증명서는 그 위에 서류 한 장을 더 얹어 등록하려는
 * 자녀 모두를 주민센터로 보냈다. 컬럼은 남겨 두되(과거 기록) 읽지 않는다.
 */
export interface VerificationStatusDto {
  phoneVerified: boolean;
  /** 마스킹된 번호 (010-****-1234) */
  phoneMasked: string | null;
  /** 본인인증이 끝나 프로필을 만들 수 있는 상태인가 */
  canCreateProfile: boolean;
}
