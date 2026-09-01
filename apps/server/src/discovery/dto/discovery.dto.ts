import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

import type { MaritalStatus, RelationshipGoal } from '../../common/types';
import { ALLOWED_RADIUS_KM, RELATIONSHIP_GOALS } from '../../common/types';

export class DiscoveryFilterDto {
  @IsOptional() @IsIn(['male', 'female']) targetGender?: 'male' | 'female';

  @IsOptional() @Type(() => Number) @IsInt() @Min(50) @Max(100) ageMin?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(50) @Max(100) ageMax?: number;

  @IsOptional() @IsString() regionCode?: string;

  @IsOptional()
  @Type(() => Number)
  @IsIn(ALLOWED_RADIUS_KM as unknown as number[])
  radiusKm?: number;

  @IsOptional()
  @Type(() => String)
  @IsIn(['bereaved', 'divorced'])
  maritalFilter?: MaritalStatus;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7)
  @Type(() => String)
  @IsIn(RELATIONSHIP_GOALS, { each: true })
  goals?: RelationshipGoal[];

  @IsOptional() @IsString() religion?: string;
  @IsOptional() @IsString() drinking?: string;
  @IsOptional() @IsString() smoking?: string;
  @IsOptional() @IsBoolean() economicallyActive?: boolean;

  // 자녀 수·동거 가족은 필터 항목이 없다 (PRD: 필터 금지, 상세에서만 표시).
  // DB 에도 컬럼이 없으므로 여기 추가하면 저장 단계에서 바로 깨진다.
}

export interface DiscoveryItemDto {
  profileId: string;
  maskedName: string;
  age: number;
  region: string;
  distanceKm: number | null;
  maritalStatus: MaritalStatus;
  goals: RelationshipGoal[];
  primaryPhotoUrl: string;
  introExcerpt: string;
  badges: { child: boolean; family: boolean; consent: boolean; review: boolean };
}

export interface PublicProfileDto extends DiscoveryItemDto {
  photoUrls: string[];
  maritalSince: string | null;
  /** 키(cm). 카드에는 넣지 않고 상세에서만 보여준다 */
  heightCm: number | null;
  introByChild: string;
  desiredPartner: string;
  parentMessage: string;
  motto: string | null;
  religion: string | null;
  occupation: string | null;
  retiredOccupation: string | null;
  economicallyActive: boolean | null;
  drinking: string | null;
  smoking: string | null;
  hobbies: string[];
  /** 상세에서만 보인다 — 필터로는 쓸 수 없다 (PRD) */
  childrenCount: string | null;
  livingWith: string | null;
  saju: {
    birthDate: string;
    calendarType: 'solar' | 'lunar';
    birthTime: string | null;
    birthTimeUnknown: boolean;
  } | null;
  /** 내가 이미 관심을 보냈는가 — 버튼 상태 판정용 */
  heartSent: boolean;
}
