import { MIN_PROFILE_PHOTOS } from '@shared/config/profileOptions';

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

/**
 * 가족·생활 정보 검증.
 *
 * 전부 필수다. 이 항목들이 비면 상세 화면이 이름과 사진만 남아, 상대 자녀가
 * 부모님을 판단할 근거가 없어진다. 서버도 같은 항목을 `missing` 으로 막는다.
 * (자녀 수·동거 가족은 필수로 **입력**하되 검색 조건으로는 쓰지 않는다 — PRD)
 */
export function validateDetails(draft: ProfileDraft): DraftErrors {
  const errors: DraftErrors = {};
  const required: [keyof ProfileDraft, string][] = [
    ['childrenCount', '자녀 수를 입력해주세요'],
    ['religion', '종교를 입력해주세요'],
    ['occupation', '직업 또는 은퇴 전 직업을 입력해주세요'],
    ['drinking', '음주 여부를 입력해주세요'],
    ['smoking', '흡연 여부를 선택해주세요'],
    ['hobbies', '취미를 하나 이상 입력해주세요'],
  ];

  for (const [field, message] of required) {
    if (!String(draft[field] ?? '').trim()) errors[field] = message;
  }

  // 동거 가족은 복수 선택이라 문자열 검사로는 잡히지 않는다
  if (!draft.livingWith.length) {
    errors.livingWith = '동거 가족을 하나 이상 선택해주세요';
  }

  return errors;
}

export function hasErrors(errors: DraftErrors): boolean {
  return Object.keys(errors).length > 0;
}

/**
 * 서버 `missing` 코드 → 화면 문구.
 * 서버가 항목을 추가하면 여기에도 추가한다 — 없으면 코드값이 그대로 노출된다.
 */
export const MISSING_LABEL: Record<string, string> = {
  photos: `사진 ${MIN_PROFILE_PHOTOS}장 이상`,
  introByChild: '부모님 소개',
  desiredPartner: '만나고 싶은 분',
  goals: '관계 목적',
  childrenCount: '자녀 수',
  livingWith: '동거 가족',
  religion: '종교',
  occupation: '직업 / 은퇴 전 직업',
  drinking: '음주',
  smoking: '흡연',
  hobbies: '취미',
  consent: '부모님 동의',
};

export function missingLabel(key: string): string {
  return MISSING_LABEL[key] ?? key;
}
