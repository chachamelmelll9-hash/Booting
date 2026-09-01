import { bootingKeys, connectionsApi } from '@shared/api/booting';
import type { ConnectionStatus } from '@shared/config/connectionStatus';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

export function useConnections(status?: ConnectionStatus | 'all') {
  const effective = !status || status === 'all' ? undefined : status;
  return useQuery({
    queryKey: bootingKeys.connections(effective),
    queryFn: () => connectionsApi.list(effective),
  });
}

export function useConnection(connectionId: string | undefined) {
  return useQuery({
    queryKey: bootingKeys.connection(connectionId ?? ''),
    queryFn: () => connectionsApi.get(connectionId as string),
    enabled: !!connectionId,
  });
}

export function useMessages(connectionId: string | undefined) {
  return useInfiniteQuery({
    queryKey: bootingKeys.messages(connectionId ?? ''),
    queryFn: ({ pageParam }) =>
      connectionsApi.messages(connectionId as string, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!connectionId,
    // Realtime 구독 대신 짧은 폴링을 쓴다. 대화량이 적고(하루 몇 통),
    // 소켓 연결 수명 관리를 여기서 하지 않아도 되는 편이 훨씬 단순하다.
    refetchInterval: 5_000,
  });
}

export function useSendMessage(connectionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: string) => connectionsApi.sendMessage(connectionId, body),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: bootingKeys.messages(connectionId) }),
        queryClient.invalidateQueries({ queryKey: bootingKeys.connection(connectionId) }),
        queryClient.invalidateQueries({ queryKey: bootingKeys.connections() }),
      ]);
    },
  });
}

export function useEndConnection(connectionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reason?: string) => connectionsApi.end(connectionId, reason),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: bootingKeys.connection(connectionId) }),
        queryClient.invalidateQueries({ queryKey: bootingKeys.connections() }),
      ]);
    },
  });
}
