/**
 * 간지(干支) 상수와 관계 판정.
 *
 * **표시 문구가 없다.** 천간·지지·오행은 전부 인덱스로만 오간다
 * (`common/types.ts` 와 같은 규칙 — 화면 문구는 모바일 `shared/config/*` 가 정본).
 * 서버가 '갑자'라는 글자를 만들어 내려보내기 시작하면, 같은 표를 모바일에도
 * 두게 되고 둘이 어긋나는 날이 온다.
 */

/** 천간 10 — 0 갑, 1 을, 2 병, 3 정, 4 무, 5 기, 6 경, 7 신, 8 임, 9 계 */
export const STEM_COUNT = 10;
/** 지지 12 — 0 자, 1 축, 2 인, 3 묘, 4 진, 5 사, 6 오, 7 미, 8 신, 9 유, 10 술, 11 해 */
export const BRANCH_COUNT = 12;

/** 오행 — 0 목, 1 화, 2 토, 3 금, 4 수. 이 순서가 곧 상생 순환이다 (목생화→화생토→…) */
export type Element = 0 | 1 | 2 | 3 | 4;
export const ELEMENT_COUNT = 5;

/** 천간의 오행 — 갑을木 병정火 무기土 경신金 임계水 */
export const STEM_ELEMENT: readonly Element[] = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4];
/** 천간의 음양 — 갑(양) 을(음) … 홀수 인덱스가 음이다 */
export const STEM_IS_YANG: readonly boolean[] = [
  true, false, true, false, true, false, true, false, true, false,
];

/** 지지의 오행(본기) — 자水 축土 인木 묘木 진土 사火 오火 미土 신金 유金 술土 해水 */
export const BRANCH_ELEMENT: readonly Element[] = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];
/** 지지의 음양 — 자(양) 축(음) … 홀수 인덱스가 음이다 */
export const BRANCH_IS_YANG: readonly boolean[] = [
  true, false, true, false, true, false, true, false, true, false, true, false,
];

export interface Pillar {
  /** 천간 0~9 */
  stem: number;
  /** 지지 0~11 */
  branch: number;
}

// --- 오행 관계 ---------------------------------------------------------------

/** a 가 b 를 생(生)하는가 — 목생화·화생토·토생금·금생수·수생목 */
export function generates(a: Element, b: Element): boolean {
  return (a + 1) % ELEMENT_COUNT === b;
}

/** a 가 b 를 극(剋)하는가 — 목극토·화극금·토극수·금극목·수극화 */
export function overcomes(a: Element, b: Element): boolean {
  return (a + 2) % ELEMENT_COUNT === b;
}

/** 어느 방향으로든 상생인가 */
export function inHarmony(a: Element, b: Element): boolean {
  return generates(a, b) || generates(b, a);
}

// --- 천간 관계 ---------------------------------------------------------------

/**
 * 천간합(天干合) — 갑기·을경·병신·정임·무계.
 * 인덱스가 정확히 5 떨어진 짝이다.
 */
export function stemUnion(a: number, b: number): boolean {
  return Math.abs(a - b) === 5;
}

/**
 * 천간충(天干沖) — 갑경·을신·병임·정계.
 * 인덱스가 6 떨어진 짝이며, 무기(戊己)에는 충이 없다(6 떨어진 상대가 없다).
 */
export function stemClash(a: number, b: number): boolean {
  return Math.abs(a - b) === 6;
}

// --- 지지 관계 ---------------------------------------------------------------

/**
 * 지지 육합(六合) — 자축·인해·묘술·진유·사신·오미.
 * 자축만 합이 1 이고 나머지 다섯은 합이 13 이다.
 */
export function branchSixUnion(a: number, b: number): boolean {
  const sum = a + b;
  return sum === 1 || sum === 13;
}

/** 삼합(三合) 그룹 — 신자진(水) 해묘미(木) 인오술(火) 사유축(金) */
const TRIPLE_UNION_GROUPS: readonly (readonly number[])[] = [
  [8, 0, 4],
  [11, 3, 7],
  [2, 6, 10],
  [5, 9, 1],
];

/** 삼합 — 같은 삼합 그룹에 함께 들어 있는가 (같은 지지는 제외) */
export function branchTripleUnion(a: number, b: number): boolean {
  if (a === b) return false;
  return TRIPLE_UNION_GROUPS.some((g) => g.includes(a) && g.includes(b));
}

/** 방합(方合) 그룹 — 인묘진(봄) 사오미(여름) 신유술(가을) 해자축(겨울) */
const SEASONAL_UNION_GROUPS: readonly (readonly number[])[] = [
  [2, 3, 4],
  [5, 6, 7],
  [8, 9, 10],
  [11, 0, 1],
];

/** 방합 — 같은 계절 묶음인가 (같은 지지는 제외) */
export function branchSeasonalUnion(a: number, b: number): boolean {
  if (a === b) return false;
  return SEASONAL_UNION_GROUPS.some((g) => g.includes(a) && g.includes(b));
}

/** 지지충(沖) — 자오·축미·인신·묘유·진술·사해. 인덱스가 6 떨어진 짝이다 */
export function branchClash(a: number, b: number): boolean {
  return Math.abs(a - b) === 6;
}

/** 원진(怨嗔) — 자미·축오·인유·묘신·진해·사술 */
const RESENTMENT_PAIRS: readonly (readonly [number, number])[] = [
  [0, 7],
  [1, 6],
  [2, 9],
  [3, 8],
  [4, 11],
  [5, 10],
];

export function branchResentment(a: number, b: number): boolean {
  return RESENTMENT_PAIRS.some(
    ([x, y]) => (a === x && b === y) || (a === y && b === x)
  );
}

// --- 팔자 전체 집계 -----------------------------------------------------------

/**
 * 기둥 묶음의 오행 분포.
 *
 * 천간과 지지를 같은 무게로 센다. 지장간까지 펼치면 유파마다 배분이 달라
 * 근거를 설명할 수 없는 숫자가 되므로, 본기 하나만 쓴다.
 */
export function elementCounts(pillars: readonly Pillar[]): number[] {
  const counts = new Array<number>(ELEMENT_COUNT).fill(0);
  for (const p of pillars) {
    counts[STEM_ELEMENT[p.stem]] += 1;
    counts[BRANCH_ELEMENT[p.branch]] += 1;
  }
  return counts;
}

/** 기둥 묶음에서 양(陽)에 해당하는 글자 수 */
export function yangCount(pillars: readonly Pillar[]): number {
  let yang = 0;
  for (const p of pillars) {
    if (STEM_IS_YANG[p.stem]) yang += 1;
    if (BRANCH_IS_YANG[p.branch]) yang += 1;
  }
  return yang;
}
