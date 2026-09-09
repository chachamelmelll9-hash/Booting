import FontAwesome from '@expo/vector-icons/FontAwesome';
import type { DiscoveryItem } from '@shared/api/booting.types';
import { theme } from '@shared/config/colors';
import { elevation, radius, spacing } from '@shared/config/tokens';
import { useEffect, useRef } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { CompatibilityBadge } from '../CompatibilityBadge';
import { type CardRect } from './ExpandedGemCard';
import { Gem, GEM_LABEL, GEM_MINT, type GemKind } from './Gem';

/** 뒤집는 데 걸리는 시간. 300 이하는 홱 바뀌어 '뒤집혔다'로 안 읽힌다 */
const FLIP_MS = 520;
/** 카드가 순서대로 나타나는 간격 */
const STAGGER_MS = 70;

interface Props {
  profile: DiscoveryItem;
  kind: GemKind;
  /** 그리드에서의 순서 — 등장 애니메이션 지연에만 쓴다 */
  order: number;
  width: number;
  revealed: boolean;
  hearted: boolean;
  busy?: boolean;
  /**
   * 카드가 눌렸다. **화면상 위치를 함께 넘긴다** — 펼쳐지는 카드가 이 자리에서
   * 출발해야 "그 카드가 커졌다"로 읽힌다.
   */
  onPress: (rect: CardRect) => void;
  onHeart: () => void;
}

/**
 * 오늘의 추천 카드 한 장.
 *
 * 처음엔 원석이 그려진 뒷면이고, 누르면 뒤집혀 프로필이 나온다. 한 번 뒤집힌
 * 카드는 **다시 닫히지 않는다** — 닫혔다 열렸다 하면 누가 누구였는지 매번
 * 다시 확인해야 하고, 그건 재미가 아니라 일이다.
 *
 * 앞뒤 두 면을 겹쳐 두고 각각 반대 방향으로 회전시킨다. `backfaceVisibility`
 * 만으로는 안드로이드에서 뒷면이 비쳐 보이는 기기가 있어, 중간 지점(카드가
 * 정확히 옆을 향해 보이지 않는 순간)에서 opacity 로도 한 번 더 끊는다.
 */
export function GemCard({
  profile,
  kind,
  order,
  width,
  revealed,
  hearted,
  busy = false,
  onPress,
  onHeart,
}: Props) {
  const height = Math.round(width * 1.38);
  const cardRef = useRef<View>(null);

  /**
   * 눌린 자리를 재서 넘긴다. 그리드 인덱스로 위치를 계산하지 않는 이유:
   * 화면이 스크롤돼 있으면 인덱스만으로는 실제 y 를 알 수 없다.
   */
  const handlePress = () => {
    cardRef.current?.measureInWindow((x, y, w, h) =>
      onPress({ x, y, width: w, height: h })
    );
  };

  const flip = useSharedValue(revealed ? 1 : 0);
  const enter = useSharedValue(0);

  useEffect(() => {
    enter.value = withDelay(order * STAGGER_MS, withTiming(1, { duration: 320 }));
  }, [enter, order]);

  useEffect(() => {
    flip.value = withTiming(revealed ? 1 : 0, {
      duration: FLIP_MS,
      easing: Easing.inOut(Easing.cubic),
    });
  }, [flip, revealed]);

  const enterStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: interpolate(enter.value, [0, 1], [18, 0]) }],
  }));

  /** 뒤집는 동안 살짝 커졌다 돌아온다 — 카드가 손에서 들리는 느낌을 준다 */
  const liftStyle = useAnimatedStyle(() => {
    const lift = interpolate(flip.value, [0, 0.5, 1], [0, 1, 0]);
    return { transform: [{ scale: 1 + lift * 0.06 }] };
  });

  const backStyle = useAnimatedStyle(() => ({
    opacity: flip.value < 0.5 ? 1 : 0,
    transform: [
      { perspective: 900 },
      { rotateY: `${interpolate(flip.value, [0, 1], [0, 180])}deg` },
    ],
  }));

  const frontStyle = useAnimatedStyle(() => ({
    opacity: flip.value < 0.5 ? 0 : 1,
    transform: [
      { perspective: 900 },
      { rotateY: `${interpolate(flip.value, [0, 1], [180, 360])}deg` },
    ],
  }));

  const label = revealed
    ? `${profile.nickname} 님, ${profile.age}세.${
        profile.compatibility ? ` 사주 궁합 ${profile.compatibility.score}점.` : ''
      } 눌러서 프로필 펼치기`
    : `${GEM_LABEL[kind]} 원석 카드. 눌러서 오늘의 추천 프로필 열기`;

  return (
    <Animated.View style={[{ width }, enterStyle]}>
      <Animated.View style={liftStyle}>
        <Pressable
          ref={cardRef}
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={{ expanded: revealed }}
          testID={`gem-card-${profile.profileId}`}
          onPress={handlePress}
          style={({ pressed }) => [
            styles.press,
            { width, height },
            pressed && styles.pressed,
          ]}
        >
          {/* 뒷면 — 원석 */}
          <Animated.View style={[styles.face, { width, height }, backStyle]}>
            <GemBack kind={kind} size={width} />
          </Animated.View>

          {/* 앞면 — 프로필 */}
          <Animated.View style={[styles.face, { width, height }, frontStyle]}>
            <ProfileFace
              profile={profile}
              kind={kind}
              width={width}
              height={height}
              hearted={hearted}
              busy={busy}
              onHeart={onHeart}
            />
          </Animated.View>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

/**
 * 카드 뒷면.
 *
 * 카드 자체는 **채우지 않는다** — 흰 바탕에 민트 테두리만 두르고, 색은 원석
 * 하나에만 준다. 카드를 민트로 채우면 6장이 화면의 절반을 진한 색으로 덮어
 * 브랜드 색이 배경색이 되어 버린다. 색이 한 곳에만 있어야 그 색이 강조로 남는다.
 */
function GemBack({ kind, size }: { kind: GemKind; size: number }) {
  return (
    <View style={styles.back}>
      <Gem kind={kind} size={size * 0.62} />
    </View>
  );
}

/** 카드 앞면 — 사진 위에 이름·나이, 아래로 갈수록 어두워지는 막을 깐다 */
function ProfileFace({
  profile,
  kind,
  width,
  height,
  hearted,
  busy,
  onHeart,
}: {
  profile: DiscoveryItem;
  kind: GemKind;
  width: number;
  height: number;
  hearted: boolean;
  busy: boolean;
  onHeart: () => void;
}) {
  const scrimId = `scrim-${kind}`;

  return (
    <View style={styles.front}>
      {profile.primaryPhotoUrl ? (
        <Image
          source={{ uri: profile.primaryPhotoUrl }}
          style={styles.photo}
          accessibilityLabel={`${profile.nickname} 님의 사진`}
        />
      ) : (
        <View style={[styles.photo, styles.photoFallback]}>
          <FontAwesome name="user" size={width * 0.32} color={theme.colors.disabled} />
        </View>
      )}

      {/* 글자가 사진 어디에 놓이든 읽히도록 아래쪽을 어둡게 덮는다 */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id={scrimId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0.4" stopColor="#0F172A" stopOpacity="0" />
              <Stop offset="1" stopColor="#0F172A" stopOpacity="0.85" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width={width} height={height} fill={`url(#${scrimId})`} />
        </Svg>
      </View>

      {/* 어느 원석이었는지 남겨 둔다 — 뒤집고 나면 단서가 사라져 버린다 */}
      <View style={styles.gemTag}>
        <Gem kind={kind} size={16} />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          hearted ? '이미 관심을 보냈습니다' : `${profile.nickname} 님에게 관심 보내기`
        }
        accessibilityState={{ disabled: hearted || busy }}
        disabled={hearted || busy}
        onPress={onHeart}
        testID={`gem-card-heart-${profile.profileId}`}
        hitSlop={10}
        style={({ pressed }) => [
          styles.heartButton,
          hearted && styles.heartButtonDone,
          pressed && !hearted && styles.heartButtonPressed,
        ]}
      >
        <FontAwesome
          name={hearted ? 'heart' : 'heart-o'}
          size={14}
          color={hearted ? theme.colors.surface : theme.colors.primaryDark}
        />
      </Pressable>

      <View style={styles.frontInfo}>
        {/*
          궁합은 이름 위에 둔다. 아래에 붙이면 나이·거리와 한 덩어리로 읽혀
          어느 것이 상대의 정보이고 어느 것이 우리 부모님과의 관계인지 흐려진다.
          사주를 안 적은 분 카드에는 이 줄이 통째로 없다.
        */}
        <CompatibilityBadge compatibility={profile.compatibility} variant="photo" />
        <Text style={styles.frontName} numberOfLines={1}>
          {profile.nickname}
        </Text>
        <Text style={styles.frontMeta} numberOfLines={1}>
          {profile.age}세
          {profile.distanceKm != null ? ` · ${profile.distanceKm}km` : ''}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  press: { borderRadius: radius.lg },
  pressed: { opacity: 0.92 },

  face: {
    position: 'absolute',
    top: 0,
    left: 0,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backfaceVisibility: 'hidden',
    ...elevation.card,
  },

  // --- 뒷면: 흰 바탕 + 민트 테두리 ---
  back: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: GEM_MINT.base,
    backgroundColor: theme.colors.surface,
  },

  // --- 앞면 ---
  front: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: GEM_MINT.base,
    overflow: 'hidden',
    backgroundColor: theme.colors.surfaceSecondary,
  },
  photo: { width: '100%', height: '100%' },
  photoFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceSecondary,
  },
  gemTag: {
    position: 'absolute',
    top: spacing.xxs,
    left: spacing.xxs,
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  heartButton: {
    position: 'absolute',
    top: spacing.xxs,
    right: spacing.xxs,
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  heartButtonPressed: { transform: [{ scale: 0.9 }] },
  heartButtonDone: { backgroundColor: theme.colors.primary },
  frontInfo: {
    position: 'absolute',
    left: spacing.xxs,
    right: spacing.xxs,
    bottom: spacing.xs,
    gap: 3,
  },
  frontName: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  frontMeta: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '500',
    color: '#E2E8F0',
  },
});
