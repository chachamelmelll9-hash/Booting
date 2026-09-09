import type { SajuCompatibility } from '@shared/api/booting.types';
import { theme } from '@shared/config/colors';
import { radius, spacing, typography } from '@shared/config/tokens';
import { StyleSheet, Text, View } from 'react-native';

type Variant = 'photo' | 'inline';

interface Props {
  compatibility: SajuCompatibility | null;
  /**
   * `photo` — 사진 위에 얹는다 (카드). 반투명 흰 알약이라 어떤 사진 위에서도 읽힌다.
   * `inline` — 글 사이에 둔다 (펼친 카드). 민트 표면 위 민트 글자.
   */
  variant?: Variant;
}

/**
 * 궁합 배지 — '궁합 62점'.
 *
 * **점수만 쓴다.** '천생연분'·'무난한 궁합' 같은 등급 문구를 붙이면 서비스가
 * 두 사람 사이를 판정하는 것처럼 읽힌다. 숫자는 참고로 읽히지만 문구는 결론으로
 * 읽힌다 — 상대는 누군가의 부모님이고 그 문장을 자녀가 본다.
 *
 * 궁합이 없으면(둘 중 한 분이라도 사주를 안 적었으면) **아무것도 그리지 않는다.**
 * '측정 불가' 같은 자리표시자를 두면, 사주를 안 적은 것이 결함처럼 보인다.
 */
export function CompatibilityBadge({ compatibility, variant = 'inline' }: Props) {
  if (!compatibility) return null;

  const label = `궁합 ${compatibility.score}점`;

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`사주 궁합 ${compatibility.score}점`}
      style={[styles.badge, variant === 'photo' ? styles.onPhoto : styles.inline]}
    >
      <Text numberOfLines={1} style={styles.text}>
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
  text: { ...typography.micro, fontWeight: '700', color: theme.colors.primaryDark },
});
