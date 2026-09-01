import FontAwesome from '@expo/vector-icons/FontAwesome';
import {
  radiusLabel,
  useDiscoveryFeed,
  useHeartActions,
  useHydratedFilter,
} from '@features/discovery';
import { useNotificationsUnread } from '@features/notifications';
import { nextSetupStep, useParentProfile, useVerification } from '@features/parent-profile';
import { theme } from '@shared/config/colors';
import { HIT_SIZE, radius, spacing, typography } from '@shared/config/tokens';
import {
  EmptyState,
  HeartActionBar,
  ParentProfileCard,
  Screen,
  SkeletonList,
  useToast,
} from '@shared/ui';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

/**
 * 홈 — 추천 피드.
 *
 * 카드 스택은 **탭으로도 전부 조작된다.** 스와이프 전용으로 만들면 손 떨림이
 * 있는 사용자가 아예 못 쓴다 (test-scenarios S11.4 가 탭만으로 완주한다).
 */
export default function HomeScreen() {
  const router = useRouter();
  const toast = useToast();

  const { data: verification } = useVerification();
  const { data: profile, isLoading: profileLoading } = useParentProfile();
  const { filter } = useHydratedFilter();
  const { data: unread } = useNotificationsUnread();

  const setupStep = nextSetupStep(verification, profile);
  const ready = setupStep === 'done';

  const feed = useDiscoveryFeed();
  const { sendHeart, pass } = useHeartActions();
  const [index, setIndex] = useState(0);

  const cards = useMemo(
    () => feed.data?.pages.flatMap((page) => page.items) ?? [],
    [feed.data]
  );
  const current = cards[index];

  const advance = () => {
    setIndex((i) => i + 1);
    // 남은 카드가 얼마 없으면 미리 다음 페이지를 당겨 온다
    if (index >= cards.length - 3 && feed.hasNextPage && !feed.isFetchingNextPage) {
      void feed.fetchNextPage();
    }
  };

  const onHeart = () => {
    if (!current) return;
    // 관심 표현에는 확인 다이얼로그를 두지 않는다 — 자주 하는 동작이다
    sendHeart.mutate(current.profileId, {
      onSuccess: (result) => {
        advance();
        if (result.mutual && result.connectionId) {
          router.push(`/matched/${result.connectionId}`);
        } else {
          toast.show({ message: '관심을 보냈습니다' });
        }
      },
      onError: (error: Error) => toast.show({ message: error.message }),
    });
  };

  const onPass = () => {
    if (!current) return;
    // 넘기기는 되돌릴 수 없다 (PRD) — 그래서 토스트에 실행 취소를 달지 않는다
    pass.mutate(current.profileId, { onSuccess: advance });
  };

  if (profileLoading) {
    return (
      <Screen>
        <SkeletonList rows={1} shape="card" />
      </Screen>
    );
  }

  if (!ready) {
    return (
      <Screen>
        <Header unreadCount={unread?.count ?? 0} />
        <EmptyState
          icon="user-plus"
          title="부모님 프로필을 먼저 등록해주세요"
          description="프로필을 공개하셔야 다른 부모님을 추천해드릴 수 있습니다. 서로 프로필을 내놓는 것이 이 서비스의 기본 약속입니다."
          cta={{
            label: '부모님 프로필 등록하기',
            onPress: () => router.push('/(parent-setup)/onboarding'),
          }}
          testID="home-setup-required"
        />
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        current ? (
          <HeartActionBar
            onHeart={onHeart}
            onPass={onPass}
            onDetail={() => router.push(`/profile/${current.profileId}`)}
            busy={sendHeart.isPending || pass.isPending}
          />
        ) : undefined
      }
    >
      <Header unreadCount={unread?.count ?? 0} />

      <Pressable
        testID="filter-chip"
        accessibilityRole="button"
        accessibilityLabel="추천 조건 변경"
        onPress={() => router.push('/(tabs)/home/filters')}
        style={styles.filterChip}
      >
        <FontAwesome name="sliders" size={14} color={theme.colors.primaryDark} />
        <Text style={styles.filterChipText}>
          {radiusLabel(filter.radiusKm)}
          {filter.targetGender ? ` · ${filter.targetGender === 'male' ? '남성' : '여성'}` : ''}
          {filter.ageMin || filter.ageMax
            ? ` · ${filter.ageMin ?? ''}~${filter.ageMax ?? ''}세`
            : ''}
        </Text>
      </Pressable>

      {feed.isLoading ? (
        <SkeletonList rows={1} shape="card" />
      ) : feed.isError ? (
        <EmptyState
          icon="exclamation-circle"
          title="추천을 불러오지 못했습니다"
          description="잠시 후 다시 시도해주세요."
          cta={{ label: '다시 시도', onPress: () => void feed.refetch() }}
        />
      ) : !current ? (
        <EmptyState
          icon="search"
          title="조건에 맞는 분이 더 없습니다"
          description="거리나 나이 조건을 넓히면 더 많은 분을 만나실 수 있습니다."
          cta={{ label: '조건 바꾸기', onPress: () => router.push('/(tabs)/home/filters') }}
          testID="home-empty"
        />
      ) : (
        <ScrollView style={styles.deck} showsVerticalScrollIndicator={false}>
          <ParentProfileCard
            profile={current}
            variant="deck"
            onPress={() => router.push(`/profile/${current.profileId}`)}
            testID="discovery-card"
          />
          <Text style={styles.counter}>
            {index + 1}번째 · 남은 추천 {Math.max(cards.length - index - 1, 0)}명
          </Text>
        </ScrollView>
      )}
    </Screen>
  );
}

function Header({ unreadCount }: { unreadCount: number }) {
  const router = useRouter();
  return (
    <View style={styles.header}>
      <Text style={styles.brand}>부팅</Text>
      <Pressable
        testID="header-notifications"
        accessibilityRole="button"
        accessibilityLabel={`알림${unreadCount ? ` ${unreadCount}건` : ''}`}
        onPress={() => router.push('/(tabs)/notifications')}
        style={styles.bell}
        hitSlop={8}
      >
        <FontAwesome name="bell-o" size={20} color={theme.colors.textSecondary} />
        {unreadCount > 0 ? <View style={styles.dot} /> : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: HIT_SIZE + 4,
  },
  brand: { ...typography.title, color: theme.colors.text },
  bell: {
    width: HIT_SIZE,
    height: HIT_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.error,
  },
  filterChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    minHeight: HIT_SIZE,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: theme.colors.primarySurface,
    marginBottom: spacing.sm,
  },
  filterChipText: { ...typography.caption, color: theme.colors.primaryDark },
  deck: { flex: 1 },
  counter: {
    ...typography.caption,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
});
