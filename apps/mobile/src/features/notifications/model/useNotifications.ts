import { bootingKeys, notificationsApi } from '@shared/api/booting';
import type { AppNotification, NotificationKind } from '@shared/api/booting.types';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export function useNotifications() {
  return useInfiniteQuery({
    queryKey: bootingKeys.notifications,
    queryFn: ({ pageParam }) => notificationsApi.list(pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

export function useNotificationsUnread() {
  return useQuery({
    queryKey: bootingKeys.notificationsUnread,
    queryFn: notificationsApi.unreadCount,
    refetchInterval: 30_000,
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: bootingKeys.notifications }),
        queryClient.invalidateQueries({ queryKey: bootingKeys.notificationsUnread }),
      ]);
    },
  });
}

/** 알림 문구 — 서버는 코드값만 보내고 표현은 클라이언트가 정한다 */
const TITLES: Record<NotificationKind, string> = {
  heart_received: '관심을 받았습니다',
  mutual_heart: '대화가 연결되었습니다',
  message: '새 메시지가 도착했습니다',
  parent_intent: '상대 부모님의 의사가 전달되었습니다',
  meeting_proposed: '만남 일정이 제안되었습니다',
  meeting_accepted: '만남 일정이 확정되었습니다',
  meeting_confirm_request: '만남은 어떠셨나요?',
  meeting_confirm_reminder: '만남 확인이 아직 남아 있습니다',
  matched: '양측 모두 만남을 확인했습니다',
  profile_approved: '부모님 프로필이 공개되었습니다',
  profile_rejected: '프로필 검수가 반려되었습니다',
  profile_auto_hidden: '오래 활동이 없어 프로필이 비공개로 전환되었습니다',
  conversation_read_only: '대화 기간이 지나 읽기 전용으로 전환되었습니다',
};

/**
 * 상대가 있는 알림은 이름을 앞에 붙인다.
 *
 * "대화가 연결되었습니다" 만으로는 누구인지 몰라 알림을 열고 대화방까지
 * 들어가 봐야 안다. 이름은 알림이 답해야 할 첫 번째 질문이다.
 * 프로필 검수처럼 상대가 없는 알림은 그대로 둔다.
 */
const WITH_NAME: Partial<Record<NotificationKind, (name: string) => string>> = {
  heart_received: (n) => `${n} 님이 관심을 보냈습니다`,
  mutual_heart: (n) => `${n} 님과 대화가 연결되었습니다`,
  message: (n) => `${n} 님이 메시지를 보냈습니다`,
  parent_intent: (n) => `${n} 님 부모님의 의사가 전달되었습니다`,
  meeting_proposed: (n) => `${n} 님과의 만남 일정이 제안되었습니다`,
  meeting_accepted: (n) => `${n} 님과의 만남 일정이 확정되었습니다`,
  meeting_confirm_request: (n) => `${n} 님과의 만남은 어떠셨나요?`,
  meeting_confirm_reminder: (n) => `${n} 님과의 만남 확인이 아직 남아 있습니다`,
  matched: (n) => `${n} 님과의 만남을 양측 모두 확인했습니다`,
  conversation_read_only: (n) => `${n} 님과의 대화가 읽기 전용으로 전환되었습니다`,
};

export function notificationTitle(notification: AppNotification): string {
  const withName = notification.nickname && WITH_NAME[notification.type];
  if (withName && notification.nickname) return withName(notification.nickname);
  return TITLES[notification.type] ?? '새 알림';
}

/** 알림 → 이동할 경로 */
export function notificationHref(notification: AppNotification): string | null {
  if (notification.connectionId) {
    return `/(tabs)/connections/${notification.connectionId}`;
  }
  if (notification.type === 'heart_received') return '/(tabs)/hearts';
  if (['profile_approved', 'profile_rejected', 'profile_auto_hidden'].includes(notification.type)) {
    return '/(tabs)/profile/parent';
  }
  return null;
}
