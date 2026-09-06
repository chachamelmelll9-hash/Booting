import type { DiscoveryItem } from '@shared/api/booting.types';
import { theme } from '@shared/config/colors';
import { radius, spacing, typography } from '@shared/config/tokens';
import { GEM_MINT, GEM_ORDER, GemCardGrid } from '@shared/ui';
import { StyleSheet, Text, View } from 'react-native';

interface Props {
  picks: DiscoveryItem[];
  revealedCount: number;
  isRevealed: (profileId: string) => boolean;
  isHearted: (profileId: string) => boolean;
  busy?: boolean;
  onReveal: (profile: DiscoveryItem) => void;
  onOpen: (profile: DiscoveryItem) => void;
  onHeart: (profile: DiscoveryItem) => void;
}

/** 오늘의 추천 프로필 — 제목·진행 표시 + 원석 카드 그리드 */
export function DailyPicksGrid({
  picks,
  revealedCount,
  isRevealed,
  isHearted,
  busy = false,
  onReveal,
  onOpen,
  onHeart,
}: Props) {
  return (
    <View>
      <Header revealedCount={revealedCount} total={picks.length} />

      <GemCardGrid
        items={picks.map((profile) => ({ profile }))}
        isRevealed={isRevealed}
        isHearted={isHearted}
        busy={busy}
        onReveal={onReveal}
        onHeart={onHeart}
        onDetail={onOpen}
      />
    </View>
  );
}

/**
 * 제목과 진행 표시.
 *
 * 점 6개는 남은 카드 수를 **세지 않고도** 알게 한다. 숫자만 두면 "2/6"을
 * 읽고 해석해야 하는데, 점은 보면 안다. 채워진 점만 민트고 나머지는 빈
 * 테두리라, 카드 뒷면(흰 바탕 + 민트 테두리)과 같은 규칙으로 읽힌다.
 */
function Header({ revealedCount, total }: { revealedCount: number; total: number }) {
  const done = total > 0 && revealedCount >= total;

  return (
    <View style={styles.header}>
      <Text style={styles.title}>오늘의 추천 프로필</Text>

      <View style={styles.progressRow}>
        <View style={styles.dots}>
          {/* 점 개수는 실제 카드 수를 따른다. 항상 6개를 그리면 추천이 모자라
              1장만 나온 날에도 5개가 빈 채로 남아, 안 열어본 카드가 있는 것처럼 보인다 */}
          {GEM_ORDER.slice(0, total).map((kind, index) => {
            const filled = index < revealedCount;
            return (
              <View
                key={kind}
                style={[
                  styles.dot,
                  filled
                    ? { backgroundColor: GEM_MINT.base }
                    : { borderColor: theme.colors.border, borderWidth: 2 },
                ]}
              />
            );
          })}
        </View>
        <Text style={styles.progressText}>
          {done
            ? '오늘 카드를 모두 열어보셨습니다'
            : `${total}장 중 ${revealedCount}장 확인`}
        </Text>
      </View>

      <Text style={styles.hint}>
        {done
          ? '내일 자정에 새 카드가 도착합니다.'
          : '카드를 클릭하면 프로필을 확인가능합니다'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: spacing.md, gap: spacing.xxs },
  title: { ...typography.title, color: theme.colors.text },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dots: { flexDirection: 'row', gap: spacing.xxs },
  dot: { width: 10, height: 10, borderRadius: radius.pill },
  progressText: { ...typography.caption, color: theme.colors.textTertiary },
  hint: { ...typography.caption, color: theme.colors.textMuted },
});
