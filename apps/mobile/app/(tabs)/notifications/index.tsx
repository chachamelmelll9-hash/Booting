import {
  notificationHref,
  notificationTitle,
  useMarkAllRead,
  useNotifications,
} from '@features/notifications';
import { theme } from '@shared/config/colors';
import { radius, spacing, typography } from '@shared/config/tokens';
import { EmptyState, Screen, SkeletonList } from '@shared/ui';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

export default function NotificationsScreen() {
  const router = useRouter();
  const notifications = useNotifications();
  const { mutate: markAllRead } = useMarkAllRead();

  const items = useMemo(
    () => notifications.data?.pages.flatMap((page) => page.items) ?? [],
    [notifications.data]
  );
  const hasUnread = items.some((item) => !item.read);

  /**
   * 이 화면을 보고 나가면 읽음 처리한다 = 홈 헤더의 빨간 점이 꺼진다.
   *
   * 열자마자(포커스 시점) 처리하지 않는 이유: 안 읽은 알림의 강조 테두리가
   * 눈앞에서 사라져, 방금 뭐가 새로 왔는지 확인할 수가 없다. 나갈 때 처리하면
   * 보는 동안은 강조가 남고 돌아온 홈에서는 점이 꺼져 있다.
   */
  useFocusEffect(
    useCallback(() => {
      return () => {
        if (hasUnread) markAllRead();
      };
    }, [hasUnread, markAllRead])
  );

  if (notifications.isLoading) {
    return (
      <Screen>
        <SkeletonList rows={4} />
      </Screen>
    );
  }

  if (!items.length) {
    return (
      <Screen>
        <EmptyState
          icon="bell-o"
          title="알림이 없습니다"
          description="관심을 받거나 대화가 연결되면 여기에 표시됩니다."
          testID="notifications-empty"
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        onEndReached={() => {
          if (notifications.hasNextPage && !notifications.isFetchingNextPage) {
            void notifications.fetchNextPage();
          }
        }}
        renderItem={({ item }) => {
          const href = notificationHref(item);
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={notificationTitle(item)}
              disabled={!href}
              onPress={() => href && router.push(href as never)}
              style={({ pressed }) => [
                styles.row,
                !item.read && styles.rowUnread,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.title}>{notificationTitle(item)}</Text>
              <Text style={styles.date}>{formatRelative(item.createdAt)}</Text>
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}

function formatRelative(iso: string): string {
  const diffMinutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (diffMinutes < 1) return '방금';
  if (diffMinutes < 60) return `${diffMinutes}분 전`;
  const hours = Math.floor(diffMinutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

const styles = StyleSheet.create({
  list: { gap: spacing.xs, paddingTop: spacing.xs, paddingBottom: spacing.lg },
  row: {
    backgroundColor: theme.colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: spacing.md,
    gap: 2,
  },
  rowUnread: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primarySurface },
  title: { ...typography.body, color: theme.colors.text },
  date: { ...typography.micro, color: theme.colors.textMuted },
  pressed: { opacity: 0.85 },
});
