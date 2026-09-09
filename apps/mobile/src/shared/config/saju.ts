/**
 * 사주 궁합 문구 — 단일 소스.
 *
 * 서버는 점수와 **코드**만 내려준다 (`SajuGrade`, `SajuReasonCode`, 천간·지지
 * 인덱스). 한글은 전부 여기서 붙는다 — 서버가 '갑자'라는 글자를 만들기 시작하면
 * 같은 표가 양쪽에 생기고 언젠가 어긋난다.
 */
import type { SajuPillar, SajuPillars, SajuReasonCode } from '@shared/api/booting.types';

/** 천간 10 */
const STEMS = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'] as const;
/** 지지 12 */
const BRANCHES = [
  '자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해',
] as const;
/** 지지에 붙는 띠 — 연주를 읽을 때 '쥐띠'가 '자'보다 먼저 이해된다 */
const ZODIAC = [
  '쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양', '원숭이', '닭', '개', '돼지',
] as const;

/**
 * 등급 문구는 **두지 않는다.**
 *
 * '천생연분'·'무난한 궁합' 같은 말은 서비스가 두 사람 사이를 판정하는 것처럼
 * 읽힌다. 점수가 낮게 나온 상대도 누군가의 부모님이고 그 문장을 자녀가 읽는다.
 * 숫자와 근거만 보여주고 해석은 보는 사람에게 맡긴다.
 */
export const SAJU_REASON_LABEL: Record<SajuReasonCode, string> = {
  stem_union: '두 분의 일간이 천간합입니다 — 서로 끌리는 자리예요',
  stem_generate: '두 분의 일간이 상생합니다 — 한쪽이 다른 쪽을 북돋아요',
  stem_same: '두 분의 일간이 같은 기운입니다 — 통하는 데가 많아요',
  stem_clash: '두 분의 일간이 충입니다 — 처음엔 부딪힐 수 있어요',
  branch_six_union: '배우자 자리가 육합입니다 — 곁에 두기 편한 사이예요',
  branch_triple_union: '배우자 자리가 삼합입니다 — 오래 함께하기 좋아요',
  branch_seasonal_union: '배우자 자리가 같은 계절입니다 — 살아온 결이 비슷해요',
  branch_same: '배우자 자리가 같습니다 — 성향이 닮았어요',
  branch_clash: '배우자 자리가 충입니다 — 서로 맞춰갈 시간이 필요해요',
  zodiac_triple_union: '띠가 삼합입니다 — 예부터 잘 맞는다고 보는 짝이에요',
  zodiac_six_union: '띠가 육합입니다 — 마음이 편한 짝이에요',
  zodiac_clash: '띠가 충입니다 — 속도가 다를 수 있어요',
  zodiac_resentment: '띠가 원진입니다 — 사소한 데서 어긋날 수 있어요',
  month_union: '태어난 절기가 어우러집니다 — 생활 리듬이 잘 맞아요',
  month_clash: '태어난 절기가 충입니다 — 생활 리듬이 다를 수 있어요',
  element_complement: '두 분을 합치면 오행이 고릅니다 — 서로 모자란 데를 채워요',
  element_biased: '두 분의 오행이 한쪽으로 몰려 있습니다',
  yinyang_balanced: '음양이 고르게 어울립니다',
  hour_union: '태어난 시가 합입니다 — 하루를 보내는 결이 닮았어요',
  hour_clash: '태어난 시가 충입니다',
};

/** '갑자' */
export function pillarLabel(pillar: SajuPillar): string {
  return `${STEMS[pillar.stem] ?? ''}${BRANCHES[pillar.branch] ?? ''}`;
}

/**
 * '을사일주' — 카드에 찍는 본인 표기.
 *
 * 네 기둥과 달리 일주 하나는 60일 주기라 생년월일이 특정되지 않는다.
 * 그래서 사주를 비공개로 두신 분의 카드에도 이 줄은 나온다.
 */
export function dayPillarLabel(pillar: SajuPillar): string {
  return `${pillarLabel(pillar)}일주`;
}

/** '을묘년 무인월 갑자일 (시 모름)' */
export function pillarsLabel(pillars: SajuPillars): string {
  const parts = [
    `${pillarLabel(pillars.year)}년`,
    `${pillarLabel(pillars.month)}월`,
    `${pillarLabel(pillars.day)}일`,
  ];
  parts.push(pillars.hour ? `${pillarLabel(pillars.hour)}시` : '(시 모름)');
  return parts.join(' ');
}

/** '토끼띠' */
export function zodiacLabel(pillars: SajuPillars): string {
  return `${ZODIAC[pillars.year.branch] ?? ''}띠`;
}

/**
 * 출생시각을 한쪽이라도 모르면 시주 없이 세 기둥으로 본 결과라는 걸 밝힌다.
 * 밝히지 않으면 같은 상대의 점수가 시각을 채운 뒤 달라졌을 때 오류로 읽힌다.
 */
export function confidenceNote(confidence: 'high' | 'medium'): string | null {
  if (confidence === 'high') return null;
  return '출생시각을 모르는 분이 있어 시주를 빼고 봤습니다';
}

/** 어느 화면에서도 빠지면 안 되는 한 줄 */
export const SAJU_DISCLAIMER = '재미로 보는 참고 정보입니다';

// 궁합에는 필터도 정렬 선택지도 없다 — 조건에 맞는 분들 안에서 궁합이 높은
// 순으로 서버가 항상 정렬한다. 점수로 사람을 걸러내면 선택 입력인 사주가
// 사실상의 자격 요건이 된다 (PRD 8.4).
