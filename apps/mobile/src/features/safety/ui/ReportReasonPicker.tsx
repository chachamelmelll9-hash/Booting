import { theme } from '@shared/config/colors';
import { radius, spacing, typography } from '@shared/config/tokens';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface Props {
  reasons: { key: string; label: string }[];
  selected: string | null;
  onSelect: (key: string) => void;
}

/**
 * 신고 사유 선택.
 *
 * 대화방 ⋯ 메뉴와 프로필 신고 화면이 같은 컴포넌트를 쓴다 — 두 곳에서 문구가
 * 갈라지면 고를 때 본 말과 신고 내역에 뜨는 말이 달라진다.
 */
export function ReportReasonPicker({ reasons, selected, onSelect }: Props) {
  return (
    <View style={styles.list}>
      {reasons.map((option) => {
        const on = selected === option.key;
        return (
          <Pressable
            key={option.key}
            testID={`report-${option.key}`}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={option.label}
            onPress={() => onSelect(option.key)}
            style={({ pressed }) => [
              styles.reason,
              on && styles.reasonSelected,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.reasonText, on && styles.reasonTextSelected]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.xs },
  reason: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    backgroundColor: theme.colors.surface,
  },
  reasonSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySurface,
  },
  reasonText: { ...typography.body, color: theme.colors.text },
  reasonTextSelected: { color: theme.colors.primaryDark, fontWeight: '600' },
  pressed: { opacity: 0.85 },
});
