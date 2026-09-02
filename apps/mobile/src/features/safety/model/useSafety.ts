import { bootingKeys, safetyApi } from '@shared/api/booting';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export function useReports() {
  return useQuery({ queryKey: bootingKeys.reports, queryFn: safetyApi.listReports });
}

/**
 * 신고·차단.
 *
 * 차단은 추천 피드와 인연 목록을 함께 무효화한다 — 서버가 인연도 종료시키기
 * 때문에, 목록만 그대로 두면 이미 끝난 대화가 화면에 살아 있게 된다.
 *
 * **신고도 서버에서 차단을 포함**하므로 같은 목록을 무효화한다. 신고 직후
 * 대화방과 추천 카드가 그대로 남아 있으면 신고가 먹지 않은 것으로 보인다.
 */
export function useSafetyMutations() {
  const queryClient = useQueryClient();

  const invalidateAfterBlock = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: bootingKeys.blocks }),
      queryClient.invalidateQueries({ queryKey: bootingKeys.discovery }),
      queryClient.invalidateQueries({ queryKey: bootingKeys.connections() }),
      queryClient.invalidateQueries({ queryKey: bootingKeys.heartsReceived }),
    ]);
  };

  return {
    report: useMutation({
      mutationFn: ({
        targetProfileId,
        reason,
        detail,
      }: {
        targetProfileId: string;
        reason: string;
        detail?: string;
      }) => safetyApi.report(targetProfileId, reason, detail),
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: bootingKeys.reports });
        await invalidateAfterBlock();
      },
    }),
    block: useMutation({
      mutationFn: safetyApi.block,
      onSuccess: invalidateAfterBlock,
    }),
    unblock: useMutation({
      mutationFn: safetyApi.unblock,
      onSuccess: invalidateAfterBlock,
    }),
  };
}
