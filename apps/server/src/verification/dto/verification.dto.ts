import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

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

/**
 * 가족관계증명서 제출.
 *
 * 앱이 비공개 버킷(`family-docs/{userId}/…`)에 먼저 올리고 경로만 보낸다 —
 * 사진 바이트가 API 서버를 지날 이유가 없다 (프로필 사진과 같은 규칙).
 */
export class SubmitFamilyDocDto {
  @IsString()
  @MinLength(1)
  storagePath!: string;

  /** 증명서 '본인' 란과 맞춰 볼 자녀 본인 성함 */
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  childName!: string;
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
 * 가족관계증명서는 2026-09-04 에 뺐다가 09-18 에 되살렸다 — **올리면 통과,
 * 적발되면 제한**. 사람이 보는 심사는 없고, 증명서는 비공개 버킷에 보관해
 * 신고 시 운영자가 확인한다. 서버에 Claude 키가 있으면 대조까지 한다 (선택).
 */
export interface VerificationStatusDto {
  phoneVerified: boolean;
  /** 가족관계 자동 심사 결과 — approved 라야 프로필을 제출할 수 있다 */
  familyDocStatus: 'none' | 'pending' | 'approved' | 'rejected';
  /** rejected 일 때 무엇이 안 맞았는지 — 사용자가 읽고 다시 찍을 수 있는 말 */
  familyDocRejectReason: string | null;
  /** 증명서 제출을 받을 수 있는가 — 지금은 항상 true (AI 대조는 켜져 있을 때만 얹힌다) */
  familyDocAvailable: boolean;
  /**
   * 카카오 계정이 붙어 있는가.
   *
   * 카카오 계정 하나는 부팅 계정 하나에만 붙으므로(social_identities 기본키),
   * 이 연결이 "한 사람이 계정을 몇 개든 만들 수는 없다" 를 담보한다.
   * 전화번호·실명까지 받아오지는 못한다 — 그 동의항목은 비즈니스 앱 전용이다.
   */
  kakaoLinked: boolean;
  /**
   * 문자 인증을 지금 쓸 수 있는가 (문자 사업자가 꽂혀 있는가).
   *
   * 화면은 이 값으로 휴대폰 항목을 보일지 정한다. 못 보내는 동안 버튼을 두면
   * 눌러도 에러만 나는 길이 하나 생긴다 — 사업자가 붙는 순간 이 값이 true 가
   * 되면서 화면이 저절로 살아난다 (앱을 고칠 필요가 없다).
   */
  phoneAvailable: boolean;
  /** 마스킹된 번호 (010-****-1234) */
  phoneMasked: string | null;
  /** 확인이 끝나 프로필을 만들 수 있는 상태인가 (문자 인증 **또는** 카카오 연결) */
  canCreateProfile: boolean;
}
