import type { PublicProfile } from '@shared/api/booting.types';
import { theme } from '@shared/config/colors';
import {
  confidenceNote,
  dayPillarLabel,
  pillarsLabel,
  SAJU_DISCLAIMER,
  SAJU_REASON_LABEL,
  zodiacLabel,
} from '@shared/config/saju';
import { radius, spacing, typography } from '@shared/config/tokens';
import { StyleSheet, Text, View } from 'react-native';

interface Props {
  compatibility: PublicProfile['compatibility'];
  pillars: PublicProfile['sajuPillars'];
  /**
   * 이 분 본인의 일주. 카드에 쓰는 값과 같은 것이라 상세에서도 같은 자리에서
   * 읽힌다 — 카드에서 '병인일주'를 보고 들어왔는데 상세에 없으면 다른 사람
   * 화면처럼 느껴진다.
   */
  dayPillar: PublicProfile['dayPillar'];
  /** 상대 별명 — '상대' 대신 이름을 쓰면 두 줄을 헷갈리지 않는다 */
  partnerName: string;
}

/**
 * 사주 궁합 풀이 — 상세 화면.
 *
 * 점수를 맨 위에 크게 두고 **근거를 반드시 함께** 보여준다. 숫자만 있으면
 * 사용자는 그 값을 믿거나 무시하거나 둘 중 하나인데, 어느 쪽도 도움이 안 된다.
 * 무엇을 보고 그렇게 나왔는지가 붙어야 "그런 관점도 있구나"로 읽힌다.
 *
 * 상대 기둥은 **상대가 사주를 공개했을 때만** 온다. 없으면 그 줄만 빠지고
 * 점수와 근거는 그대로 남는다.
 */
export function SajuCompatibilityCard({
  compatibility,
  pillars,
  dayPillar,
  partnerName,
}: Props) {
  if (!compatibility || !pillars) return null;

  const note = confidenceNote(compatibility.confidence);

  return (
    <View style={styles.card} testID="saju-compatibility">
      {/*
        일주와 점수를 한 줄에 나란히 둔다 — 카드에서 위아래로 보던 두 값이라
        상세에서도 한눈에 같이 읽혀야 한다. 등급 문구는 붙이지 않는다.
      */}
      <View style={styles.headRow}>
        {dayPillar ? (
          <>
            <Text style={styles.dayPillar}>{dayPillarLabel(dayPillar)}</Text>
            <Text style={styles.separator}>·</Text>
          </>
        ) : null}
        <Text style={styles.score}>궁합 {compatibility.score}점</Text>
      </View>

      <View style={styles.pillars}>
        <PillarRow label="우리 부모님" pillars={pillars.mine} />
        {pillars.theirs ? (
          <PillarRow label={partnerName} pillars={pillars.theirs} />
        ) : (
          <Text style={styles.hidden}>
            {partnerName} 님은 사주를 공개하지 않으셨습니다
          </Text>
        )}
      </View>

      <View style={styles.reasons}>
        {compatibility.reasons.map((reason) => (
          <Text key={reason} style={styles.reason}>
            · {SAJU_REASON_LABEL[reason]}
          </Text>
        ))}
      </View>

      {note ? <Text style={styles.note}>{note}</Text> : null}
      <Text style={styles.disclaimer}>{SAJU_DISCLAIMER}</Text>
    </View>
  );
}

function PillarRow({
  label,
  pillars,
}: {
  label: string;
  pillars: NonNullable<PublicProfile['sajuPillars']>['mine'];
}) {
  return (
    <View style={styles.pillarRow}>
      <Text style={styles.pillarLabel} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.pillarValue}>
        <Text style={styles.pillarText}>{pillarsLabel(pillars)}</Text>
        <Text style={styles.zodiac}>{zodiacLabel(pillars)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.primarySurface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  headRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  dayPillar: { ...typography.heading, color: theme.colors.text },
  separator: { ...typography.heading, color: theme.colors.textMuted },
  score: { ...typography.heading, color: theme.colors.primaryDark },

  pillars: { gap: spacing.xxs },
  pillarRow: { flexDirection: 'row', gap: spacing.sm },
  pillarLabel: { ...typography.caption, color: theme.colors.textTertiary, width: 84 },
  pillarValue: { flex: 1 },
  pillarText: { ...typography.caption, color: theme.colors.textSecondary },
  zodiac: { ...typography.micro, color: theme.colors.textTertiary },
  hidden: { ...typography.caption, color: theme.colors.textTertiary },

  reasons: { gap: 2 },
  reason: { ...typography.caption, color: theme.colors.textSecondary },

  note: { ...typography.micro, color: theme.colors.textTertiary },
  disclaimer: { ...typography.micro, color: theme.colors.textMuted },
});
