import { bootingKeys, heartsApi } from '@shared/api/booting';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export function useReceivedHearts() {
  return useInfiniteQuery({
    queryKey: bootingKeys.heartsReceived,
    queryFn: ({ pageParam }) => heartsApi.received(pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    /**
     * 탭을 열 때마다 새로 받아 온다.
     *
     * 기본 1분 캐시에 걸려, 앱을 켠 직후 비어 있던 목록이 그 뒤에 관심이 들어와도
     * 계속 "아직 받은 관심이 없습니다" 로 남았다 — 탭 배지에는 숫자가 떠 있는데
     * 목록만 비어 있어, 앱이 고장 난 것처럼 보인다 (실측, 두 번).
     *
     * 이 목록은 남이 나에게 보낸 것이라 내 조작으로는 갱신될 수 없다. 그래서
     * 무효화 시점을 잡을 수 없고, 열 때 다시 묻는 것이 유일하게 맞는 규칙이다.
     */
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

export function useHeartsUnreadCount() {
  return useQuery({
    queryKey: bootingKeys.heartsUnread,
    queryFn: heartsApi.unreadCount,
    refetchInterval: 30_000,
  });
}

/**
 * 받은 하트에 하트로 답하기.
 *
 * 서버가 상호 하트를 판정하고 인연을 만든다. 클라이언트는 `mutual` 과
 * `connectionId` 만 받아 시트를 띄울지 결정한다 — 여기서 '매칭' 판정을
 * 하지 않는다.
 */
export function useSendHeartBack() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ targetProfileId, message }: { targetProfileId: string; message?: string }) =>
      heartsApi.send(targetProfileId, message),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: bootingKeys.heartsReceived }),
        queryClient.invalidateQueries({ queryKey: bootingKeys.heartsUnread }),
        queryClient.invalidateQueries({ queryKey: bootingKeys.connections() }),
        queryClient.invalidateQueries({ queryKey: bootingKeys.discovery }),
      ]);
    },
  });
}

/**
 * 받은 관심을 넘긴다.
 *
 * 넘김을 기록해야 목록에서도 사라지고 추천에도 다시 안 뜬다.
 * 기록하지 않으면 넘긴 사람이 홈에서 또 나온다.
 */
export function usePassReceivedHeart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: heartsApi.pass,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: bootingKeys.heartsReceived }),
        queryClient.invalidateQueries({ queryKey: bootingKeys.heartsUnread }),
        queryClient.invalidateQueries({ queryKey: bootingKeys.discovery }),
      ]);
    },
  });
}

/*
 * 찜(보관함)은 없앴다.
 *
 * 받은 관심 카드가 2주 뒤 자동으로 사라지므로, "지금 결정하기 어려운 분"을
 * 따로 담아 둘 자리가 필요 없다 — 그냥 두면 그게 보류이고, 시간이 지나면
 * 알아서 정리된다. 담아 두는 자리를 만들면 사용자는 그 목록까지 관리해야 하는데,
 * 정작 다시 열어 보지 않는다.
 */
