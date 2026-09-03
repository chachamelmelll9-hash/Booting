import { ParentShareButton, useConnections } from '@features/connections';
import { theme } from '@shared/config/colors';
import {
  CONNECTION_FILTERS,
  type ConnectionFilterKey,
  matchesFilter,
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
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

export default function ConnectionsScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<ConnectionFilterKey>('all');

  /**
   * 목록은 항상 통째로 받아 화면에서 거른다.
   *
   * 칩 하나가 상태 여러 개를 묶고 있어서 서버 쿼리로 나누려면 상태 목록을
   * 쿼리 문자열로 넘겨야 하는데, 인연은 많아야 수십 건이라 그럴 값어치가 없다.
   * 칩을 바꿀 때마다 재요청도 사라진다.
   */
  const { data: all, isLoading, isError, refetch } = useConnections('all');
  const connections = useMemo(
    () => (all ?? []).filter((c) => matchesFilter(c.status, filter)),
    [all, filter]
  );

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
          title="매칭 목록을 불러오지 못했습니다"
          cta={{ label: '다시 시도', onPress: () => void refetch() }}
        />
      ) : !connections?.length ? (
        <EmptyState
          icon="comments-o"
          title={filter === 'all' ? '아직 연결된 분이 없습니다' : '아직 매칭된 분이 없습니다'}
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
            /**
             * 공유 버튼은 카드를 여는 Pressable **밖**에 둔다. 안에 넣으면 버튼을
             * 눌렀을 때 대화방까지 함께 열린다.
             */
            <View
              style={[styles.rowWrap, item.unseen && styles.rowWrapUnseen]}
              testID={`connection-${item.id}`}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${item.partner.nickname} 님과의 대화${item.unseen ? ', 확인하지 않음' : ''}${item.sharedWithParent ? ', 부모님께 공유함' : ''}`}
                onPress={() => router.push(`/(tabs)/connections/${item.id}`)}
                style={({ pressed }) => [
                  styles.rowTap,
                  // 부모님께 넘긴 카드는 한 톤 죽인다 — 내 손을 떠난 건이라
                  // 아직 결정이 남은 카드들 사이에서 눈에 덜 걸려야 한다
                  item.sharedWithParent && styles.rowShared,
                  pressed && styles.pressed,
                ]}
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

              <ParentShareButton connection={item} />
            </View>
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
  /**
   * 테두리를 평소에도 투명하게 깔아 둔다 — 확인하면 테두리가 사라지는데,
   * 그때 두께가 바뀌면 목록 전체가 한 칸 밀린다.
   */
  rowWrap: {
    gap: spacing.xs,
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: radius.lg,
    padding: spacing.xxs,
  },
  rowTap: { gap: spacing.xxs },
  rowShared: { opacity: 0.5 },
  rowWrapUnseen: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySurface,
  },
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
    // 탭 배지와 같은 색 — 빨강은 위험 신호 전용으로 남긴다
    backgroundColor: theme.colors.primaryDark,
  },
  unreadText: { ...typography.micro, color: '#FFFFFF' },
  pressed: { opacity: 0.85 },
});
