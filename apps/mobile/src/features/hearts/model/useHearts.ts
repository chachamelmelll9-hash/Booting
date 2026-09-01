import { bootingKeys, heartsApi } from '@shared/api/booting';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export function useReceivedHearts() {
  return useInfiniteQuery({
    queryKey: bootingKeys.heartsReceived,
    queryFn: ({ pageParam }) => heartsApi.received(pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
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
    mutationFn: heartsApi.send,
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
