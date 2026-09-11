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
  /**
   * 직전에 뽑혔던 카드의 profileId.
   *
   * 후보 풀은 날이 바뀌어도 그대로다 — 하트도 패스도 하지 않은 사람은 내일도
   * 같은 순위에 남아 있어서, 그냥 두면 '오늘의 추천'에 어제와 같은 여섯 명이
   * 뜬다. 사용자는 그걸 새 추천이 아니라 고장으로 받아들인다. 그래서 직전
   * 몫을 기억해 두고 오늘 후보에서 뺀다.
   *
   * 날짜가 아니라 '직전에 뽑힌 것' 이다 — 사흘 만에 앱을 열면 그 사흘 전
   * 카드가 기준이 된다. 사용자가 마지막으로 본 여섯 명과 겹치지 않는 게
   * 요점이지, 달력상 어제인지가 요점이 아니다.
   */
  previous: string[];
  /** 뒤집어 본 카드 — 뒤집힌 상태는 하루 동안 유지된다 */
  revealed: string[];
  /** 이미 관심을 보낸 카드 (버튼을 다시 누르지 못하게 한다) */
  hearted: string[];
  /** 저장소 복원 완료 여부. 끝나기 전에 뽑으면 어제 카드를 덮어쓴다 */
  hydrated: boolean;
  refill: (date: string, candidates: DiscoveryItem[]) => void;
  reveal: (profileId: string) => void;
  markHearted: (profileId: string) => void;
}

/**
 * `date` 를 기준으로 본 '직전 몫'.
 *
 * 같은 날이면 이미 기록해 둔 값을, 날이 바뀌었으면 지금 들고 있는 카드가
 * 곧 직전 몫이다. refill 과 훅이 같은 답을 내야 해서 한 곳에 둔다 — 어긋나면
 * 훅은 "새 얼굴이 모자라다"며 다음 쪽을 계속 받고 refill 은 채워 버린다.
 */
function previousIdsFor(state: DailyPicksState, date: string): string[] {
  return state.date === date ? (state.previous ?? []) : state.items.map((item) => item.profileId);
}

export const useDailyPicksStore = create<DailyPicksState>()(
  persist(
    (set) => ({
      date: null,
      items: [],
      previous: [],
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

          // 날이 바뀌는 순간의 카드가 '직전 몫' 이 된다. 같은 날 보충일 때는
          // 이미 기록해 둔 직전 몫을 그대로 쓴다 — 오늘 뽑은 카드가 스스로를
          // 제외 목록에 넣어 버리면 안 된다.
          const previous = previousIdsFor(state, date);

          const keptIds = new Set(kept.map((item) => item.profileId));
          const previousIds = new Set(previous);
          const fresh = candidates.filter((item) => !keptIds.has(item.profileId));
          const need = DAILY_PICK_COUNT - kept.length;

          /**
           * 직전 몫을 뺀 후보를 먼저 쓰고, 그것만으로 여섯 장이 안 되면 직전
           * 카드로 뒤를 채운다. 빈 자리로 두면 홈에 '조건에 맞는 분이 더
           * 없습니다' 가 뜨는데, 후보가 실제로 있는데도 없다고 알리는 꼴이다.
           * 회원이 적은 초반에는 이 경우가 오히려 기본값이다.
           */
          const unseen = fresh.filter((item) => !previousIds.has(item.profileId));
          const pool =
            unseen.length >= need
              ? unseen
              : [...unseen, ...fresh.filter((item) => previousIds.has(item.profileId))];
          const added = pool.slice(0, need);
          if (!added.length && sameDay) return state;

          return {
            date,
            previous,
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
    }),
    {
      name: 'daily-picks',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        date: state.date,
        items: state.items,
        previous: state.previous,
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
 * 뽑히며, 뒤집어 둔 상태와 관심 표시도 함께 비워진다. 그때 **직전에 뽑혔던
 * 여섯 명은 후보에서 빠진다** — 후보 풀은 날이 바뀌어도 그대로라, 빼지 않으면
 * 같은 얼굴이 이틀 연속 '오늘의 추천' 에 올라온다.
 *
 * `hasMore`/`loadMore` 는 그 제외 때문에 필요하다. 피드 한 쪽이 열 명이라
 * 직전 여섯을 빼면 새 얼굴이 넷뿐이다. 다음 쪽을 먼저 받아 보고, 더 받을 게
 * 없을 때만 직전 카드로 뒤를 채운다.
 */
export function useDailyPicks(
  candidates: DiscoveryItem[],
  hasMore = false,
  isLoadingMore = false,
  loadMore?: () => unknown
) {
  const { date, items, revealed, hearted, hydrated, refill, reveal, markHearted } =
    useDailyPicksStore();

  const today = useToday();
  const needsRefill = hydrated && (date !== today || items.length < DAILY_PICK_COUNT);

  useEffect(() => {
    if (!needsRefill) return;
    // 피드가 아직 안 왔으면 기다린다 — 빈 배열로 뽑으면 오늘 몫이 0장으로 굳는다
    if (!candidates.length) return;

    const state = useDailyPicksStore.getState();
    const kept = state.date === today ? state.items : [];
    const keptIds = new Set(kept.map((item) => item.profileId));
    const previousIds = new Set(previousIdsFor(state, today));
    const unseen = candidates.filter(
      (item) => !keptIds.has(item.profileId) && !previousIds.has(item.profileId)
    );

    if (unseen.length < DAILY_PICK_COUNT - kept.length && hasMore && !isLoadingMore) {
      void loadMore?.();
      return;
    }

    refill(today, candidates);
  }, [needsRefill, candidates, today, refill, hasMore, isLoadingMore, loadMore]);

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
