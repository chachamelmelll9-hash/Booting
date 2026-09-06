import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMemo } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface RevealedHeartsState {
  revealed: string[];
  hydrated: boolean;
  reveal: (profileId: string) => void;
}

/**
 * 받은 관심에서 열어 본 카드.
 *
 * 오늘의 추천과 달리 **날짜로 비우지 않는다.** 받은 관심은 하루치가 아니라
 * 상대가 기다리고 있는 목록이고, 자정이 지났다고 이미 확인한 분이 다시
 * 원석 뒤로 숨으면 누구를 봤는지 매번 다시 확인해야 한다. 목록은 답하거나
 * 넘기면 서버에서 빠지고, 남은 것도 2주 뒤 자동 삭제된다.
 *
 * 기기별 화면 상태라 서버에 올리지 않는다 — 다른 기기에서 다시 열어 보는 건
 * 손해가 아니다.
 */
export const useRevealedHeartsStore = create<RevealedHeartsState>()(
  persist(
    (set) => ({
      revealed: [],
      hydrated: false,
      reveal: (profileId) =>
        set((state) =>
          state.revealed.includes(profileId)
            ? state
            : { revealed: [...state.revealed, profileId] }
        ),
    }),
    {
      name: 'revealed-hearts',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ revealed: state.revealed }),
      onRehydrateStorage: () => () =>
        useRevealedHeartsStore.setState({ hydrated: true }),
    }
  )
);

export function useRevealedHearts() {
  const { revealed, hydrated, reveal } = useRevealedHeartsStore();
  const revealedSet = useMemo(() => new Set(revealed), [revealed]);

  return {
    isRevealed: (profileId: string) => revealedSet.has(profileId),
    reveal,
    hydrated,
  };
}
