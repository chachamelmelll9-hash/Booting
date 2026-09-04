import { useParentInbox, useParentSession } from '@features/parent-view';
import { parentApi } from '@shared/api/parent';
import { theme } from '@shared/config/colors';
import { radius, spacing, typography } from '@shared/config/tokens';
import {
  EmptyState,
  ParentProfileCard,
  Screen,
  SkeletonList,
} from '@shared/ui';
import { useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

/**
 * 부모님 홈 — 자녀분이 보내신 프로필이 쌓인다.
 *
 * 추천도 검색도 대화도 없다. 자녀가 골라서 건넨 것만 차례로 본다.
 * 아직 안 열어보신 카드는 **초록 테두리**로 남는다 — 어디까지 보셨는지
 * 매번 기억하실 필요가 없어야 한다.
 */
export default function ParentHomeScreen() {
  const router = useRouter();
  const nickname = useParentSession((s) => s.nickname);
  const token = useParentSession((s) => s.token);
  const signOut = useParentSession((s) => s.signOut);
  const { data: items, isLoading, isError, refetch } = useParentInbox();

  const header = (
    <View style={styles.header}>
      <Text style={styles.greeting}>{nickname} 님, 안녕하세요</Text>
      <Text style={styles.subtitle}>자녀분이 보내신 프로필입니다</Text>
    </View>
  );

  if (isLoading) {
    return (
      <Screen>
        {header}
        <SkeletonList rows={3} />
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen>
        {header}
        <EmptyState
          icon="exclamation-circle"
          title="불러오지 못했습니다"
          description="잠시 후 다시 시도해 주세요."
          cta={{ label: '다시 시도', onPress: () => void refetch() }}
        />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <View style={styles.pad}>{header}</View>

      {!items?.length ? (
        <View style={styles.pad}>
          <EmptyState
            icon="inbox"
            title="아직 받으신 프로필이 없습니다"
            description="자녀분이 프로필을 보내드리면 여기에 하나씩 쌓입니다."
            testID="parent-inbox-empty"
          />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.connectionId}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable
              testID={`parent-card-${item.connectionId}`}
              accessibilityRole="button"
              accessibilityLabel={`${item.profile.nickname} 님 프로필${item.unseen ? ', 아직 안 보심' : ''}`}
              onPress={() => router.push(`/(parent)/profile/${item.connectionId}`)}
              style={({ pressed }) => [
                styles.card,
                // 아직 안 열어보신 카드 — 초록 강조
                item.unseen && styles.cardUnseen,
                item.matched && styles.cardMatched,
                pressed && styles.pressed,
              ]}
            >
              <ParentProfileCard profile={item.profile} variant="list" />
              <View style={styles.metaRow}>
                {item.matched ? (
                  /* 상대가 나중에 눌러 성사된 경우, 부모님이 이 목록에서
                     처음 아신다 — 팝업을 못 보셨을 수 있으니 여기서 이름과
                     함께 분명히 말한다 */
                  <Text style={styles.matched}>
                    {item.profile.nickname} 님과 마음이 통했습니다 · 연락처 보기
                  </Text>
                ) : item.interested ? (
                  <Text style={styles.waiting}>
                    {item.profile.nickname} 님의 답을 기다리고 있습니다
                  </Text>
                ) : item.unseen ? (
                  <Text style={styles.new}>새로 받으신 프로필</Text>
                ) : (
                  <Text style={styles.seen}>확인하신 프로필</Text>
                )}
              </View>
            </Pressable>
          )}
        />
      )}

      <Pressable
        accessibilityRole="button"
        style={styles.signOut}
        onPress={() => {
          if (token) void parentApi.logout(token).catch(() => undefined);
          signOut();
          router.replace('/(parent)/code');
        }}
      >
        <Text style={styles.signOutText}>나가기</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: spacing.md },
  header: { paddingTop: spacing.lg, paddingBottom: spacing.md, gap: 6 },
  greeting: { ...typography.display, color: theme.colors.text },
  subtitle: { ...typography.subheading, color: theme.colors.textSecondary },
  list: { paddingHorizontal: spacing.md, paddingBottom: spacing.lg, gap: spacing.md },
  card: {
    gap: spacing.xs,
    borderWidth: 3,
    borderColor: 'transparent',
    borderRadius: radius.lg,
    padding: spacing.xxs,
  },
  /**
   * '안 본 것' 과 '성사됨' 은 **채움으로** 가른다.
   *
   * 예전에는 둘 다 배경이 `#F0FDFA` 로 같고 테두리만 한 톤 달랐다. 그래서 성사된
   * 카드를 열어 봐도 강조가 그대로인 것처럼 보였다 — 부모님은 "봤는데 왜 아직
   * 새 거지" 하신다 (실측). 색조는 브랜드 민트 하나로 두되(빨강은 위험 전용),
   * 안 본 것은 **흰 바탕에 윤곽선**, 성사된 것은 **민트로 채운다.** 한눈에 다르다.
   */
  cardUnseen: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surface,
  },
  // 성사된 카드는 채워서 가장 강하게 — 이 목록에서 가장 중요한 한 장이다
  cardMatched: {
    borderColor: theme.colors.primaryDark,
    backgroundColor: theme.colors.primaryLight,
  },
  metaRow: { paddingLeft: spacing.xxs },
  new: { ...typography.bodyStrong, color: theme.colors.primaryDark },
  matched: { ...typography.bodyStrong, color: theme.colors.primaryDark },
  waiting: { ...typography.body, color: theme.colors.textTertiary },
  seen: { ...typography.body, color: theme.colors.textMuted },
  signOut: { alignSelf: 'center', padding: spacing.md },
  signOutText: { ...typography.body, color: theme.colors.textMuted, textDecorationLine: 'underline' },
  pressed: { opacity: 0.85 },
});
