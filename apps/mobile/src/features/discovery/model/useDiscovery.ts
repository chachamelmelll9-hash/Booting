import { bootingKeys, discoveryApi, heartsApi } from '@shared/api/booting';
import type { DiscoveryFilter } from '@shared/api/booting.types';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect } from 'react';

import { useDiscoveryFilterStore } from './useDiscoveryFilterStore';

/**
 * 저장된 필터를 스토어에 한 번 싣는다.
 * 서버가 필터의 정본이고 스토어는 화면 간 공유용 사본이다.
 */
export function useHydratedFilter() {
  const { filter, hydrated, replace } = useDiscoveryFilterStore();
  const query = useQuery({
    queryKey: bootingKeys.discoveryFilter,
    queryFn: discoveryApi.getFilter,
  });

  useEffect(() => {
    if (query.data && !hydrated) replace(query.data);
  }, [query.data, hydrated, replace]);

  return { filter, isLoading: query.isLoading };
}

export function useSaveFilter() {
  const queryClient = useQueryClient();
  const replace = useDiscoveryFilterStore((s) => s.replace);

  return useMutation({
    mutationFn: (filter: DiscoveryFilter) => discoveryApi.saveFilter(filter),
    onSuccess: async (saved) => {
      replace(saved);
      // 조건이 바뀌면 이전 페이지들은 전부 의미가 없다
      await queryClient.invalidateQueries({ queryKey: bootingKeys.discovery });
    },
  });
}

export function useDiscoveryFeed() {
  return useInfiniteQuery({
    queryKey: bootingKeys.discovery,
    queryFn: ({ pageParam }) => discoveryApi.feed(pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

export function usePublicProfile(profileId: string | undefined) {
  return useQuery({
    queryKey: bootingKeys.publicProfile(profileId ?? ''),
    queryFn: () => discoveryApi.profile(profileId as string),
    enabled: !!profileId,
  });
}

/**
 * 관심 보내기 / 넘기기.
 *
 * 두 동작 모두 성공하면 추천 피드를 무효화한다 — 서버 제외 집합이 바뀌었으므로
 * 클라이언트가 임의로 카드를 지우면 다음 페이지 커서와 어긋난다.
 */
export function useHeartActions() {
  const queryClient = useQueryClient();

  const invalidateFeed = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: bootingKeys.discovery }),
      queryClient.invalidateQueries({ queryKey: bootingKeys.connections() }),
    ]);
  };

  const sendHeart = useMutation({
    mutationFn: heartsApi.send,
    onSuccess: invalidateFeed,
  });

  const pass = useMutation({
    mutationFn: heartsApi.pass,
    onSuccess: invalidateFeed,
  });

  return { sendHeart, pass };
}
