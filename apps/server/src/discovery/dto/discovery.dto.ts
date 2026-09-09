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

/** 추천 정렬. `compatibility` 는 우리 부모님과의 사주 궁합이 높은 순 */
export type DiscoverySort = 'recent' | 'compatibility';
export const DISCOVERY_SORTS: DiscoverySort[] = ['recent', 'compatibility'];

/**
 * 최소 궁합 선택지.
 *
 * 임의의 숫자를 받지 않는다 — 화면은 칩 몇 개로 고르는데 서버만 1~99 를
 * 받아 두면, 나중에 칩을 바꿨을 때 저장돼 있던 값이 화면 어디에도 안 보인다.
 */
export const COMPATIBILITY_THRESHOLDS = [50, 60, 70, 80] as const;

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

  @IsOptional() @Type(() => String) @IsIn(DISCOVERY_SORTS) sort?: DiscoverySort;

  /**
   * 이 점수 미만은 추천에서 뺀다. 없으면 제한하지 않는다.
   *
   * 우리 부모님 사주가 없으면 상대와의 궁합을 낼 수 없으므로, 그때는 이 값이
   * 남아 있어도 **무시한다** — 안 그러면 사주를 안 적은 분의 홈이 통째로 빈다.
   */
  @IsOptional()
  @Type(() => Number)
  @IsIn(COMPATIBILITY_THRESHOLDS as unknown as number[])
  minCompatibility?: number;

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

/** 사주팔자 네 기둥. 각 기둥은 천간·지지 인덱스다 */
export type SajuPillarsDto = FourPillars;

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
  /**
   * 궁합의 근거가 된 네 기둥. `compatibility` 가 있을 때만 채워진다.
   *
   * 상대 기둥은 **상대가 사주를 공개했을 때만** 들어간다. 네 기둥이 다 보이면
   * 60갑자 안에서 생년월일이 거의 특정되므로, 비공개인 분의 기둥을 보내면
   * `saju` 를 숨긴 의미가 사라진다.
   */
  sajuPillars: { mine: SajuPillarsDto; theirs: SajuPillarsDto | null } | null;
  /** 내가 이미 관심을 보냈는가 — 버튼 상태 판정용 */
  heartSent: boolean;
}
