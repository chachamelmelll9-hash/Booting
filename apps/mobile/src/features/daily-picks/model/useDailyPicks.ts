import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DiscoveryItem } from '@shared/api/booting.types';
import { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** 하루에 뽑는 카드 수 */
export const DAILY_PICK_COUNT = 6;

/**
 * 오늘 날짜 키 — **로컬 기준**.
 *
 * `toISOString().slice(0,10)` 을 쓰면 UTC 라서 한국에서는 오전 9시가 되기 전까지
 * 어제 날짜가 나온다. 자정에 새 카드가 나와야 하는 기능이라 하루가 9시간
 * 밀리는 건 그냥 버그다.
 */
export function todayKey(now: Date = new Date()): string {
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

interface DailyPicksState {
  /** 이 카드들이 뽑힌 날 (todayKey 형식). 날이 바뀌면 전부 새로 뽑는다 */
  date: string | null;
  /**
   * 뽑힌 카드의 **스냅샷**.
   *
   * profileId 만 저장하고 매번 피드에서 찾아 쓰면, 관심을 보낸 순간 서버가
   * 그 사람을 추천에서 제외하면서 카드가 화면에서 사라진다. 오늘의 6장은
   * 하루 동안 그 자리에 있어야 하므로 카드 내용을 통째로 들고 있는다.
   */
  items: DiscoveryItem[];
  /** 뒤집어 본 카드 — 뒤집힌 상태는 하루 동안 유지된다 */
  revealed: string[];
  /** 이미 관심을 보낸 카드 (버튼을 다시 누르지 못하게 한다) */
  hearted: string[];
  /** 저장소 복원 완료 여부. 끝나기 전에 뽑으면 어제 카드를 덮어쓴다 */
  hydrated: boolean;
  refill: (date: string, candidates: DiscoveryItem[]) => void;
  reveal: (profileId: string) => void;
  markHearted: (profileId: string) => void;
  /**
   * 오늘 몫을 비워 다시 뽑게 한다.
   *
   * **추천의 뜻 자체가 바뀌었을 때만** 쓴다 (지금은 궁합 정렬·최소 궁합).
   * '궁합 좋은 순'을 골랐는데 내일까지 어제 순서의 카드가 그대로 있으면,
   * 사용자는 정렬이 고장났다고 판단한다.
   *
   * 거리·나이 같은 조건은 여기서 건드리지 않는다 — 하루 여섯 장이라는 제한이
   * 조건을 계속 바꿔 다시 뽑는 길로 새는 걸 막기 위해서다.
   */
  clear: () => void;
}

export const useDailyPicksStore = create<DailyPicksState>()(
  persist(
    (set) => ({
      date: null,
      items: [],
      revealed: [],
      hearted: [],
      hydrated: false,

      /**
       * 오늘 몫을 채운다.
       *
       * 날이 바뀌었으면 통째로 새로 뽑고, 같은 날인데 6장이 안 찼으면
       * (뽑을 때 추천이 모자랐던 경우) 뒤에 이어 붙인다. 이미 뽑힌 카드의
       * 순서는 절대 건드리지 않는다 — 순서가 곧 보석 배정이라, 섞이면
       * 사용자가 기억하던 "왼쪽 위 하트"가 다른 사람으로 바뀐다.
       */
      refill: (date, candidates) =>
        set((state) => {
          const sameDay = state.date === date;
          const kept = sameDay ? state.items : [];
          if (kept.length >= DAILY_PICK_COUNT) return state;

          const keptIds = new Set(kept.map((item) => item.profileId));
          const added = candidates
            .filter((item) => !keptIds.has(item.profileId))
            .slice(0, DAILY_PICK_COUNT - kept.length);
          if (!added.length && sameDay) return state;

          return {
            date,
            items: [...kept, ...added],
            // 날이 바뀌면 뒤집힘·관심 표시도 함께 비운다
            revealed: sameDay ? state.revealed : [],
            hearted: sameDay ? state.hearted : [],
          };
        }),

      reveal: (profileId) =>
        set((state) =>
          state.revealed.includes(profileId)
            ? state
            : { revealed: [...state.revealed, profileId] }
        ),

      markHearted: (profileId) =>
        set((state) =>
          state.hearted.includes(profileId)
            ? state
            : { hearted: [...state.hearted, profileId] }
        ),

      clear: () => set({ date: null, items: [], revealed: [], hearted: [] }),
    }),
    {
      name: 'daily-picks',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        date: state.date,
        items: state.items,
        revealed: state.revealed,
        hearted: state.hearted,
      }),
      onRehydrateStorage: () => () => useDailyPicksStore.setState({ hydrated: true }),
    }
  )
);

/**
 * 지금이 며칠인지. 앱이 **켜진 채로 자정을 넘기는** 경우를 위해 둔다.
 *
 * `todayKey()` 를 렌더 중에 한 번 계산하고 마는 방식은, 밤 11시에 앱을
 * 백그라운드로 두고 다음 날 아침에 다시 여는 흔한 경우에 어제 카드를 그대로
 * 보여준다 — 그 사이 리렌더가 일어나지 않기 때문이다. 포그라운드로 돌아올 때
 * 날짜를 다시 본다.
 */
function useToday(): string {
  const [today, setToday] = useState(() => todayKey());

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setToday(todayKey());
    });
    return () => sub.remove();
  }, []);

  return today;
}

/**
 * 오늘의 추천 6장.
 *
 * 추천 피드에서 앞에서부터 채운다 — 서버가 이미 조건·거리 순으로 정렬해
 * 내려주므로 여기서 다시 고르지 않는다. 무엇을 보여줄지는 서버가 정하고,
 * 이 훅은 **하루치를 잘라 고정하는 일만** 한다.
 *
 * 카드의 수명은 그날 하루다. 날짜가 바뀌면 여섯 장이 통째로 사라지고 새로
 * 뽑히며, 뒤집어 둔 상태와 관심 표시도 함께 비워진다.
 */
export function useDailyPicks(candidates: DiscoveryItem[]) {
  const { date, items, revealed, hearted, hydrated, refill, reveal, markHearted } =
    useDailyPicksStore();

  const today = useToday();
  const needsRefill = hydrated && (date !== today || items.length < DAILY_PICK_COUNT);

  useEffect(() => {
    if (!needsRefill) return;
    // 피드가 아직 안 왔으면 기다린다 — 빈 배열로 뽑으면 오늘 몫이 0장으로 굳는다
    if (!candidates.length) return;
    refill(today, candidates);
  }, [needsRefill, candidates, today, refill]);

  const revealedSet = useMemo(() => new Set(revealed), [revealed]);
  const heartedSet = useMemo(() => new Set(hearted), [hearted]);

  return {
    /** 오늘 뽑힌 카드 (최대 6장) */
    picks: date === today ? items : [],
    isRevealed: (profileId: string) => revealedSet.has(profileId),
    isHearted: (profileId: string) => heartedSet.has(profileId),
    revealedCount: date === today ? revealed.length : 0,
    reveal,
    markHearted,
    hydrated,
  };
}
