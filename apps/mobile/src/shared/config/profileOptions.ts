/**
 * 프로필 선택지 — 자유 입력 대신 고정 보기로 받는 항목들.
 *
 * 자유 입력이면 "혼자삽니다" / "독거" / "혼자 거주"가 전부 다른 값이 되어
 * 상세 화면 표기가 제각각이 되고, 나중에 통계·필터를 붙일 수도 없다.
 */

/** 동거 가족 — 복수 선택 가능 (예: 자녀와 거주 + 부모와 거주) */
export const LIVING_WITH_OPTIONS = [
  '혼자 거주',
  '자녀와 거주',
  '형제와 거주',
  '부모와 거주',
] as const;

export type LivingWithOption = (typeof LIVING_WITH_OPTIONS)[number];

/** 흡연 — 단일 선택 */
export const SMOKING_OPTIONS = ['비흡연', '흡연'] as const;

/** 경제 활동 — 단일 선택 */
export const ECONOMIC_OPTIONS = [
  { key: 'active', label: '현재 하고 계심', economicallyActive: true },
  { key: 'retired', label: '은퇴하셨음', economicallyActive: false },
] as const;

/**
 * 직업 표기 — 경제 활동 여부를 직업 문구 안으로 합친다.
 *
 * "직업: 교사" 와 "경제 활동: 하지 않으십니다" 를 따로 두면 서로 모순으로 읽힌다.
 * 은퇴하셨으면 `교사 (은퇴)` 한 줄로 보여주는 편이 정확하고 짧다.
 * 이미 '은퇴'가 적혀 있으면 덧붙이지 않는다 — `교사 (은퇴) (은퇴)` 가 되지 않게.
 */
export function formatOccupation(
  occupation: string | null | undefined,
  economicallyActive: boolean | null | undefined
): string | null {
  const base = occupation?.trim();
  if (!base) return null;
  if (economicallyActive === false && !base.includes('은퇴')) return `${base} (은퇴)`;
  return base;
}

export type SmokingOption = (typeof SMOKING_OPTIONS)[number];

/** 저장·전송용 직렬화 (서버 컬럼은 text 하나다) */
export const LIVING_WITH_SEPARATOR = ', ';

export function serializeLivingWith(values: string[]): string {
  return values.join(LIVING_WITH_SEPARATOR);
}

export function parseLivingWith(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((v) => v.trim())
    .filter((v) => (LIVING_WITH_OPTIONS as readonly string[]).includes(v));
}

/**
 * 사진 최소 장수.
 *
 * 1장만 있으면 상대 자녀가 판단할 근거가 사실상 없고, 그 한 장이 오래된
 * 사진일 때 만남 자리에서 문제가 된다. 3장은 최소한의 성의이자 안전장치다.
 */
export const MIN_PROFILE_PHOTOS = 3;
export const MAX_PROFILE_PHOTOS = 5;
