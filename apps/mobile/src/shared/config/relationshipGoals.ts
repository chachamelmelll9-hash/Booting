/**
 * 관계 목적 7종 (PRD 6장) — 문구 단일 소스.
 *
 * 선택 규칙: 최대 2개, '아직 모르겠음'은 단독 선택만.
 * 같은 규칙이 서버 DTO 검증과 DB 트리거에도 있다 (3중). 화면만 막으면
 * API 를 직접 부르는 경로로 뚫리고, DB 만 막으면 사용자가 이유를 모른다.
 */

export type RelationshipGoal =
  | 'remarriage'
  | 'serious'
  | 'casual'
  | 'travel_hobby'
  | 'same_sex_friend'
  | 'meal_walk'
  | 'undecided';

export const RELATIONSHIP_GOALS: {
  key: RelationshipGoal;
  label: string;
  hint: string;
}[] = [
  { key: 'remarriage', label: '재혼', hint: '함께 살아갈 배우자를 찾습니다' },
  { key: 'serious', label: '진지한 만남', hint: '결혼 전제는 아니지만 오래 만나고 싶습니다' },
  { key: 'casual', label: '가벼운 만남', hint: '부담 없이 알아가고 싶습니다' },
  { key: 'travel_hobby', label: '여행·취미 친구', hint: '함께 다닐 사람이 필요합니다' },
  { key: 'same_sex_friend', label: '동성 친구', hint: '이성 교제가 아닌 친구를 찾습니다' },
  { key: 'meal_walk', label: '식사·산책 친구', hint: '가까운 동네에서 자주 볼 사람을 찾습니다' },
  { key: 'undecided', label: '아직 모르겠음', hint: '천천히 정하고 싶습니다' },
];

export const MAX_GOALS = 2;

export function goalLabel(goal: RelationshipGoal): string {
  return RELATIONSHIP_GOALS.find((g) => g.key === goal)?.label ?? '';
}

/**
 * 선택 토글 결과를 계산한다. 화면은 이 함수만 부르고 규칙을 다시 쓰지 않는다.
 * @returns 새 선택 목록, 그리고 거부된 경우 사용자에게 보여줄 사유
 */
export function toggleGoal(
  current: RelationshipGoal[],
  goal: RelationshipGoal
): { goals: RelationshipGoal[]; rejected?: string } {
  if (current.includes(goal)) {
    return { goals: current.filter((g) => g !== goal) };
  }
  if (goal === 'undecided') {
    return { goals: ['undecided'] }; // 단독 선택 — 나머지를 밀어낸다
  }
  const withoutUndecided = current.filter((g) => g !== 'undecided');
  if (withoutUndecided.length >= MAX_GOALS) {
    return {
      goals: current,
      rejected: `관계 목적은 최대 ${MAX_GOALS}개까지 선택할 수 있습니다`,
    };
  }
  return { goals: [...withoutUndecided, goal] };
}
