/**
 * 궁합(宮合) 점수.
 *
 * 전통 명리에서 부부 궁합을 볼 때 실제로 보는 자리만 담았다 — 일주(배우자
 * 자리)를 중심으로 두고, 띠(연지)·생활 리듬(월지)·오행/음양의 균형을 덧댄다.
 * 각 항목의 배점은 아래 표가 전부이며 숨은 가중치가 없다. **결과는 재미로 보는
 * 참고 정보이고, 추천에서 사람을 걸러내는 유일한 근거로 쓰지 않는다.**
 *
 * 점수는 30~99 로 정규화한다. 항목의 만점·최저점 합에서 역산하므로,
 * 한쪽이라도 출생시각을 몰라 시주 항목이 빠져도 그만큼 손해 보지 않는다.
 */
import type { Pillar } from './ganji';
import {
  branchClash,
  branchResentment,
  branchSeasonalUnion,
  branchSixUnion,
  branchTripleUnion,
  elementCounts,
  inHarmony,
  STEM_ELEMENT,
  stemClash,
  stemUnion,
  yangCount,
} from './ganji';
import type { FourPillars } from './pillars';

export type SajuGrade = 'soulmate' | 'excellent' | 'good' | 'fair' | 'mixed';

/**
 * 점수의 근거. **코드만 내려보낸다** — 문구는 모바일이 만든다.
 */
export type SajuReasonCode =
  | 'stem_union'
  | 'stem_generate'
  | 'stem_same'
  | 'stem_clash'
  | 'branch_six_union'
  | 'branch_triple_union'
  | 'branch_seasonal_union'
  | 'branch_same'
  | 'branch_clash'
  | 'zodiac_triple_union'
  | 'zodiac_six_union'
  | 'zodiac_clash'
  | 'zodiac_resentment'
  | 'month_union'
  | 'month_clash'
  | 'element_complement'
  | 'element_biased'
  | 'yinyang_balanced'
  | 'hour_union'
  | 'hour_clash';

export interface SajuCompatibility {
  /** 30~99 */
  score: number;
  grade: SajuGrade;
  /** 최대 4개. 비중이 큰 자리부터 (일간 → 일지 → 띠 → 월지 → 오행 → 음양 → 시지) */
  reasons: SajuReasonCode[];
  /** 양쪽 다 출생시각을 알면 high, 한쪽이라도 모르면 medium */
  confidence: 'high' | 'medium';
}

/** 어느 항목에도 속하지 않는 기본 점수 */
const BASE = 20;

/** 근거로 내보낼 최대 개수. 다섯 줄이 넘어가면 아무도 안 읽는다 */
const MAX_REASONS = 4;

interface Part {
  value: number;
  min: number;
  max: number;
  reason?: SajuReasonCode;
}

/** 일간 관계 — 부부 궁합에서 가장 큰 자리 */
function dayStemPart(a: Pillar, b: Pillar): Part {
  const bounds = { min: 4, max: 25 };
  if (stemUnion(a.stem, b.stem)) return { ...bounds, value: 25, reason: 'stem_union' };
  if (stemClash(a.stem, b.stem)) return { ...bounds, value: 4, reason: 'stem_clash' };
  if (inHarmony(STEM_ELEMENT[a.stem], STEM_ELEMENT[b.stem])) {
    return { ...bounds, value: 18, reason: 'stem_generate' };
  }
  if (STEM_ELEMENT[a.stem] === STEM_ELEMENT[b.stem]) {
    return { ...bounds, value: 12, reason: 'stem_same' };
  }
  return { ...bounds, value: 7 };
}

/** 일지 관계 — 배우자궁(配偶宮)끼리의 관계 */
function dayBranchPart(a: Pillar, b: Pillar): Part {
  const bounds = { min: -8, max: 22 };
  if (branchSixUnion(a.branch, b.branch)) {
    return { ...bounds, value: 22, reason: 'branch_six_union' };
  }
  if (branchTripleUnion(a.branch, b.branch)) {
    return { ...bounds, value: 20, reason: 'branch_triple_union' };
  }
  if (branchClash(a.branch, b.branch)) {
    return { ...bounds, value: -8, reason: 'branch_clash' };
  }
  if (branchSeasonalUnion(a.branch, b.branch)) {
    return { ...bounds, value: 14, reason: 'branch_seasonal_union' };
  }
  if (a.branch === b.branch) return { ...bounds, value: 10, reason: 'branch_same' };
  return { ...bounds, value: 6 };
}

/** 연지 관계 — 흔히 '띠 궁합'이라 부르는 자리 */
function zodiacPart(a: Pillar, b: Pillar): Part {
  const bounds = { min: -8, max: 12 };
  if (branchTripleUnion(a.branch, b.branch)) {
    return { ...bounds, value: 12, reason: 'zodiac_triple_union' };
  }
  if (branchSixUnion(a.branch, b.branch)) {
    return { ...bounds, value: 12, reason: 'zodiac_six_union' };
  }
  if (branchResentment(a.branch, b.branch)) {
    return { ...bounds, value: -8, reason: 'zodiac_resentment' };
  }
  if (branchClash(a.branch, b.branch)) {
    return { ...bounds, value: -6, reason: 'zodiac_clash' };
  }
  return { ...bounds, value: 5 };
}

/** 월지 관계 — 계절이 같으면 생활 리듬이 붙는다 */
function monthPart(a: Pillar, b: Pillar): Part {
  const bounds = { min: -5, max: 8 };
  if (branchSixUnion(a.branch, b.branch) || branchTripleUnion(a.branch, b.branch)) {
    return { ...bounds, value: 8, reason: 'month_union' };
  }
  if (branchClash(a.branch, b.branch)) {
    return { ...bounds, value: -5, reason: 'month_clash' };
  }
  return { ...bounds, value: 3 };
}

/** 시지 관계 — 양쪽 다 출생시각을 알 때만 센다 */
function hourPart(a: Pillar, b: Pillar): Part {
  const bounds = { min: -4, max: 6 };
  if (branchSixUnion(a.branch, b.branch) || branchTripleUnion(a.branch, b.branch)) {
    return { ...bounds, value: 6, reason: 'hour_union' };
  }
  if (branchClash(a.branch, b.branch)) {
    return { ...bounds, value: -4, reason: 'hour_clash' };
  }
  return { ...bounds, value: 2 };
}

/** 0~1 을 [lo, hi] 구간 기준으로 다시 편다 */
function rescale(value: number, lo: number, hi: number): number {
  return Math.min(1, Math.max(0, (value - lo) / (hi - lo)));
}

/**
 * 오행 균형 — 두 사람의 글자를 **합쳤을 때** 다섯 기운이 고른가.
 *
 * 한쪽에 없는 기운을 다른 쪽이 채우면 합친 분포가 평평해진다. 그래서 각자의
 * 결핍을 따로 재지 않고 합쳐서 한 번만 본다.
 *
 * 실제 팔자는 아무리 치우쳐도 완전히 한 오행에 몰리지 않아, 원값 그대로 쓰면
 * 0.6~0.95 구간에 전부 뭉친다. 그 구간을 다시 펴서 항목이 실제로 변별력을 갖게 한다.
 */
function elementPart(pillars: readonly Pillar[]): Part {
  const bounds = { min: 0, max: 18 };
  const counts = elementCounts(pillars);
  const total = counts.reduce((sum, n) => sum + n, 0);
  if (!total) return { ...bounds, value: 0 };

  const ideal = total / 5;
  const deviation = counts.reduce((sum, n) => sum + Math.abs(n - ideal), 0);
  // 한 오행에 전부 몰렸을 때의 편차 — 이 값으로 나눠 0~1 로 만든다
  const worst = 1.6 * total;
  const evenness = 1 - deviation / worst;

  const value = Math.round(18 * rescale(evenness, 0.55, 0.95));
  if (value >= 13) return { ...bounds, value, reason: 'element_complement' };
  if (value <= 5) return { ...bounds, value, reason: 'element_biased' };
  return { ...bounds, value };
}

/** 음양 조화 — 합친 글자에서 양(陽)이 절반에 가까울수록 높다 */
function yinYangPart(pillars: readonly Pillar[]): Part {
  const bounds = { min: 0, max: 8 };
  const total = pillars.length * 2;
  if (!total) return { ...bounds, value: 0 };

  const ratio = yangCount(pillars) / total;
  const balance = 1 - Math.abs(ratio - 0.5) * 2;

  const value = Math.round(8 * rescale(balance, 0.5, 1));
  if (value >= 6) return { ...bounds, value, reason: 'yinyang_balanced' };
  return { ...bounds, value };
}

function gradeOf(score: number): SajuGrade {
  if (score >= 90) return 'soulmate';
  if (score >= 80) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 60) return 'fair';
  return 'mixed';
}

/** 기둥 묶음 — 시주가 없으면 세 기둥 */
function knownPillars(p: FourPillars): Pillar[] {
  return p.hour ? [p.year, p.month, p.day, p.hour] : [p.year, p.month, p.day];
}

export function compatibility(a: FourPillars, b: FourPillars): SajuCompatibility {
  const bothHours = !!a.hour && !!b.hour;
  const combined = [...knownPillars(a), ...knownPillars(b)];

  // 순서가 곧 근거를 보여줄 우선순위다 — 일주가 맨 앞에 온다
  const parts: Part[] = [
    dayStemPart(a.day, b.day),
    dayBranchPart(a.day, b.day),
    zodiacPart(a.year, b.year),
    monthPart(a.month, b.month),
    elementPart(combined),
    yinYangPart(combined),
  ];
  if (bothHours) parts.push(hourPart(a.hour as Pillar, b.hour as Pillar));

  const raw = parts.reduce((sum, p) => sum + p.value, BASE);
  const low = parts.reduce((sum, p) => sum + p.min, BASE);
  const high = parts.reduce((sum, p) => sum + p.max, BASE);

  // 30~99 로 편다. 시주 항목이 빠져도 만점·최저점이 함께 줄어 손해가 없다
  const score = Math.round(30 + 69 * ((raw - low) / (high - low)));

  return {
    score,
    grade: gradeOf(score),
    reasons: parts
      .map((p) => p.reason)
      .filter((r): r is SajuReasonCode => !!r)
      .slice(0, MAX_REASONS),
    confidence: bothHours ? 'high' : 'medium',
  };
}
