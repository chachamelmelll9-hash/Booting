import { theme } from '@shared/config/colors';
import {
  goalLabel,
  RELATIONSHIP_GOALS,
  type RelationshipGoal,
  toggleGoal,
} from '@shared/config/relationshipGoals';
import { HIT_SIZE, radius, spacing, typography } from '@shared/config/tokens';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface Props {
  goals: RelationshipGoal[];
  mode?: 'display' | 'select';
  onChange?: (goals: RelationshipGoal[]) => void;
  onRejected?: (reason: string) => void;
}

export function RelationshipGoalChips({
  goals,
  mode = 'display',
  onChange,
  onRejected,
}: Props) {
  if (mode === 'display') {
    return (
      <View style={styles.row}>
        {goals.map((goal) => (
          <View key={goal} style={[styles.chip, styles.chipDisplay]}>
            <Text style={styles.chipDisplayText}>{goalLabel(goal)}</Text>
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.row}>
      {RELATIONSHIP_GOALS.map(({ key, label }) => {
        const selected = goals.includes(key);
        return (
          <Pressable
            key={key}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={label}
            onPress={() => {
              // 선택 규칙(최대 2개, '아직 모르겠음' 단독)은 config 가 판정한다
              const result = toggleGoal(goals, key);
              if (result.rejected) onRejected?.(result.rejected);
              else onChange?.(result.goals);
            }}
            style={({ pressed }) => [
              styles.chip,
              styles.chipSelectable,
              selected && styles.chipSelected,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    justifyContent: 'center',
  },
  chipDisplay: {
    backgroundColor: theme.colors.primarySurface,
    paddingVertical: 6,
  },
  chipDisplayText: { ...typography.micro, color: theme.colors.primaryDark },
  chipSelectable: {
    minHeight: HIT_SIZE,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  chipSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySurface,
  },
  chipText: { ...typography.caption, color: theme.colors.textSecondary },
  chipTextSelected: { color: theme.colors.primaryDark, fontWeight: '600' },
  pressed: { opacity: 0.8 },
});
