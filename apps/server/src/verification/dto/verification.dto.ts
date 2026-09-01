import { IsString, Matches, MinLength } from 'class-validator';

import { FamilyDocStatus } from '../../common/types';

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

export class SubmitFamilyDocDto {
  /** family-docs 비공개 버킷의 오브젝트 경로. 원문은 어떤 응답에도 실리지 않는다. */
  @IsString()
  @MinLength(1)
  storagePath!: string;
}

/**
 * 인증 상태. `family_doc_path` 는 **의도적으로 빠져 있다** —
 * 가족관계증명서 원문 경로는 자녀 본인에게도 API 로 돌려주지 않는다 (PRD 비공개 규칙).
 */
export interface VerificationStatusDto {
  phoneVerified: boolean;
  /** 마스킹된 번호 (010-****-1234) */
  phoneMasked: string | null;
  familyDocStatus: FamilyDocStatus;
  familyVerified: boolean;
  rejectReason: string | null;
  /** 두 인증이 모두 끝나 프로필을 만들 수 있는 상태인가 */
  canCreateProfile: boolean;
}
