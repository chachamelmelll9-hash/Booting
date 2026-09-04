import { parentApi, parentKeys } from '@shared/api/parent';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useParentSession } from './useParentSession';

/** 자녀가 보내주신 프로필 목록 */
export function useParentInbox() {
  const token = useParentSession((s) => s.token);
  return useQuery({
    queryKey: parentKeys.inbox,
    queryFn: () => parentApi.inbox(token as string),
    enabled: !!token,
  });
}

/** 한 장 상세 — 사진 전부와 생활 정보까지 */
export function useParentProfileDetail(connectionId: string) {
  const token = useParentSession((s) => s.token);
  return useQuery({
    queryKey: parentKeys.detail(connectionId),
    queryFn: () => parentApi.detail(token as string, connectionId),
    enabled: !!token && !!connectionId,
  });
}

/**
 * 부모님이 카드에서 하는 세 가지.
 *
 * 모두 목록을 다시 불러온다 — 결정 하나가 카드의 강조·버튼·연락처를 한꺼번에
 * 바꾸므로, 화면에서 부분만 손대면 어긋난 상태가 남는다.
 */
export function useParentActions() {
  const token = useParentSession((s) => s.token) as string;
  const queryClient = useQueryClient();
  // ['parent'] 프리픽스 — 목록과 열려 있는 상세를 함께 갱신한다
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['parent'] });

  // '봤다' 기록은 서버가 상세를 내주면서 함께 찍는다 — 앱이 따로 부르지 않는다.
  // 따로 부르면 그 요청만 실패했을 때 초록 강조가 계속 남는다 (실측).
  return {
    express: useMutation({
      mutationFn: (connectionId: string) => parentApi.express(token, connectionId),
      onSuccess: invalidate,
    }),
    decline: useMutation({
      mutationFn: (connectionId: string) => parentApi.decline(token, connectionId),
      onSuccess: invalidate,
    }),
  };
}
