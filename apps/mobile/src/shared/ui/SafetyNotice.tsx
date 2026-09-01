import FontAwesome from '@expo/vector-icons/FontAwesome';
import { theme } from '@shared/config/colors';
import {
  CHAT_SAFETY_BANNER,
  MEETING_SAFETY_NOTES,
  SOLO_SAFETY_CHECKLIST,
} from '@shared/config/safetyRules';
import { HIT_SIZE, radius, spacing, typography } from '@shared/config/tokens';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface Props {
  variant: 'banner' | 'list' | 'checklist';
  /** checklist 전용 */
  checked?: boolean[];
  onToggle?: (index: number) => void;
}

/**
 * 안전수칙 표시. 문구는 항상 `safetyRules.ts` 에서 온다 — 화면마다 다른
 * 안전수칙이 뜨면 그건 규칙이 아니라 장식이다.
 */
export function SafetyNotice({ variant, checked = [], onToggle }: Props) {
  if (variant === 'banner') {
    return (
      <View style={styles.banner}>
        <FontAwesome name="shield" size={14} color={theme.colors.warning} />
        <Text style={styles.bannerText}>{CHAT_SAFETY_BANNER}</Text>
      </View>
    );
  }

  if (variant === 'list') {
    return (
      <View style={styles.list}>
        {MEETING_SAFETY_NOTES.map((note) => (
          <View key={note} style={styles.listItem}>
            <Text style={styles.bullet}>·</Text>
            <Text style={styles.listText}>{note}</Text>
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {SOLO_SAFETY_CHECKLIST.map((item, index) => {
        const on = checked[index] ?? false;
        return (
          <Pressable
            key={item}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            accessibilityLabel={item}
            onPress={() => onToggle?.(index)}
            style={({ pressed }) => [styles.checkRow, pressed && styles.pressed]}
            testID={`safety-check-${index}`}
          >
            <FontAwesome
              name={on ? 'check-square' : 'square-o'}
              size={20}
              color={on ? theme.colors.primary : theme.colors.textMuted}
            />
            <Text style={styles.checkText}>{item}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: theme.colors.warningBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
  },
  bannerText: { ...typography.micro, color: theme.colors.textSecondary, flex: 1 },
  list: { gap: spacing.xxs },
  listItem: { flexDirection: 'row', gap: spacing.xxs },
  bullet: { ...typography.body, color: theme.colors.textTertiary },
  listText: { ...typography.caption, color: theme.colors.textSecondary, flex: 1 },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: HIT_SIZE,
  },
  checkText: { ...typography.body, color: theme.colors.textSecondary, flex: 1 },
  pressed: { opacity: 0.8 },
});
