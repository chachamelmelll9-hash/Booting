import {
  usePassReceivedHeart,
  useReceivedHearts,
  useRevealedHearts,
  useSendHeartBack,
} from '@features/hearts';
import type { DiscoveryItem } from '@shared/api/booting.types';
import { theme } from '@shared/config/colors';
import { spacing, typography } from '@shared/config/tokens';
import {
  EmptyState,
  GemCardGrid,
  HeartMessageSheet,
  Screen,
  SkeletonList,
  TabHeader,
  useToast,
} from '@shared/ui';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

/**
 * 받은 관심.
 *
 * 홈(오늘의 추천)과 **같은 원석 카드 그리드**를 쓴다. 한쪽은 카드, 다른 쪽은
 * 덱으로 두면 같은 프로필을 두 가지 방식으로 익혀야 한다. 카드를 누르면
 * 뒤집히며 펼쳐지고, 거기서 답하거나 보류(찜)하거나 넘긴다.
 *
 * 여기서 하트를 되보내면 상호 하트가 되어 대화가 열린다. 그 시점의 문구는
 * '대화 연결'이지 '매칭 성공'이 아니다.
 */
export default function HeartsScreen() {
  const router = useRouter();
  const toast = useToast();
  const hearts = useReceivedHearts();
  const sendBack = useSendHeartBack();
  const pass = usePassReceivedHeart();
  const { isRevealed, reveal, hydrated } = useRevealedHearts();
  const [composeFor, setComposeFor] = useState<DiscoveryItem | null>(null);
  const [answered, setAnswered] = useState<string[]>([]);

  const items = useMemo(
    () => hearts.data?.pages.flatMap((page) => page.items) ?? [],
    [hearts.data]
  );

  const sendHeartBack = (message?: string) => {
    const target = composeFor;
    if (!target) return;

    sendBack.mutate(
      { targetProfileId: target.profileId, message },
      {
        onSuccess: (result) => {
          setComposeFor(null);
          // 목록이 새로 오기 전까지 카드에 '답했음'을 표시해 둔다
          setAnswered((prev) => [...prev, target.profileId]);
          if (result.mutual && result.connectionId) {
            router.push(`/matched/${result.connectionId}`);
          } else {
            toast.show({ message: '관심을 보냈습니다' });
          }
        },
        onError: (error: Error) => toast.show({ message: error.message }),
      }
    );
  };

  if (hearts.isLoading || !hydrated) {
    return (
      <Screen>
        <SkeletonList rows={3} shape="card" />
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
        <Header count={0} />
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
    <Screen scroll>
      <Header count={items.length} />

      <GemCardGrid
        items={items.map((item) => ({ profile: item.profile, message: item.message }))}
        isRevealed={isRevealed}
        isHearted={(profileId) => answered.includes(profileId)}
        busy={sendBack.isPending || pass.isPending}
        heartLabel="관심 답하기"
        heartedLabel="답했습니다"
        onReveal={(profile) => reveal(profile.profileId)}
        onHeart={(profile) => setComposeFor(profile)}
        onDetail={(profile) => router.push(`/profile/${profile.profileId}`)}
        onPass={(profile) => pass.mutate(profile.profileId)}
      />

      <HeartMessageSheet
        visible={!!composeFor}
        toName={composeFor?.nickname}
        busy={sendBack.isPending}
        onSend={(message) => sendHeartBack(message)}
        onDismiss={() => setComposeFor(null)}
      />
    </Screen>
  );
}

/**
 * 제목과 보관 기간 안내.
 *
 * 2주 삭제를 **미리** 알려 둔다. 카드가 말없이 사라지면 사용자는 자기가
 * 실수로 지운 줄 알고, 그 다음부터는 답할 시간이 있어도 서둘러 결정한다.
 */
function Header({ count }: { count: number }) {
  // 제목은 여기서 단다 — 네이티브 헤더를 껐다 (탭 첫 화면에 뒤로가기가 생겨서)
  return (
    <View style={styles.header}>
      <TabHeader title="받은 관심" />
      {count > 0 ? <Text style={styles.count}>{count}명이 관심을 보냈습니다</Text> : null}
      <Text style={styles.hint}>모든 카드는 2주 뒤에 자동 삭제됩니다.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: spacing.md, gap: spacing.xxs },
  count: { ...typography.bodyStrong, color: theme.colors.text },
  hint: { ...typography.caption, color: theme.colors.textMuted },
});
