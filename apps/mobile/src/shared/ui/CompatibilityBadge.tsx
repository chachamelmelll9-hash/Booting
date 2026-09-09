import type { SajuCompatibility } from '@shared/api/booting.types';
import { theme } from '@shared/config/colors';
import { radius, spacing, typography } from '@shared/config/tokens';
import { StyleSheet, Text, View } from 'react-native';

interface Props {
  compatibility: SajuCompatibility | null;
}

/**
 * 사진 위에 얹는 궁합 배지 — '궁합 62점'. 추천 카드 앞면 전용이다.
 * (펼친 카드와 전체 프로필은 사진 위가 아니라서 민트 글자를 그대로 쓴다.)
 *
 * **점수만 쓴다.** '천생연분'·'무난한 궁합' 같은 등급 문구를 붙이면 서비스가
 * 두 사람 사이를 판정하는 것처럼 읽힌다. 숫자는 참고로 읽히지만 문구는 결론으로
 * 읽힌다 — 상대는 누군가의 부모님이고 그 문장을 자녀가 본다.
 *
 * 궁합이 없으면(둘 중 한 분이라도 사주를 안 적었으면) **아무것도 그리지 않는다.**
 * '측정 불가' 같은 자리표시자를 두면, 사주를 안 적은 것이 결함처럼 보인다.
 */
export function CompatibilityBadge({ compatibility }: Props) {
  if (!compatibility) return null;

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`사주 궁합 ${compatibility.score}점`}
      style={styles.badge}
    >
      <Text numberOfLines={1} style={styles.text}>
        궁합 {compatibility.score}점
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
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  text: { ...typography.micro, fontWeight: '700', color: theme.colors.primaryDark },
});
