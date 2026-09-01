import {
  notificationHref,
  notificationTitle,
  useMarkAllRead,
  useNotifications,
} from '@features/notifications';
import { theme } from '@shared/config/colors';
import { radius, spacing, typography } from '@shared/config/tokens';
import { AppButton, EmptyState, Screen, SkeletonList } from '@shared/ui';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

export default function NotificationsScreen() {
  const router = useRouter();
  const notifications = useNotifications();
  const markAllRead = useMarkAllRead();

  const items = useMemo(
    () => notifications.data?.pages.flatMap((page) => page.items) ?? [],
    [notifications.data]
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
      <View style={styles.toolbar}>
        <AppButton
          label="모두 읽음"
          variant="ghost"
          fullWidth={false}
          loading={markAllRead.isPending}
          onPress={() => markAllRead.mutate()}
        />
      </View>

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
              accessibilityLabel={notificationTitle(item.type)}
              disabled={!href}
              onPress={() => href && router.push(href as never)}
              style={({ pressed }) => [
                styles.row,
                !item.read && styles.rowUnread,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.title}>{notificationTitle(item.type)}</Text>
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
  toolbar: { alignItems: 'flex-end' },
  list: { gap: spacing.xs, paddingBottom: spacing.lg },
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
