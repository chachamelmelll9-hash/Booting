import { bootingKeys, meetingsApi } from '@shared/api/booting';
import type { MeetingFeedbackKind, ParentIntentKind } from '@shared/api/booting.types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export function useMeeting(connectionId: string | undefined) {
  return useQuery({
    queryKey: bootingKeys.meeting(connectionId ?? ''),
    queryFn: () => meetingsApi.get(connectionId as string),
    enabled: !!connectionId,
  });
}

/**
 * 만남 관련 쓰기 동작.
 *
 * `confirm` 의 반환값 `connectionStatus` 는 **서버가 판정한 값**이다.
 * 여기서 두 건이 모였는지 세지 않는다 — 세는 순간 클라이언트가 매칭을
 * 판정하는 두 번째 지점이 생긴다.
 */
export function useMeetingMutations(connectionId: string) {
  const queryClient = useQueryClient();

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: bootingKeys.meeting(connectionId) }),
      queryClient.invalidateQueries({ queryKey: bootingKeys.connection(connectionId) }),
      queryClient.invalidateQueries({ queryKey: bootingKeys.connections() }),
    ]);
  };

  return {
    setParentIntent: useMutation({
      mutationFn: (intent: ParentIntentKind) =>
        meetingsApi.setParentIntent(connectionId, intent),
      onSuccess: invalidate,
    }),
    propose: useMutation({
      mutationFn: (body: {
        meetAt: string;
        place: string;
        childAccompanied: boolean;
        soloReason?: string;
        safetyAck?: boolean;
      }) => meetingsApi.propose(connectionId, body),
      onSuccess: invalidate,
    }),
    accept: useMutation({
      mutationFn: () => meetingsApi.accept(connectionId),
      onSuccess: invalidate,
    }),
    confirm: useMutation({
      mutationFn: () => meetingsApi.confirm(connectionId),
      onSuccess: invalidate,
    }),
    sendFeedback: useMutation({
      mutationFn: (response: MeetingFeedbackKind) =>
        meetingsApi.sendFeedback(connectionId, response),
      onSuccess: invalidate,
    }),
  };
}
