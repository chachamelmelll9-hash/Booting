/**
 * 사주 문구 — 단일 소스.
 *
 * 서버는 점수와 천간·지지 **인덱스만** 내려준다. 한글은 전부 여기서 붙는다 —
 * 서버가 '갑자'라는 글자를 만들기 시작하면 같은 표가 양쪽에 생기고 언젠가 어긋난다.
 *
 * 화면에 나가는 사주 표기는 **두 개뿐이다**: 일주와 궁합 점수.
 * 등급 문구('천생연분'·'무난한 궁합')도, 근거 풀이도, 네 기둥 나열도 두지 않는다.
 * 숫자는 참고로 읽히지만 문장은 결론으로 읽히고, 그러면 서비스가 두 사람 사이를
 * 판정하는 모양이 된다 — 점수가 낮게 나온 상대도 누군가의 부모님이다.
 */
import type { SajuPillar } from '@shared/api/booting.types';

/** 천간 10 */
const STEMS = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'] as const;
/** 지지 12 */
const BRANCHES = [
  '자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해',
] as const;

/** '갑자' */
export function pillarLabel(pillar: SajuPillar): string {
  return `${STEMS[pillar.stem] ?? ''}${BRANCHES[pillar.branch] ?? ''}`;
}

/**
 * '을사일주' — 카드와 상세에 찍는 본인 표기.
 *
 * 네 기둥과 달리 일주 하나는 60일 주기라, 나이를 알아도 생년월일 후보가
 * 여럿 남는다. 그래서 사주를 비공개로 두신 분에게도 이 값은 나간다.
 */
export function dayPillarLabel(pillar: SajuPillar): string {
  return `${pillarLabel(pillar)}일주`;
}
