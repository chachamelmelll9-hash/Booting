import type { DiscoveryItem } from '@shared/api/booting.types';
import { theme } from '@shared/config/colors';
import { radius, spacing, typography } from '@shared/config/tokens';
import { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Dimensions,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { HeartActionBar } from './HeartActionBar';
import { ParentProfileCard } from './ParentProfileCard';

const SCREEN_WIDTH = Dimensions.get('window').width;
/** 이 거리를 넘겨 놓으면 넘긴 것으로 본다 */
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.28;

interface Props {
  profiles: DiscoveryItem[];
  index: number;
  onHeart: () => void;
  onPass: () => void;
  onDetail?: () => void;
  /** 주면 가운데 버튼이 '자세히' 대신 '찜해놓기'가 된다 (받은 관심) */
  onSave?: () => void;
  saved?: boolean;
  busy?: boolean;
  /** 카드 아래 안내 문구 (남은 수 등) */
  note?: string;
  /** 상대가 관심과 함께 보낸 인사말 — 답할지 판단하는 근거가 된다 */
  highlight?: string | null;
  testID?: string;
}

/**
 * 카드 덱 — 한 장씩 보고 좌우로 넘긴다.
 *
 * 스와이프는 **추가 수단**이지 유일한 수단이 아니다. 버튼을 항상 함께 두는 이유:
 * 주 사용자가 40~60대이고 손 떨림이 있는 분도 쓴다. 스와이프 전용으로 만들면
 * 그분들은 앱 자체를 못 쓴다 (test-scenarios S11.4 가 탭만으로 완주하는 걸 검증한다).
 *
 * react-native-gesture-handler 대신 RN 코어 PanResponder 를 쓴다 — 네이티브
 * 의존성을 늘리지 않으려는 선택이고, 이 정도 제스처에는 충분하다.
 */
export function ProfileDeck({
  profiles,
  index,
  onHeart,
  onPass,
  onDetail,
  onSave,
  saved = false,
  busy = false,
  note,
  highlight,
  testID,
}: Props) {
  const position = useRef(new Animated.ValueXY()).current;
  const current = profiles[index];
  const next = profiles[index + 1];

  // 카드가 바뀌면 위치를 원점으로 되돌린다 (안 하면 다음 카드가 밀려난 채로 뜬다)
  useEffect(() => {
    position.setValue({ x: 0, y: 0 });
  }, [index, position]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        // 가로로 의미 있게 움직였을 때만 잡는다 — 세로 스크롤을 뺏지 않는다
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderMove: (_, gesture) => {
          position.setValue({ x: gesture.dx, y: gesture.dy * 0.2 });
        },
        onPanResponderRelease: (_, gesture) => {
          const decided =
            gesture.dx > SWIPE_THRESHOLD ? 'heart' : gesture.dx < -SWIPE_THRESHOLD ? 'pass' : null;

          const springBack = () =>
            Animated.spring(position, {
              toValue: { x: 0, y: 0 },
              useNativeDriver: false,
              friction: 6,
            }).start();

          if (!decided) {
            springBack();
            return;
          }

          // 관심은 인사말 시트를 연다 → 아직 보낸 게 아니므로 카드를 날려보내지
          // 않는다. 취소했을 때 카드가 사라진 채로 남는 걸 막는다.
          // (보내기가 성공하면 부모가 index 를 올려 다음 카드가 나온다)
          if (decided === 'heart') {
            springBack();
            onHeart();
            return;
          }

          Animated.timing(position, {
            toValue: { x: -SCREEN_WIDTH, y: 0 },
            duration: 180,
            useNativeDriver: false,
          }).start(() => onPass());
        },
      }),
    [position, onHeart, onPass]
  );

  if (!current) return null;

  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
    outputRange: ['-8deg', '0deg', '8deg'],
  });
  const heartOpacity = position.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const passOpacity = position.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.stack}>
        <View style={styles.deck}>
          {/*
            뒤 카드 — 다음 장이 있다는 것만 알린다.

            예전에는 여기에 다음 프로필 카드를 통째로 그렸는데, `absoluteFillObject`
            라 화면 남은 공간 전체 높이로 늘어났다. 앞 카드보다 훨씬 길어져 아래로
            삐져나오고 그 자리에 배지 줄이 반쯤 잘린 채 보였다 (실측).

            내용을 지우고 종이 가장자리만 남긴다. 어차피 4% 축소에 60% 투명이라
            읽히지도 않았고, 잘린 글자만 눈에 걸렸다. `deck` 은 앞 카드 높이로
            잡히므로 `bottom: -12` 가 딱 그만큼만 아래로 비어져 나온다.
          */}
          {next ? <View style={styles.behind} pointerEvents="none" /> : null}

          <Animated.View
            style={[
              styles.front,
              { transform: [{ translateX: position.x }, { translateY: position.y }, { rotate }] },
            ]}
            {...panResponder.panHandlers}
          >
            <ParentProfileCard
              profile={current}
              variant="deck"
              onPress={onDetail}
              testID="discovery-card"
            />

            <Animated.View style={[styles.stamp, styles.stampHeart, { opacity: heartOpacity }]}>
              <Text style={styles.stampHeartText}>관심</Text>
            </Animated.View>
            <Animated.View style={[styles.stamp, styles.stampPass, { opacity: passOpacity }]}>
              <Text style={styles.stampPassText}>넘기기</Text>
            </Animated.View>
          </Animated.View>
        </View>
      </View>

      {highlight ? (
        <View style={styles.highlight} testID="deck-highlight">
          <Text style={styles.highlightLabel}>함께 보낸 인사말</Text>
          <Text style={styles.highlightText}>{highlight}</Text>
        </View>
      ) : null}

      {note ? <Text style={styles.note}>{note}</Text> : null}

      <View style={styles.actions}>
        <HeartActionBar
          onHeart={onHeart}
          onPass={onPass}
          onDetail={onDetail}
          onSave={onSave}
          saved={saved}
          busy={busy}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  stack: { flex: 1 },
  /** 앞 카드 높이로 잡히는 기준 상자 — 뒤 카드가 이 높이를 기준으로 비어져 나온다 */
  deck: { position: 'relative' },
  behind: {
    position: 'absolute',
    // 양옆은 안쪽으로, 아래로만 비어져 나온다 — 밑에 한 장 더 깔린 모양
    left: 14,
    right: 14,
    top: 16,
    bottom: -12,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  front: {},
  stamp: {
    position: 'absolute',
    top: spacing.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.md,
    borderWidth: 2,
  },
  stampHeart: {
    left: spacing.md,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySurface,
  },
  stampHeartText: { ...typography.bodyStrong, color: theme.colors.primaryDark },
  stampPass: {
    right: spacing.md,
    borderColor: theme.colors.textMuted,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  stampPassText: { ...typography.bodyStrong, color: theme.colors.textTertiary },
  highlight: {
    backgroundColor: theme.colors.primarySurface,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginTop: spacing.sm,
    gap: 2,
  },
  highlightLabel: { ...typography.micro, color: theme.colors.primaryDark },
  highlightText: { ...typography.body, color: theme.colors.textSecondary },
  note: {
    ...typography.caption,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  actions: { paddingBottom: spacing.xs },
});
