import { theme } from '@shared/config/colors';
import { radius, spacing, typography } from '@shared/config/tokens';
import { StyleSheet, Text, View } from 'react-native';

interface Props {
  current: number;
  total: number;
  label: string;
}

/**
 * 등록 플로우 진행 표시.
 *
 * 5단계짜리 흐름에서 "지금 어디쯤인지"가 안 보이면 중간에 그만두게 된다.
 * 숫자와 막대를 함께 둔 이유는 막대만으로는 남은 양을 가늠하기 어렵기 때문이다.
 */
export function StepProgressBar({ current, total, label }: Props) {
  const ratio = Math.min(Math.max(current / total, 0), 1);

  return (
    <View style={styles.container} accessibilityLabel={`${total}단계 중 ${current}단계: ${label}`}>
      <View style={styles.header}>
        <Text style={styles.step}>
          {current} / {total}
        </Text>
        <Text style={styles.label}>{label}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${ratio * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xxs, paddingVertical: spacing.xs },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  step: { ...typography.micro, color: theme.colors.primaryDark },
  label: { ...typography.caption, color: theme.colors.textSecondary },
  track: {
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: theme.colors.surfaceSecondary,
    overflow: 'hidden',
  },
  fill: { height: 4, borderRadius: radius.pill, backgroundColor: theme.colors.primary },
});
