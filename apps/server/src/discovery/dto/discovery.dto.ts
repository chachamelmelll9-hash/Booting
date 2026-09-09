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
import type { FourPillars, SajuCompatibility } from '../../saju/lib';

/**
 * 궁합은 **조건이 아니라 순서**다.
 *
 * 정렬 선택지도, 최소 점수 조건도 두지 않는다. 조건에 맞는 분들 안에서 궁합이
 * 높은 순으로 보여주는 것이 항상 맞고, 점수로 사람을 걸러내면 그 순간
 * 참고 정보가 자격 요건이 된다 (PRD 8.4).
 */
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

/**
 * 카드에 실리는 궁합 요약.
 *
 * 점수와 **근거 코드**만 나간다 — 상대의 생년월일·출생시각은 어느 필드에도 없다.
 * 문구는 모바일 `shared/config/saju.ts` 가 만든다.
 */
export type SajuCompatibilityDto = SajuCompatibility;

/** 기둥 하나 — 천간·지지 인덱스 */
export type SajuPillarDto = FourPillars['day'];

export interface DiscoveryItemDto {
  profileId: string;
  /**
   * 공개 표기용 별명. **실명(display_name)은 여기에도, 다른 어떤 공개 필드에도
   * 실리지 않는다.** 공개되는 값은 사용자가 별명 칸에 직접 적은 문자열뿐이다
   * (실명과 같게 적는 것도 본인 선택으로 허용한다 — 화면에서 확인만 받는다).
   */
  nickname: string;
  age: number;
  region: string;
  distanceKm: number | null;
  maritalStatus: MaritalStatus;
  goals: RelationshipGoal[];
  primaryPhotoUrl: string;
  introExcerpt: string;
  badges: { consent: boolean; review: boolean };
  /**
   * 우리 부모님과의 사주 궁합. **한쪽이라도 사주를 적지 않았으면 null** 이다
   * (0점이 아니다 — 못 본 것과 나쁜 것은 다르다).
   */
  compatibility: SajuCompatibilityDto | null;
  /**
   * **이 프로필 본인의 일주(日柱).** 카드에 '을사일주'로 찍는다.
   *
   * 네 기둥과 달리 일주 하나는 60일 주기라 생년월일이 특정되지 않는다 —
   * 그래서 `saju_infos.is_public` 과 무관하게 보낸다. 네 기둥 전체는 여전히
   * 공개한 분에게만 나간다 (`PublicProfileDto.sajuPillars`).
   *
   * 내 사주 유무와도 무관하다. 궁합은 둘이 있어야 나지만 일주는 본인 것이다.
   */
  dayPillar: SajuPillarDto | null;
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
  // 원본 생년월일·출생시각은 내보내지 않는다 — 정확한 생년월일은 비공개다 (PRD 7).
  // 사주로 나가는 값은 `dayPillar` 와 `compatibility` 뿐이다.
  // 네 기둥도 내보내지 않는다. 화면이 쓰는 사주 값은 일주(`dayPillar`) 하나뿐이고,
  // 기둥 넷이 다 나가면 60갑자 안에서 생년월일이 거의 특정된다 — 아무도 안 그리는
  // 값 때문에 그 위험을 질 이유가 없다.
  /** 내가 이미 관심을 보냈는가 — 버튼 상태 판정용 */
  heartSent: boolean;
}
