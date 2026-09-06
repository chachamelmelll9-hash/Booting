import FontAwesome from '@expo/vector-icons/FontAwesome';
import type { DiscoveryItem } from '@shared/api/booting.types';
import { theme } from '@shared/config/colors';
import { elevation, radius, spacing, typography } from '@shared/config/tokens';
import { useCallback, useEffect } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { AppButton } from '../AppButton';
import { RelationshipGoalChips } from '../RelationshipGoalChips';
import { VerificationBadgeRow } from '../VerificationBadgeRow';
import { Gem, GEM_MINT, type GemKind } from './Gem';

/** 카드가 커지며 뒤집히는 시간. 닫을 때는 조금 빠르게 — 이미 본 화면이다 */
const OPEN_MS = 620;
const CLOSE_MS = 380;

/** 그리드에서 눌린 카드의 화면상 위치 */
export interface CardRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Props {
  profile: DiscoveryItem;
  /** 상대가 관심과 함께 보낸 인사말 (받은 관심) */
  message?: string | null;
  kind: GemKind;
  /** 눌린 카드 자리 — 여기서 출발해 화면 가운데로 커진다 */
  from: CardRect;
  /** 이미 뒤집어 본 카드면 회전 없이 커지기만 한다 */
  alreadyRevealed: boolean;
  hearted: boolean;
  busy: boolean;
  onClose: () => void;
  onHeart: () => void;
  onDetail: () => void;
  /** 받은 관심에서만 쓴다 — 추천 카드에는 넘기기가 없다 */
  onPass?: () => void;
  heartLabel?: string;
  heartedLabel?: string;
}

const MARITAL_LABEL: Record<string, string> = { bereaved: '사별', divorced: '이혼' };

/**
 * 눌린 카드가 **그 자리에서** 커지며 뒤집혀 프로필을 펼친다.
 *
 * 새 화면으로 넘기지 않는 이유: 카드를 눌렀는데 화면이 통째로 바뀌면 방금 누른
 * 카드가 여섯 장 중 어느 것이었는지 감각이 끊긴다. 눌린 자리에서 자라나면
 * "이 카드를 열었다"가 그대로 보인다.
 *
 * 크기는 width/height 를 바꾸지 않고 **transform scale** 로 준다. 매 프레임
 * 레이아웃을 다시 잡으면 안쪽 글자가 재배치되며 떨린다. 카드 비율(1:1.38)을
 * 펼친 뒤에도 그대로 유지해, 한 번의 균일 배율로 시작 사각형과 정확히 겹친다.
 */
export function ExpandedGemCard({
  profile,
  message,
  kind,
  from,
  alreadyRevealed,
  hearted,
  busy,
  onClose,
  onHeart,
  onDetail,
  onPass,
  heartLabel = '관심 보내기',
  heartedLabel = '관심을 보냈습니다',
}: Props) {
  const { width: screenW, height: screenH } = useWindowDimensions();

  /**
   * 펼친 크기는 화면이 허락하는 **최대**로 잡는다. 카드를 누른 목적이 프로필을
   * 보는 것이라, 여기서 더 작게 두면 다시 한 번 '자세히'를 눌러야 한다.
   * 좌우 여백만 남겨 두는 이유: 뒤에 깔린 여섯 장이 살짝 보여야 "카드 하나가
   * 열렸다"로 읽히고, 화면을 통째로 덮으면 새 화면으로 넘어간 것처럼 보인다.
   */
  const targetWidth = screenW - spacing.md * 2;
  const targetHeight = Math.min(targetWidth * 1.38, screenH * 0.86);
  const targetX = (screenW - targetWidth) / 2;
  const targetY = (screenH - targetHeight) / 2;

  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withTiming(1, { duration: OPEN_MS, easing: Easing.out(Easing.cubic) });
  }, [t]);

  const close = useCallback(() => {
    t.value = withTiming(
      0,
      { duration: CLOSE_MS, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(onClose)();
      }
    );
  }, [t, onClose]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: t.value * 0.6 }));

  /**
   * 컨테이너는 **위치와 크기만** 맡는다.
   *
   * 회전을 여기 걸면 앞면이 `rotateY(180deg)` 가 걸린 채로 남는데, 안드로이드는
   * 그 상태의 뷰 안에 있는 `Image` 를 그리지 않는다 (글자·배경은 그려져서
   * 사진 자리만 빈 회색으로 남는다). 그래서 회전은 앞뒤 면이 각자 가져가고,
   * 앞면은 360도까지 돌아 **회전이 없는 상태로 끝난다.**
   */
  const cardStyle = useAnimatedStyle(() => {
    const scale = interpolate(t.value, [0, 1], [from.width / targetWidth, 1]);
    const fromCx = from.x + from.width / 2;
    const fromCy = from.y + from.height / 2;
    const toCx = targetX + targetWidth / 2;
    const toCy = targetY + targetHeight / 2;

    return {
      transform: [
        { translateX: interpolate(t.value, [0, 1], [fromCx - toCx, 0]) },
        { translateY: interpolate(t.value, [0, 1], [fromCy - toCy, 0]) },
        { scale },
      ],
    };
  });

  /** 90도를 넘기 전까지는 뒷면(원석), 넘고 나면 앞면(프로필) */
  const backStyle = useAnimatedStyle(() => ({
    opacity: alreadyRevealed || t.value >= 0.5 ? 0 : 1,
    transform: [
      { perspective: 1200 },
      { rotateY: `${interpolate(t.value, [0, 1], [0, 180])}deg` },
    ],
  }));

  const frontStyle = useAnimatedStyle(() => ({
    opacity: alreadyRevealed || t.value >= 0.5 ? 1 : 0,
    transform: [
      { perspective: 1200 },
      {
        rotateY: `${alreadyRevealed ? 360 : interpolate(t.value, [0, 1], [180, 360])}deg`,
      },
    ],
  }));

  return (
    <Modal transparent statusBarTranslucent animationType="none" onRequestClose={close}>
      <Pressable
        style={styles.fill}
        accessibilityRole="button"
        accessibilityLabel="닫기"
        onPress={close}
      >
        <Animated.View style={[styles.backdrop, backdropStyle]} />
      </Pressable>

      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.card,
          { left: targetX, top: targetY, width: targetWidth, height: targetHeight },
          cardStyle,
        ]}
      >
        {/* 뒷면 — 원석 */}
        <Animated.View style={[styles.face, styles.back, backStyle]} pointerEvents="none">
          <Gem kind={kind} size={targetWidth * 0.5} />
        </Animated.View>

        {/* 앞면 — 프로필. 180도에서 시작해 360도로 끝나므로 회전이 남지 않는다 */}
        <Animated.View style={[styles.face, styles.front, frontStyle]}>
          <ProfileDetail
            profile={profile}
            message={message}
            kind={kind}
            width={targetWidth}
            hearted={hearted}
            busy={busy}
            heartLabel={heartLabel}
            heartedLabel={heartedLabel}
            onClose={close}
            onHeart={onHeart}
            onDetail={onDetail}
            onPass={onPass}
          />
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

function ProfileDetail({
  profile,
  message,
  kind,
  width,
  hearted,
  busy,
  heartLabel,
  heartedLabel,
  onClose,
  onHeart,
  onDetail,
  onPass,
}: {
  profile: DiscoveryItem;
  message?: string | null;
  kind: GemKind;
  width: number;
  hearted: boolean;
  busy: boolean;
  heartLabel: string;
  heartedLabel: string;
  onClose: () => void;
  onHeart: () => void;
  onDetail: () => void;
  /** 받은 관심에서만 쓴다 — 추천 카드에는 넘기기가 없다 */
  onPass?: () => void;
}) {
  return (
    <View style={styles.detail}>
      <View style={[styles.photoWrap, message ? styles.photoWrapCompact : null]}>
        {profile.primaryPhotoUrl ? (
          <Image
            source={{ uri: profile.primaryPhotoUrl }}
            style={styles.photo}
            accessibilityLabel={`${profile.nickname} 님의 사진`}
          />
        ) : (
          <View style={[styles.photo, styles.photoFallback]}>
            <FontAwesome name="user" size={width * 0.22} color={theme.colors.disabled} />
          </View>
        )}

        <View style={styles.gemTag}>
          <Gem kind={kind} size={20} />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="닫기"
          onPress={onClose}
          hitSlop={10}
          testID="expanded-card-close"
          style={styles.closeButton}
        >
          <FontAwesome name="times" size={16} color={theme.colors.textSecondary} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.name}>
          {profile.nickname} · {profile.age}세
        </Text>
        <Text style={styles.meta}>
          {profile.region}
          {profile.distanceKm != null ? ` · ${profile.distanceKm}km` : ''}
          {` · ${MARITAL_LABEL[profile.maritalStatus] ?? ''}`}
        </Text>

        {/*
          인사말이 관계 목적·소개글보다 위다.

          이 카드에서 사용자가 정하는 건 "답할까 말까" 하나이고, 그 근거는
          상대가 직접 쓴 이 문장이다. 아래로 밀면 스크롤해야 보이는데,
          정작 버튼은 스크롤 없이 눌리는 자리에 있어 안 읽고 결정하게 된다.
        */}
        {message ? (
          <View style={styles.messageBox}>
            <Text style={styles.messageLabel}>함께 보낸 인사말</Text>
            <Text style={styles.messageText}>{message}</Text>
          </View>
        ) : null}

        {profile.goals.length ? <RelationshipGoalChips goals={profile.goals} /> : null}

        {profile.introExcerpt ? (
          <Text style={styles.intro}>{profile.introExcerpt}</Text>
        ) : null}

        <VerificationBadgeRow badges={profile.badges} />
      </ScrollView>

      <View style={styles.actions}>
        <AppButton
          label={hearted ? heartedLabel : heartLabel}
          disabled={hearted || busy}
          onPress={onHeart}
          testID="expanded-card-heart"
        />
        {/*
          '자세히 보기'가 아니라 '전체 프로필'이다. 카드를 누른 순간 이미 커져
          있으므로, '자세히'라고 쓰면 이 버튼이 크기를 키우는 버튼처럼 읽힌다.
          여기서 넘어가는 화면에는 생활·가족·사주까지 전부 들어 있다.
        */}
        <AppButton
          label="전체 프로필 보기"
          variant="secondary"
          onPress={onDetail}
          testID="expanded-card-detail"
        />

        {/*
          넘기기는 받은 관심에서만 나온다. 텍스트 버튼으로 낮춰 둔 이유:
          이 카드의 목적은 답하는 것이고, 거절이 같은 크기로 나란히 서면
          둘 중 하나를 고르는 화면이 되어 버린다.
        */}
        {onPass ? (
          <View style={styles.minorRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="넘기기"
              onPress={onPass}
              disabled={busy}
              hitSlop={8}
              testID="expanded-card-pass"
            >
              <Text style={styles.minorLabel}>넘기기</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFillObject },
  backdrop: { flex: 1, backgroundColor: '#0F172A' },

  card: { position: 'absolute' },
  face: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: GEM_MINT.base,
    backgroundColor: theme.colors.surface,
    overflow: 'hidden',
    ...elevation.card,
  },
  back: { alignItems: 'center', justifyContent: 'center' },
  // 회전은 frontStyle 이 전부 맡는다 (transform 은 한 곳에서만 줘야 덮어쓰이지 않는다)
  front: {},

  detail: { flex: 1 },
  photoWrap: { height: '42%', backgroundColor: theme.colors.surfaceSecondary },
  /**
   * 인사말이 있는 카드(받은 관심)는 사진을 줄인다.
   *
   * 사진을 42% 로 두면 인사말이 버튼 뒤로 밀려 라벨만 보이고 정작 문장이
   * 안 보인다. 사진은 이미 작은 카드에서 봤고, 여기서 새로 읽을 것은 글이다.
   */
  photoWrapCompact: { height: '30%' },
  photo: { width: '100%', height: '100%' },
  photoFallback: { alignItems: 'center', justifyContent: 'center' },
  gemTag: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  closeButton: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
  },

  body: { flex: 1 },
  bodyContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    // 아래 버튼이 스크롤 영역 위에 얹혀 있어, 여백이 없으면 마지막 줄
    // (인증 배지)이 끝까지 내려도 버튼에 가려진 채로 남는다
    paddingBottom: spacing.md,
    gap: spacing.xs,
  },
  name: { ...typography.heading, color: theme.colors.text },
  meta: { ...typography.caption, color: theme.colors.textTertiary },
  intro: { ...typography.body, color: theme.colors.textSecondary },
  messageBox: {
    backgroundColor: theme.colors.primarySurface,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: 2,
  },
  messageLabel: { ...typography.micro, color: theme.colors.primaryDark },
  messageText: { ...typography.body, color: theme.colors.text },
  minorRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingTop: spacing.xxs,
  },
  minorLabel: { ...typography.caption, color: theme.colors.textTertiary },

  actions: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    paddingTop: spacing.xs,
    gap: spacing.xs,
  },
});
