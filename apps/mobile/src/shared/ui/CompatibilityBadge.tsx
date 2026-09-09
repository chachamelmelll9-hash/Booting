import type { SajuCompatibility } from '@shared/api/booting.types';
import { theme } from '@shared/config/colors';
import { SAJU_GRADE_LABEL } from '@shared/config/saju';
import { radius, spacing, typography } from '@shared/config/tokens';
import { StyleSheet, Text, View } from 'react-native';

type Variant = 'photo' | 'inline';

interface Props {
  compatibility: SajuCompatibility | null;
  /**
   * `photo` — 사진 위에 얹는다 (카드). 반투명 흰 알약이라 어떤 사진 위에서도 읽힌다.
   * `inline` — 글 사이에 둔다 (펼친 카드·상세). 민트 표면 위 민트 글자.
   */
  variant?: Variant;
}

/**
 * 궁합 배지 — '궁합 82 · 천생연분'.
 *
 * 궁합이 없으면(둘 중 한 분이라도 사주를 안 적었으면) **아무것도 그리지 않는다.**
 * '측정 불가' 같은 자리표시자를 두면, 사주를 안 적은 것이 결함처럼 보인다.
 *
 * 점수만 크게 띄우지 않고 등급 문구를 붙이는 이유: 숫자 하나는 서열로 읽히고,
 * 그러면 부모님들이 점수로 줄 세워진다. 문구가 옆에 있으면 "어떤 궁합인가"로 읽힌다.
 */
export function CompatibilityBadge({ compatibility, variant = 'inline' }: Props) {
  if (!compatibility) return null;

  const label = `궁합 ${compatibility.score} · ${SAJU_GRADE_LABEL[compatibility.grade]}`;

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`사주 궁합 ${compatibility.score}점, ${SAJU_GRADE_LABEL[compatibility.grade]}`}
      style={[styles.badge, variant === 'photo' ? styles.onPhoto : styles.inline]}
    >
      <Text
        numberOfLines={1}
        style={[styles.text, variant === 'photo' ? styles.textOnPhoto : styles.textInline]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  onPhoto: { backgroundColor: 'rgba(255,255,255,0.92)' },
  inline: { backgroundColor: theme.colors.primarySurface },
  text: { ...typography.micro, fontWeight: '700' },
  textOnPhoto: { color: theme.colors.primaryDark },
  textInline: { color: theme.colors.primaryDark },
});
