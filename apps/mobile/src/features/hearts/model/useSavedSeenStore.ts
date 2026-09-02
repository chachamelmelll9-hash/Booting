import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface SavedSeenState {
  /** 보관함을 마지막으로 연 시각 (ISO). null 이면 한 번도 안 열었다 */
  lastSeenAt: string | null;
  markSeen: () => void;
}

/**
 * 보관함을 마지막으로 본 시각.
 *
 * 헤더 배지는 "보관함에 몇 개 있나"가 아니라 **"보고 나서 새로 담긴 게 있나"**를
 * 말해야 한다. 담긴 개수를 그대로 띄우면 확인해도 숫자가 그대로라 알림이 안
 * 꺼지는 것처럼 보인다 — 실제로 그런 신고를 받았다.
 *
 * 서버에 두지 않고 기기에 둔다. "내가 그 화면을 봤는가"는 계정이 아니라 이
 * 기기에서의 행동이고, 이것 때문에 테이블을 하나 더 만들 이유가 없다.
 */
export const useSavedSeenStore = create<SavedSeenState>()(
  persist(
    (set) => ({
      lastSeenAt: null,
      markSeen: () => set({ lastSeenAt: new Date().toISOString() }),
    }),
    {
      name: 'saved-seen-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
