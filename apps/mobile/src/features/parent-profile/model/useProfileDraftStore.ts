import type { RelationshipGoal } from '@shared/config/relationshipGoals';
import { create } from 'zustand';

export interface ProfileDraft {
  displayName: string;
  gender: 'male' | 'female' | null;
  birthDate: string;
  regionCode: string;
  regionLabel: string;
  maritalStatus: 'bereaved' | 'divorced' | null;
  maritalSince: string;
  goals: RelationshipGoal[];

  childrenCount: string;
  /** 복수 선택 — 저장 시 쉼표로 합친다 */
  livingWith: string[];
  religion: string;
  occupation: string;
  drinking: string;
  smoking: string;
  hobbies: string;
  motto: string;
  introByChild: string;
  desiredPartner: string;
  parentMessage: string;
}

const EMPTY: ProfileDraft = {
  displayName: '',
  gender: null,
  birthDate: '',
  regionCode: '',
  regionLabel: '',
  maritalStatus: null,
  maritalSince: '',
  goals: [],
  childrenCount: '',
  livingWith: [],
  religion: '',
  occupation: '',
  drinking: '',
  smoking: '',
  hobbies: '',
  motto: '',
  introByChild: '',
  desiredPartner: '',
  parentMessage: '',
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
