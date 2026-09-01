import FontAwesome from '@expo/vector-icons/FontAwesome';
import type { Badges } from '@shared/api/booting.types';
import { theme } from '@shared/config/colors';
import { radius, spacing, typography } from '@shared/config/tokens';
import { StyleSheet, Text, View } from 'react-native';

const BADGE_LABELS: { key: keyof Badges; label: string }[] = [
  { key: 'child', label: '자녀 인증' },
  { key: 'family', label: '가족관계' },
  { key: 'consent', label: '부모님 동의' },
  { key: 'review', label: '검수 완료' },
];

/**
 * 인증 배지 4종.
 *
 * 이 앱에서 신뢰의 근거는 사진이 아니라 배지다 — 특히 '부모님 동의'는
 * 당사자가 자기 프로필을 올렸다는 유일한 표시라 항상 함께 보여준다.
 */
export function VerificationBadgeRow({
  badges,
  compact = false,
}: {
  badges: Badges;
  compact?: boolean;
}) {
  const visible = compact ? BADGE_LABELS.filter((b) => badges[b.key]) : BADGE_LABELS;

  return (
    <View style={styles.row}>
      {visible.map(({ key, label }) => {
        const on = badges[key];
        return (
          <View
            key={key}
            style={[styles.badge, on ? styles.badgeOn : styles.badgeOff]}
            accessibilityLabel={`${label} ${on ? '완료' : '미완료'}`}
          >
            <FontAwesome
              name={on ? 'check-circle' : 'circle-o'}
              size={12}
              color={on ? theme.colors.primaryDark : theme.colors.textMuted}
            />
            <Text style={[styles.text, on ? styles.textOn : styles.textOff]}>{label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xxs },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  badgeOn: { backgroundColor: theme.colors.primarySurface },
  badgeOff: { backgroundColor: theme.colors.surfaceSecondary },
  text: { ...typography.micro },
  textOn: { color: theme.colors.primaryDark },
  textOff: { color: theme.colors.textMuted },
});
