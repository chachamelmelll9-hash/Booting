import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

import type {
  ConsentMethod,
  MaritalStatus,
  ProfileStatus,
  RelationshipGoal,
} from '../../common/types';
import { RELATIONSHIP_GOALS } from '../../common/types';

export class CreateParentProfileDto {
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  displayName!: string;

  @IsIn(['male', 'female'])
  gender!: 'male' | 'female';

  @IsDateString()
  birthDate!: string;

  @IsString()
  regionCode!: string;

  @Type(() => String)
  @IsIn(['bereaved', 'divorced'], {
    message: '사별 또는 이혼 상태만 등록할 수 있습니다',
  })
  maritalStatus!: MaritalStatus;

  @IsOptional()
  @IsDateString()
  maritalSince?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2)
  @Type(() => String)
  @IsIn(RELATIONSHIP_GOALS, { each: true })
  goals!: RelationshipGoal[];
}

// UpdateParentProfileDto 보다 먼저 선언해야 한다 — @Type(() => SajuInput) 의
// emitDecoratorMetadata 가 클래스 참조를 모듈 평가 시점에 읽기 때문이다 (TDZ).
export class SajuInput {
  @IsDateString() birthDate!: string;
  @IsIn(['solar', 'lunar']) calendarType!: 'solar' | 'lunar';
  @IsOptional() @Matches(/^\d{2}:\d{2}$/) birthTime?: string;
  @IsBoolean() birthTimeUnknown!: boolean;
  @IsBoolean() isPublic!: boolean;
}

export class UpdateParentProfileDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(20) displayName?: string;
  @IsOptional() @IsString() regionCode?: string;
  @IsOptional() @IsDateString() maritalSince?: string;

  /** 키(cm). 사람 키로 가능한 범위만 받는다 — DB CHECK 와 같은 범위다 */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(120)
  @Max(220)
  heightCm?: number;

  @IsOptional() @IsString() @MaxLength(20) childrenCount?: string;
  @IsOptional() @IsString() @MaxLength(50) livingWith?: string;
  @IsOptional() @IsString() @MaxLength(30) religion?: string;
  @IsOptional() @IsString() @MaxLength(50) occupation?: string;
  @IsOptional() @IsString() @MaxLength(50) retiredOccupation?: string;
  @IsOptional() @IsBoolean() economicallyActive?: boolean;
  @IsOptional() @IsString() @MaxLength(20) drinking?: string;
  @IsOptional() @IsString() @MaxLength(20) smoking?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  hobbies?: string[];

  @IsOptional() @IsString() @MaxLength(60) motto?: string;
  @IsOptional() @IsString() @MaxLength(1000) introByChild?: string;
  @IsOptional() @IsString() @MaxLength(500) desiredPartner?: string;
  @IsOptional() @IsString() @MaxLength(500) parentMessage?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2)
  @Type(() => String)
  @IsIn(RELATIONSHIP_GOALS, { each: true })
  goals?: RelationshipGoal[];

  @IsOptional()
  @Type(() => SajuInput)
  saju?: SajuInput;
}

export class AddPhotoDto {
  /** parent-photos 버킷의 오브젝트 경로 ({userId}/xxx.jpg). 클라이언트가 자기 JWT 로 직접 업로드한다. */
  @IsString()
  @MinLength(1)
  storagePath!: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class ConsentDto {
  @Type(() => String)
  @IsIn(['sms', 'in_person'])
  method!: ConsentMethod;

  @IsString()
  @MinLength(2)
  @MaxLength(20)
  parentName!: string;

  @IsOptional()
  @Matches(/^01[016789]\d{7,8}$/, { message: '휴대폰 번호 형식이 올바르지 않습니다' })
  phone?: string;
}

export class VisibilityDto {
  @IsBoolean()
  visible!: boolean;
}

// --- 응답 --------------------------------------------------------------------

export interface PhotoDto {
  id: string;
  url: string; // 서명 URL
  isPrimary: boolean;
  sortOrder: number;
}

export interface ProfileBadges {
  child: boolean;
  family: boolean;
  consent: boolean;
  review: boolean;
}

/**
 * 소유자(자녀) 본인이 보는 프로필. 실명·생년월일이 들어간다 —
 * 자기 부모님 정보이기 때문이다. 타인에게 나가는 것은
 * `DiscoveryItemDto` / `PublicProfileDto` 뿐이며 그쪽에는 원본이 없다.
 */
export interface ParentProfileDto {
  id: string;
  displayName: string;
  gender: 'male' | 'female';
  birthDate: string;
  age: number;
  regionCode: string;
  region: string;
  maritalStatus: MaritalStatus;
  maritalSince: string | null;
  heightCm: number | null;
  childrenCount: string | null;
  livingWith: string | null;
  religion: string | null;
  occupation: string | null;
  retiredOccupation: string | null;
  economicallyActive: boolean | null;
  drinking: string | null;
  smoking: string | null;
  hobbies: string[];
  motto: string | null;
  introByChild: string | null;
  desiredPartner: string | null;
  parentMessage: string | null;
  goals: RelationshipGoal[];
  photos: PhotoDto[];
  saju: {
    birthDate: string;
    calendarType: 'solar' | 'lunar';
    birthTime: string | null;
    birthTimeUnknown: boolean;
    isPublic: boolean;
  } | null;
  status: ProfileStatus;
  publishedAt: string | null;
  consent: {
    method: ConsentMethod;
    parentName: string;
    consentedAt: string | null;
    revokedAt: string | null;
  } | null;
  review: {
    status: 'pending' | 'approved' | 'rejected';
    rejectReason: string | null;
    reviewedAt: string | null;
  } | null;
  badges: ProfileBadges;
  /** 제출 가능 여부와 부족한 항목 — 화면이 직접 판정하지 않게 서버가 알려준다 */
  submittable: boolean;
  missing: string[];
}
