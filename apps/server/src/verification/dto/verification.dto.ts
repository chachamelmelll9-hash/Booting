import { Matches } from 'class-validator';

/**
 * TODO-04: 실 SMS 인증이 붙기 전까지의 **개발 스텁**이다.
 *
 * 숫자이기만 하면 통과시킨다 — 에뮬레이터·테스트에서 실제 문자를 받을 수 없어
 * 엄격한 형식 검사가 등록 동선을 통째로 막기 때문이다.
 * 실 연동 시 아래 두 줄을 원래 형식으로 되돌린다:
 *   phone  /^01[016789]\d{7,8}$/
 *   token  /^\d{6}$/
 */
export class SubmitPhoneDto {
  @Matches(/^\d{4,15}$/, {
    message: '휴대폰 번호는 숫자로 입력해주세요',
  })
  phone!: string;

  @Matches(/^\d{1,10}$/, { message: '인증번호는 숫자로 입력해주세요' })
  token!: string;
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
