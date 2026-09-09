import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DailyPicksGrid, useDailyPicks } from '@features/daily-picks';
import {
  filterSummary,
  radiusLabel,
  useDiscoveryFeed,
  useHeartActions,
  useHydratedFilter,
} from '@features/discovery';
import { nextSetupStep, useParentProfile, useVerification } from '@features/parent-profile';
import type { DiscoveryItem } from '@shared/api/booting.types';
import { theme } from '@shared/config/colors';
import { HIT_SIZE, radius, spacing, typography } from '@shared/config/tokens';
import {
  BootingLogo,
  EmptyState,
  HeartMessageSheet,
  Screen,
  SkeletonList,
  useToast,
} from '@shared/ui';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

/**
 * 홈 — 오늘의 추천 프로필.
 *
 * 하루에 카드 여섯 장을 뽑아 두고, 사용자가 한 장씩 뒤집어 본다. 무한 스택을
 * 걷어낸 이유: 끝없이 넘길 수 있으면 한 사람 한 사람을 보는 대신 스크롤을 하게
 * 된다. 부모님을 소개하는 자리에서 그건 맞지 않는다.
 *
 * 카드 조작은 **전부 탭이다.** 스와이프 제스처를 쓰지 않으므로 손 떨림이 있는
 * 사용자도 그대로 쓸 수 있다 (test-scenarios S11.4).
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
  const { sendHeart } = useHeartActions();
  const [composeFor, setComposeFor] = useState<DiscoveryItem | null>(null);

  const candidates = useMemo(
    () => feed.data?.pages.flatMap((page) => page.items) ?? [],
    [feed.data]
  );

  const { picks, revealedCount, isRevealed, isHearted, reveal, markHearted, hydrated } =
    useDailyPicks(candidates);

  /**
   * 관심 보내기 = 인사말 작성.
   *
   * 카드의 하트를 누르면 바로 보내지 않고 인사말 시트를 연다. 확인 다이얼로그가
   * 아니라 **작성 단계**다 — 비워 두고 보내면 인사말 없는 관심이 되므로 그냥
   * 보내는 길도 막히지 않는다.
   */
  const sendHeartTo = (message?: string) => {
    const target = composeFor;
    if (!target) return;

    sendHeart.mutate(
      { targetProfileId: target.profileId, message },
      {
        onSuccess: (result) => {
          setComposeFor(null);
          // 카드는 오늘 하루 그 자리에 남는다 — 보냈다는 표시만 바꾼다
          markHearted(target.profileId);
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
    <Screen scroll>
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
          {filter.sort === 'compatibility' ? ' · 궁합순' : ''}
        </Text>
      </Pressable>

      {/* 저장소 복원 전에 빈 화면을 보여주면, 어제 뒤집어 둔 카드가 잠깐
          닫힌 채로 나타났다가 열린다 */}
      {feed.isLoading || !hydrated ? (
        <SkeletonList rows={3} shape="card" />
      ) : feed.isError ? (
        <EmptyState
          icon="exclamation-circle"
          title="추천을 불러오지 못했습니다"
          description="잠시 후 다시 시도해주세요."
          cta={{ label: '다시 시도', onPress: () => void feed.refetch() }}
        />
      ) : !picks.length ? (
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
        <DailyPicksGrid
          picks={picks}
          revealedCount={revealedCount}
          isRevealed={isRevealed}
          isHearted={isHearted}
          busy={sendHeart.isPending}
          onReveal={(item) => reveal(item.profileId)}
          onOpen={(item) => router.push(`/profile/${item.profileId}`)}
          onHeart={(item) => setComposeFor(item)}
        />
      )}

      <HeartMessageSheet
        visible={!!composeFor}
        toName={composeFor?.nickname}
        busy={sendHeart.isPending}
        onSend={(message) => sendHeartTo(message)}
        onDismiss={() => setComposeFor(null)}
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
