import type { ProfileDraft } from '../model/useProfileDraftStore';

/** 부모님 최소 연령 (TODO-02) */
export const PARENT_MIN_AGE = 50;

export function calcAge(birthDate: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate.trim());
  if (!match) return null;
  const [, y, m, d] = match;
  const birth = new Date(Number(y), Number(m) - 1, Number(d));
  if (Number.isNaN(birth.getTime())) return null;

  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age;
}

export type DraftErrors = Partial<Record<keyof ProfileDraft, string>>;

/**
 * 기본 정보 단계 검증.
 *
 * 같은 규칙이 서버 DTO 와 DB 트리거에도 있다. 여기서 막는 이유는 보안이 아니라
 * **즉시성**이다 — 다 쓰고 나서 제출 버튼에서야 "만 50세 이상" 이라는 말을 들으면
 * 처음부터 다시 써야 한다.
 */
export function validateBasics(draft: ProfileDraft): DraftErrors {
  const errors: DraftErrors = {};

  if (draft.displayName.trim().length < 2) {
    errors.displayName = '부모님 성함을 입력해주세요';
  }
  if (!draft.gender) {
    errors.gender = '성별을 선택해주세요';
  }

  const age = calcAge(draft.birthDate);
  if (age === null) {
    errors.birthDate = '생년월일을 YYYY-MM-DD 형식으로 입력해주세요';
  } else if (age < PARENT_MIN_AGE) {
    errors.birthDate = `부모님은 만 ${PARENT_MIN_AGE}세 이상이어야 합니다 (현재 만 ${age}세)`;
  }

  if (!draft.regionCode) {
    errors.regionCode = '거주 지역을 선택해주세요';
  }
  if (!draft.maritalStatus) {
    errors.maritalStatus = '혼인 상태를 선택해주세요';
  }
  if (draft.goals.length === 0) {
    errors.goals = '관계 목적을 1개 이상 선택해주세요';
  }

  return errors;
}

/** 소개 단계 검증 — 제출 전 필수 항목 */
export function validateIntro(draft: ProfileDraft): DraftErrors {
  const errors: DraftErrors = {};
  if (draft.introByChild.trim().length < 10) {
    errors.introByChild = '부모님 소개를 10자 이상 적어주세요';
  }
  if (draft.desiredPartner.trim().length < 5) {
    errors.desiredPartner = '어떤 분을 만나고 싶으신지 적어주세요';
  }
  return errors;
}

export function hasErrors(errors: DraftErrors): boolean {
  return Object.keys(errors).length > 0;
}
