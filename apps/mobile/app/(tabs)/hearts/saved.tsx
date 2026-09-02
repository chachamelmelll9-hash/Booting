import { useHeartActions } from '@features/discovery';
import { useSavedMutations, useSavedProfiles, useSavedSeenStore } from '@features/hearts';
import { theme } from '@shared/config/colors';
import { radius, spacing, typography } from '@shared/config/tokens';
import {
  AppButton,
  EmptyState,
  HeartMessageSheet,
  ParentProfileCard,
  Screen,
  SkeletonList,
  useToast,
} from '@shared/ui';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

/**
 * 보관함 — 찜해둔 프로필.
 *
 * 받은 관심 덱에서 "지금은 결정하기 어렵다"고 미뤄둔 분들이 여기 쌓인다.
 * 여기서 할 수 있는 건 둘뿐이다: 다시 보고 관심을 보내거나, 찜을 풀거나.
 * 찜을 풀면 받은 관심 목록으로 돌아간다 — 없애는 게 아니라 되돌리는 것이다.
 */
export default function SavedScreen() {
  const router = useRouter();
  const toast = useToast();
  const { data: saved, isLoading, isError, refetch } = useSavedProfiles();
  const { unsave } = useSavedMutations();
  const { sendHeart } = useHeartActions();
  const markSeen = useSavedSeenStore((s) => s.markSeen);
  const [composeFor, setComposeFor] = useState<string | null>(null);

  const target = saved?.find((item) => item.profile.profileId === composeFor);

  /**
   * 이 화면을 보고 나가면 헤더 배지를 끈다.
   *
   * 들어오자마자 끄지 않는 이유는 알림 화면과 같다 — 새로 담긴 게 뭔지
   * 확인하기도 전에 표시가 사라지면 왜 떴는지 알 수가 없다.
   */
  useFocusEffect(
    useCallback(() => {
      return () => markSeen();
    }, [markSeen])
  );

  if (isLoading) {
    return (
      <Screen>
        <SkeletonList rows={3} />
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen>
        <EmptyState
          icon="exclamation-circle"
          title="보관함을 불러오지 못했습니다"
          cta={{ label: '다시 시도', onPress: () => void refetch() }}
        />
      </Screen>
    );
  }

  if (!saved?.length) {
    return (
      <Screen>
        <EmptyState
          icon="archive"
          title="보관함이 비어 있습니다"
          description="받은 관심에서 '찜해놓기'를 누르면 여기에 담아두고 나중에 다시 보실 수 있습니다."
          cta={{ label: '받은 관심 보기', onPress: () => router.back() }}
          testID="saved-empty"
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={styles.note}>
        찜은 매칭이 아닙니다. 상대는 알지 못하고, 찜을 풀면 받은 관심으로 돌아갑니다.
      </Text>

      <FlatList
        data={saved}
        keyExtractor={(item) => item.profile.profileId}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${item.profile.nickname} 님 프로필 보기`}
              onPress={() => router.push(`/profile/${item.profile.profileId}`)}
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
              testID={`saved-${item.profile.profileId}`}
            >
              <ParentProfileCard profile={item.profile} variant="list" />
              <Text style={styles.date}>{formatDate(item.savedAt)} 찜</Text>
            </Pressable>

            <View style={styles.actions}>
              <AppButton
                label="찜 풀기"
                variant="ghost"
                fullWidth={false}
                onPress={() =>
                  unsave.mutate(item.profile.profileId, {
                    onSuccess: () => toast.show({ message: '받은 관심으로 되돌렸습니다' }),
                    onError: (error: Error) => toast.show({ message: error.message }),
                  })
                }
              />
              <AppButton
                label="관심 보내기"
                fullWidth={false}
                onPress={() => setComposeFor(item.profile.profileId)}
                testID={`saved-heart-${item.profile.profileId}`}
              />
            </View>
          </View>
        )}
      />

      <HeartMessageSheet
        visible={!!target}
        toName={target?.profile.nickname}
        busy={sendHeart.isPending}
        onDismiss={() => setComposeFor(null)}
        onSend={(message) => {
          if (!target) return;
          sendHeart.mutate(
            { targetProfileId: target.profile.profileId, message },
            {
              onSuccess: (result) => {
                setComposeFor(null);
                // 관심을 보냈으면 보류가 끝났다 — 보관함에서 뺀다
                unsave.mutate(target.profile.profileId);
                if (result.mutual && result.connectionId) {
                  router.push(`/matched/${result.connectionId}`);
                } else {
                  toast.show({ message: '관심을 보냈습니다' });
                }
              },
              onError: (error: Error) => toast.show({ message: error.message }),
            }
          );
        }}
      />
    </Screen>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

const styles = StyleSheet.create({
  note: {
    ...typography.caption,
    color: theme.colors.textTertiary,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginTop: spacing.xs,
  },
  list: { gap: spacing.md, paddingVertical: spacing.sm },
  row: { gap: spacing.xs },
  card: { gap: spacing.xxs },
  date: { ...typography.micro, color: theme.colors.textMuted, paddingLeft: spacing.xxs },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.xs },
  pressed: { opacity: 0.85 },
});
