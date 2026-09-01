import {
  usePassReceivedHeart,
  useReceivedHearts,
  useSendHeartBack,
} from '@features/hearts';
import {
  EmptyState,
  HeartMessageSheet,
  ProfileDeck,
  Screen,
  SkeletonList,
  useToast,
} from '@shared/ui';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';

/**
 * 받은 관심.
 *
 * 홈과 같은 카드 덱이다 — 목록으로 쌓아 두면 한 명씩 제대로 보지 않고
 * 훑어 넘기게 된다. 여기서 하트를 되보내면 상호 하트가 되어 대화가 열린다.
 * 그 시점의 문구는 '대화 연결'이지 '매칭 성공'이 아니다.
 */
export default function HeartsScreen() {
  const router = useRouter();
  const toast = useToast();
  const hearts = useReceivedHearts();
  const sendBack = useSendHeartBack();
  const pass = usePassReceivedHeart();
  const [index, setIndex] = useState(0);
  const [composeOpen, setComposeOpen] = useState(false);

  const items = useMemo(
    () => hearts.data?.pages.flatMap((page) => page.items) ?? [],
    [hearts.data]
  );
  const current = items[index];

  const sendHeartBack = (message?: string) => {
    if (!current) return;
    sendBack.mutate(
      { targetProfileId: current.profile.profileId, message },
      {
        onSuccess: (result) => {
          setComposeOpen(false);
          advance();
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

  const advance = () => {
    setIndex((i) => i + 1);
    if (index >= items.length - 3 && hearts.hasNextPage && !hearts.isFetchingNextPage) {
      void hearts.fetchNextPage();
    }
  };

  if (hearts.isLoading) {
    return (
      <Screen>
        <SkeletonList rows={1} shape="card" />
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

  if (!current) {
    return (
      <Screen>
        <EmptyState
          icon="heart-o"
          title={index > 0 ? '받은 관심을 모두 확인했습니다' : '아직 받은 관심이 없습니다'}
          description={
            index > 0
              ? undefined
              : '부모님 프로필이 공개되어 있으면 다른 자녀분들이 보고 관심을 보낼 수 있습니다.'
          }
          cta={
            index > 0
              ? { label: '추천 보러 가기', onPress: () => router.push('/(tabs)/home') }
              : undefined
          }
          testID="hearts-empty"
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <ProfileDeck
        profiles={items.map((item) => item.profile)}
        index={index}
        busy={sendBack.isPending || pass.isPending}
        note={`받은 관심 ${index + 1} / ${items.length}`}
        highlight={current.message}
        testID="hearts-deck"
        onDetail={() => router.push(`/profile/${current.profile.profileId}`)}
        onHeart={() => setComposeOpen(true)}
        onPass={() => pass.mutate(current.profile.profileId, { onSuccess: advance })}
      />

      <HeartMessageSheet
        visible={composeOpen}
        toName={current.profile.maskedName}
        busy={sendBack.isPending}
        onSend={(message) => sendHeartBack(message)}
        onDismiss={() => setComposeOpen(false)}
      />
    </Screen>
  );
}
