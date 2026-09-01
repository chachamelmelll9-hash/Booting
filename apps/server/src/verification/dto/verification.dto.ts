import { IsString, Matches, MinLength } from 'class-validator';

import { FamilyDocStatus } from '../../common/types';

export class SubmitPhoneDto {
  @Matches(/^01[016789]\d{7,8}$/, {
    message: '휴대폰 번호 형식이 올바르지 않습니다',
  })
  phone!: string;

  @Matches(/^\d{6}$/, { message: '인증번호 6자리를 입력해주세요' })
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
