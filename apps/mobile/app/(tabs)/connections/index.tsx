import { useConnections } from '@features/connections';
import { theme } from '@shared/config/colors';
import {
  CONNECTION_FILTERS,
  type ConnectionStatus,
} from '@shared/config/connectionStatus';
import { HIT_SIZE, radius, spacing, typography } from '@shared/config/tokens';
import {
  ConnectionStatusBadge,
  EmptyState,
  ParentProfileCard,
  Screen,
  SkeletonList,
} from '@shared/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

export default function ConnectionsScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<ConnectionStatus | 'all'>('all');
  const { data: connections, isLoading, isError, refetch } = useConnections(filter);

  return (
    <Screen>
      <View style={styles.chips}>
        {CONNECTION_FILTERS.map((chip) => {
          const selected = filter === chip.key;
          return (
            <Pressable
              key={chip.key}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={chip.label}
              onPress={() => setFilter(chip.key)}
              style={({ pressed }) => [
                styles.chip,
                selected && styles.chipSelected,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {chip.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {isLoading ? (
        <SkeletonList rows={4} />
      ) : isError ? (
        <EmptyState
          icon="exclamation-circle"
          title="인연 목록을 불러오지 못했습니다"
          cta={{ label: '다시 시도', onPress: () => void refetch() }}
        />
      ) : !connections?.length ? (
        <EmptyState
          icon="comments-o"
          title={filter === 'all' ? '아직 연결된 인연이 없습니다' : '해당 상태의 인연이 없습니다'}
          description={
            filter === 'all'
              ? '서로 관심을 보내면 자녀분끼리 대화를 시작할 수 있습니다.'
              : undefined
          }
          cta={
            filter === 'all'
              ? { label: '추천 보러 가기', onPress: () => router.push('/(tabs)/home') }
              : { label: '전체 보기', onPress: () => setFilter('all') }
          }
          testID="connections-empty"
        />
      ) : (
        <FlatList
          data={connections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${item.partner.nickname} 님과의 대화`}
              onPress={() => router.push(`/(tabs)/connections/${item.id}`)}
              style={({ pressed }) => [styles.rowWrap, pressed && styles.pressed]}
              testID={`connection-${item.id}`}
            >
              <ParentProfileCard profile={item.partner} variant="list" />
              <View style={styles.meta}>
                <ConnectionStatusBadge status={item.status} />
                {item.lastMessage ? (
                  <Text style={styles.preview} numberOfLines={1}>
                    {item.lastMessage.mine ? '나: ' : ''}
                    {item.lastMessage.body}
                  </Text>
                ) : (
                  <Text style={styles.previewMuted}>아직 대화가 없습니다</Text>
                )}
                {item.unreadCount > 0 ? (
                  <View style={styles.unread}>
                    <Text style={styles.unreadText}>{item.unreadCount}</Text>
                  </View>
                ) : null}
              </View>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xxs, paddingVertical: spacing.xs },
  chip: {
    minHeight: HIT_SIZE - 8,
    paddingHorizontal: spacing.sm,
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  chipSelected: { backgroundColor: theme.colors.primary },
  chipText: { ...typography.caption, color: theme.colors.textSecondary },
  chipTextSelected: { color: '#FFFFFF', fontWeight: '600' },
  list: { gap: spacing.sm, paddingVertical: spacing.xs },
  rowWrap: { gap: spacing.xxs },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingLeft: spacing.xxs },
  preview: { ...typography.caption, color: theme.colors.textTertiary, flex: 1 },
  previewMuted: { ...typography.caption, color: theme.colors.textMuted, flex: 1 },
  unread: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.error,
  },
  unreadText: { ...typography.micro, color: '#FFFFFF' },
  pressed: { opacity: 0.85 },
});
