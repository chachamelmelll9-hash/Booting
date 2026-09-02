import FontAwesome from '@expo/vector-icons/FontAwesome';
import {
  filterSummary,
  radiusLabel,
  useDiscoveryFeed,
  useHeartActions,
  useHydratedFilter,
} from '@features/discovery';
import { nextSetupStep, useParentProfile, useVerification } from '@features/parent-profile';
import { theme } from '@shared/config/colors';
import { HIT_SIZE, radius, spacing, typography } from '@shared/config/tokens';
import {
  BootingLogo,
  EmptyState,
  HeartMessageSheet,
  ProfileDeck,
  Screen,
  SkeletonList,
  useToast,
} from '@shared/ui';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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

  const setupStep = nextSetupStep(verification, profile);
  const ready = setupStep === 'done';

  const feed = useDiscoveryFeed();
  const { sendHeart, pass } = useHeartActions();
  const [index, setIndex] = useState(0);
  const [composeOpen, setComposeOpen] = useState(false);

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

  /**
   * 관심 보내기 = 인사말 작성.
   *
   * 버튼(또는 오른쪽 스와이프)을 누르면 바로 보내지 않고 인사말 시트를 연다.
   * 확인 다이얼로그가 아니라 **작성 단계**다 — 시트에서 비워 두고 보내면
   * 인사말 없는 관심이 되므로 그냥 보내는 길도 막히지 않는다.
   */
  const sendHeartTo = (message?: string) => {
    if (!current) return;
    sendHeart.mutate(
      { targetProfileId: current.profileId, message },
      {
        onSuccess: (result) => {
          setComposeOpen(false);
          advance();
          if (result.mutual && result.connectionId) {
            router.push(`/matched/${result.connectionId}`);
          } else {
            toast.show({
              message: message ? '인사말과 함께 관심을 보냈습니다' : '관심을 보냈습니다',
            });
          }
        },
        onError: (error: Error) => toast.show({ message: error.message }),
      }
    );
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
        <Header />
        <EmptyState
          icon="user-plus"
          title="부모님 프로필을 먼저 등록해주세요"
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
    <Screen>
      <Header />

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
          // 지금 걸려 있는 조건을 그대로 보여준다 — 무엇 때문에 비었는지
          // 알아야 사용자가 고칠 수 있다
          description={`현재 조건: ${filterSummary(filter)}\n거리나 나이 조건을 넓히면 더 많은 분을 만나실 수 있습니다.`}
          cta={{ label: '조건 바꾸기', onPress: () => router.push('/(tabs)/home/filters') }}
          testID="home-empty"
        />
      ) : (
        <ProfileDeck
          profiles={cards}
          index={index}
          busy={sendHeart.isPending || pass.isPending}
          note={`${index + 1}번째 · 남은 추천 ${Math.max(cards.length - index - 1, 0)}명`}
          testID="home-deck"
          onDetail={() => router.push(`/profile/${current.profileId}`)}
          onHeart={() => setComposeOpen(true)}
          onPass={onPass}
        />
      )}

      <HeartMessageSheet
        visible={composeOpen}
        toName={current?.nickname}
        busy={sendHeart.isPending}
        onSend={(message) => sendHeartTo(message)}
        onDismiss={() => setComposeOpen(false)}
      />
    </Screen>
  );
}

/**
 * 홈 헤더 — 워드마크만 둔다.
 *
 * 종 아이콘을 걷어냈다. 알림으로 오는 일(새 관심·새 대화)은 이미 관심·매칭
 * 탭 배지가 같은 자리에서 알려 준다. 같은 사실을 두 곳에서 빨갛게 알리면
 * 어느 쪽을 눌러야 하는지가 매번 질문이 된다.
 */
function Header() {
  return (
    <View style={styles.header}>
      <BootingLogo />
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
});
