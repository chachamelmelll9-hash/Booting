import type { RelationshipGoal } from '@shared/config/relationshipGoals';
import { create } from 'zustand';

export interface ProfileDraft {
  /** 실명 — 확인용. 공개되지 않는다 */
  displayName: string;
  /** 공개 표기용 별명 */
  nickname: string;
  gender: 'male' | 'female' | null;
  birthDate: string;
  regionCode: string;
  regionLabel: string;
  maritalStatus: 'bereaved' | 'divorced' | null;
  maritalSince: string;
  goals: RelationshipGoal[];

  /** 키(cm). 입력은 문자열로 받고 저장할 때 숫자로 바꾼다 */
  heightCm: string;
  childrenCount: string;
  /** 복수 선택 — 저장 시 쉼표로 합친다 */
  livingWith: string[];
  religion: string;
  occupation: string;
  /** '' | 'active' | 'retired' — 직업 표기에 (은퇴)를 붙일지 정한다 */
  economicStatus: string;
  drinking: string;
  smoking: string;
  hobbies: string;
  motto: string;
  introByChild: string;
  desiredPartner: string;
  parentMessage: string;

  /**
   * 사주 (선택) — PRD 5.3.
   *
   * 날짜를 따로 받지 않는다. 위에서 적은 생년월일을 그대로 쓰고 그것이 양력인지
   * 음력인지만 고른다. 날짜 칸을 하나 더 두면 두 값이 언젠가 어긋나고, 어느
   * 쪽으로 사주를 세웠는지 아무도 설명하지 못하게 된다.
   *
   * '' 는 **입력 안 함**이다 (사주 없이 등록 — 궁합만 안 보인다).
   */
  sajuCalendar: '' | 'solar' | 'lunar';
  /** 'HH:mm' */
  sajuBirthTime: string;
  sajuTimeUnknown: boolean;
  /** 생년월일·출생시각 자체를 상대에게 보일지. 꺼도 궁합은 계산된다 */
  sajuPublic: boolean;
}

const EMPTY: ProfileDraft = {
  displayName: '',
  nickname: '',
  gender: null,
  birthDate: '',
  regionCode: '',
  regionLabel: '',
  maritalStatus: null,
  maritalSince: '',
  goals: [],
  heightCm: '',
  childrenCount: '',
  livingWith: [],
  religion: '',
  occupation: '',
  economicStatus: '',
  drinking: '',
  smoking: '',
  hobbies: '',
  motto: '',
  introByChild: '',
  desiredPartner: '',
  parentMessage: '',
  sajuCalendar: '',
  sajuBirthTime: '',
  sajuTimeUnknown: false,
  sajuPublic: false,
};

interface DraftState {
  draft: ProfileDraft;
  set: (patch: Partial<ProfileDraft>) => void;
  reset: () => void;
  hydrate: (patch: Partial<ProfileDraft>) => void;
}

/**
 * 등록 플로우 전용 draft.
 *
 * 6개 섹션 폼이 한 draft 를 공유하고 화면 간 이동이 잦아서, 화면 로컬 state 로는
 * 뒤로 갔다 오면 입력이 날아간다. 이 스토어는 등록이 끝나면 reset 되고
 * 그 외 화면은 React Query 캐시만 본다 (전역 스토어는 이것과 필터 둘뿐).
 */
export const useProfileDraftStore = create<DraftState>((set) => ({
  draft: EMPTY,
  set: (patch) => set((state) => ({ draft: { ...state.draft, ...patch } })),
  reset: () => set({ draft: EMPTY }),
  hydrate: (patch) => set((state) => ({ draft: { ...state.draft, ...patch } })),
}));
