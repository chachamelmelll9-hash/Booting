import FontAwesome from '@expo/vector-icons/FontAwesome';
import { theme } from '@shared/config/colors';
import { spacing, typography } from '@shared/config/tokens';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from './AppButton';

interface EmptyStateProps {
  icon?: React.ComponentProps<typeof FontAwesome>['name'];
  title: string;
  description?: string;
  cta?: { label: string; onPress: () => void };
  testID?: string;
}

/**
 * 빈 상태. **왜 비었는지와 다음에 뭘 할지**를 항상 함께 보여준다 —
 * "데이터가 없습니다"만 있는 화면은 사용자를 막다른 길에 세운다.
 */
export function EmptyState({ icon = 'inbox', title, description, cta, testID }: EmptyStateProps) {
  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.iconWrap}>
        <FontAwesome name={icon} size={28} color={theme.colors.textMuted} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {cta ? (
        <AppButton
          label={cta.label}
          onPress={cta.onPress}
          variant="secondary"
          fullWidth={false}
          style={styles.cta}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: { ...typography.subheading, color: theme.colors.text, textAlign: 'center' },
  description: {
    ...typography.body,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  cta: { marginTop: spacing.lg },
});
