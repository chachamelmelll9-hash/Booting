import { useReceivedHearts, useSendHeartBack } from '@features/hearts';
import { theme } from '@shared/config/colors';
import { spacing, typography } from '@shared/config/tokens';
import {
  EmptyState,
  HeartActionBar,
  ParentProfileCard,
  Screen,
  SkeletonList,
  useToast,
} from '@shared/ui';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

/**
 * 받은 관심.
 *
 * 여기서 하트를 되보내면 상호 하트가 되어 대화가 열린다. 그 시점의 문구는
 * '대화 연결'이지 '매칭 성공'이 아니다 — 시트(`/matched/[id]`)가 그 문구를 쥐고 있다.
 */
export default function HeartsScreen() {
  const router = useRouter();
  const toast = useToast();
  const hearts = useReceivedHearts();
  const sendBack = useSendHeartBack();

  const items = useMemo(
    () => hearts.data?.pages.flatMap((page) => page.items) ?? [],
    [hearts.data]
  );

  if (hearts.isLoading) {
    return (
      <Screen>
        <SkeletonList rows={4} />
      </Screen>
    );
  }

  if (hearts.isError) {
    return (
      <Screen>
        <EmptyState
          icon="exclamation-circle"
          title="받은 관심을 불러오지 못했습니다"
          cta={{ label: '다시 시도', onPress: () => void hearts.refetch() }}
        />
      </Screen>
    );
  }

  if (!items.length) {
    return (
      <Screen>
        <EmptyState
          icon="heart-o"
          title="아직 받은 관심이 없습니다"
          description="부모님 프로필이 공개되어 있으면 다른 자녀분들이 보고 관심을 보낼 수 있습니다."
          testID="hearts-empty"
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <FlatList
        data={items}
        keyExtractor={(item) => item.heartId}
        contentContainerStyle={styles.list}
        onEndReached={() => {
          if (hearts.hasNextPage && !hearts.isFetchingNextPage) void hearts.fetchNextPage();
        }}
        renderItem={({ item }) => (
          <View style={[styles.row, !item.read && styles.rowUnread]}>
            <ParentProfileCard
              profile={item.profile}
              variant="list"
              onPress={() => router.push(`/profile/${item.profile.profileId}`)}
            />
            <View style={styles.actions}>
              <HeartActionBar
                layout="row"
                onHeart={() =>
                  sendBack.mutate(item.profile.profileId, {
                    onSuccess: (result) => {
                      if (result.mutual && result.connectionId) {
                        router.push(`/matched/${result.connectionId}`);
                      } else {
                        toast.show({ message: '관심을 보냈습니다' });
                      }
                    },
                    onError: (error: Error) => toast.show({ message: error.message }),
                  })
                }
                onPass={() => router.push(`/profile/${item.profile.profileId}`)}
                busy={sendBack.isPending}
              />
            </View>
          </View>
        )}
        ListFooterComponent={
          hearts.isFetchingNextPage ? <Text style={styles.more}>더 불러오는 중…</Text> : null
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingVertical: spacing.sm, gap: spacing.sm },
  row: { gap: spacing.xs },
  rowUnread: {
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
    paddingLeft: spacing.xs,
  },
  actions: { paddingHorizontal: spacing.xxs },
  more: {
    ...typography.caption,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
});
