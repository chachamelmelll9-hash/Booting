/**
 * 혼인 상태 자격 판정 (PRD 자격 조건).
 *
 * 등록 가능한 상태는 사별·이혼 둘뿐이다. '별거'와 '혼인 중'은 명시적으로 막고,
 * **왜 막히는지**를 문장으로 돌려준다 — 그냥 비활성화된 버튼만 두면
 * 사용자는 앱이 고장난 줄 안다.
 */
export type MaritalChoice = 'bereaved' | 'divorced' | 'separated' | 'married';

export const MARITAL_CHOICES: { key: MaritalChoice; label: string }[] = [
  { key: 'bereaved', label: '사별' },
  { key: 'divorced', label: '이혼' },
  { key: 'separated', label: '별거' },
  { key: 'married', label: '혼인 중' },
];

export const MARITAL_LABEL: Record<string, string> = {
  bereaved: '사별',
  divorced: '이혼',
};

/** 타입 가드 — 통과하면 그대로 서버에 보낼 수 있는 값이 된다 */
export function isEligible(choice: MaritalChoice): choice is 'bereaved' | 'divorced' {
  return choice === 'bereaved' || choice === 'divorced';
}

export function ineligibleReason(choice: MaritalChoice): string | null {
  if (choice === 'separated') {
    return '별거 상태는 등록하실 수 없습니다. 법적으로 혼인 관계가 정리된 뒤에 이용해주세요.';
  }
  if (choice === 'married') {
    return '혼인 중이신 분은 등록하실 수 없습니다.';
  }
  return null;
}
