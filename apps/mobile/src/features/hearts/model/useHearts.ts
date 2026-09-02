import { bootingKeys, heartsApi, savedApi } from '@shared/api/booting';
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

/** 찜한 프로필 보관함 */
export function useSavedProfiles() {
  return useQuery({ queryKey: bootingKeys.saved, queryFn: savedApi.list });
}

/**
 * 찜하기 / 찜 풀기.
 *
 * 받은 관심도 함께 무효화한다 — 찜한 상대는 받은 관심 목록에서 빠지고,
 * 풀면 돌아온다. 둘이 어긋나면 "찜을 풀었는데 어디에도 없는" 상태가 된다.
 */
export function useSavedMutations() {
  const queryClient = useQueryClient();

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: bootingKeys.saved }),
      queryClient.invalidateQueries({ queryKey: bootingKeys.heartsReceived }),
      queryClient.invalidateQueries({ queryKey: bootingKeys.heartsUnread }),
    ]);
  };

  return {
    save: useMutation({ mutationFn: savedApi.save, onSuccess: invalidate }),
    unsave: useMutation({ mutationFn: savedApi.unsave, onSuccess: invalidate }),
  };
}
