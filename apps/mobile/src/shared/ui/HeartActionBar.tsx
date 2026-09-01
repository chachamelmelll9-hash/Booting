import FontAwesome from '@expo/vector-icons/FontAwesome';
import { theme } from '@shared/config/colors';
import { HIT_SIZE, radius, spacing, typography } from '@shared/config/tokens';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface Props {
  onHeart: () => void;
  onPass: () => void;
  onDetail?: () => void;
  layout?: 'deck' | 'row' | 'detail';
  heartDisabled?: boolean;
  busy?: boolean;
}

/**
 * 관심/넘기기 액션.
 *
 * 두 가지를 의도적으로 지켰다:
 *  - 하트에 확인 다이얼로그를 두지 않는다. 관심 표현은 되돌릴 수 있고,
 *    매번 확인을 받으면 탐색이 노동이 된다.
 *  - 스와이프로만 조작하게 만들지 않는다. 탭으로도 전부 되어야 한다
 *    (손 떨림·접근성 — test-scenarios S11.4 가 탭만으로 완주한다).
 */
export function HeartActionBar({
  onHeart,
  onPass,
  onDetail,
  layout = 'deck',
  heartDisabled = false,
  busy = false,
}: Props) {
  const compact = layout === 'row';

  return (
    <View style={[styles.container, compact && styles.containerRow]}>
      <Pressable
        testID="action-pass"
        accessibilityRole="button"
        accessibilityLabel="넘기기"
        onPress={onPass}
        disabled={busy}
        style={({ pressed }) => [
          styles.button,
          styles.pass,
          compact && styles.buttonCompact,
          pressed && styles.pressed,
        ]}
      >
        <FontAwesome name="times" size={compact ? 16 : 20} color={theme.colors.textTertiary} />
        {!compact && <Text style={styles.passLabel}>넘기기</Text>}
      </Pressable>

      {onDetail && !compact ? (
        <Pressable
          testID="action-detail"
          accessibilityRole="button"
          accessibilityLabel="프로필 자세히 보기"
          onPress={onDetail}
          style={({ pressed }) => [styles.detail, pressed && styles.pressed]}
        >
          <Text style={styles.detailLabel}>자세히</Text>
        </Pressable>
      ) : null}

      <Pressable
        testID="action-heart"
        accessibilityRole="button"
        accessibilityLabel="관심 보내기"
        accessibilityState={{ disabled: heartDisabled || busy }}
        onPress={onHeart}
        disabled={heartDisabled || busy}
        style={({ pressed }) => [
          styles.button,
          styles.heart,
          compact && styles.buttonCompact,
          (heartDisabled || busy) && styles.disabled,
          pressed && styles.pressed,
        ]}
      >
        <FontAwesome name="heart" size={compact ? 16 : 20} color="#FFFFFF" />
        {!compact && <Text style={styles.heartLabel}>관심 보내기</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  containerRow: { gap: spacing.xxs },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: HIT_SIZE + 4,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    flex: 1,
  },
  buttonCompact: { flex: 0, minWidth: HIT_SIZE, paddingHorizontal: spacing.sm },
  pass: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  passLabel: { ...typography.bodyStrong, color: theme.colors.textTertiary },
  heart: { backgroundColor: theme.colors.primary },
  heartLabel: { ...typography.bodyStrong, color: '#FFFFFF' },
  detail: {
    minHeight: HIT_SIZE,
    paddingHorizontal: spacing.sm,
    justifyContent: 'center',
  },
  detailLabel: { ...typography.caption, color: theme.colors.textTertiary },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.85 },
});
