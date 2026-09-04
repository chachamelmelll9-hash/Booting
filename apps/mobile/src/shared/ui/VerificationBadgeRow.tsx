import FontAwesome from '@expo/vector-icons/FontAwesome';
import type { Badges } from '@shared/api/booting.types';
import { theme } from '@shared/config/colors';
import { radius, spacing, typography } from '@shared/config/tokens';
import { StyleSheet, Text, View } from 'react-native';

/**
 * 배지는 '부모님 동의' 하나다.
 *
 * '자녀 인증'·'가족관계' 는 없앴다. 공개된 프로필에는 그 둘이 **늘 켜져** 있었다 —
 * 인증을 마쳐야 프로필을 만들 수 있으니 당연하다. 늘 같은 값인 표시는 아무것도
 * 알려주지 않으면서 카드마다 세 줄을 차지했고, 정작 중요한 하나를 묻었다.
 *
 * '검수 완료'도 없다. 내부 심사 상태이지 사용자에게 주는 정보가 아니다.
 *
 * 남는 하나가 이 서비스에서 신뢰의 근거다 — 부모님이 링크를 직접 열고 누르셨다는
 * 표시이고, 당사자가 이 등록을 알고 계신다는 유일한 증거다.
 */
const BADGE_LABELS: { key: keyof Badges; label: string }[] = [
  { key: 'consent', label: '부모님 동의' },
];
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
