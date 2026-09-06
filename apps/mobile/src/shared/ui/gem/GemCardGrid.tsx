import type { DiscoveryItem } from '@shared/api/booting.types';
import { spacing } from '@shared/config/tokens';
import { useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native';

import { type CardRect, ExpandedGemCard } from './ExpandedGemCard';
import { GEM_ORDER, type GemKind } from './Gem';
import { GemCard } from './GemCard';

/** 3열 — 여섯 장이 스크롤 없이 한 화면에 들어오는 최대 열 수다 */
const COLUMNS = 3;

export interface GemCardItem {
  profile: DiscoveryItem;
  /** 상대가 관심과 함께 보낸 인사말 — 펼친 카드에서 보여준다 */
  message?: string | null;
}

interface Expanded {
  item: GemCardItem;
  kind: GemKind;
  from: CardRect;
  /** 누르기 **전에** 이미 뒤집혀 있었나 — 두 번째부터는 회전 없이 커지기만 한다 */
  alreadyRevealed: boolean;
}

interface Props {
  items: GemCardItem[];
  isRevealed: (profileId: string) => boolean;
  isHearted: (profileId: string) => boolean;
  onReveal: (profile: DiscoveryItem) => void;
  onHeart: (profile: DiscoveryItem) => void;
  onDetail: (profile: DiscoveryItem) => void;
  /** 주면 펼친 카드에 '넘기기'가 붙는다 (받은 관심) */
  onPass?: (profile: DiscoveryItem) => void;
  heartLabel?: string;
  heartedLabel?: string;
  busy?: boolean;
}

/**
 * 원석 카드 그리드.
 *
 * 추천(오늘의 6장)과 받은 관심이 **같은 컴포넌트를 쓴다.** 두 화면은 카드를
 * 고르는 규칙만 다르고 보는 방식은 같아야 한다 — 한쪽만 카드로, 다른 쪽은
 * 덱으로 두면 같은 프로필을 두 가지 방식으로 익혀야 한다.
 *
 * 폭은 `onLayout` 으로 잰다. 화면 패딩을 상수로 베껴 두면 Screen 의 패딩이
 * 바뀌는 날 카드가 화면 밖으로 밀린다.
 */
export function GemCardGrid({
  items,
  isRevealed,
  isHearted,
  onReveal,
  onHeart,
  onDetail,
  onPass,
  heartLabel,
  heartedLabel,
  busy = false,
}: Props) {
  const [available, setAvailable] = useState(0);
  const [expanded, setExpanded] = useState<Expanded | null>(null);

  const onLayout = (event: LayoutChangeEvent) => {
    setAvailable(event.nativeEvent.layout.width);
  };

  const cardWidth = available
    ? Math.floor((available - spacing.sm * (COLUMNS - 1)) / COLUMNS)
    : 0;

  /**
   * 카드를 누르면 **뒤집힘을 먼저 기록하고** 펼친다.
   *
   * 순서가 중요하다: 뒤에 남는 작은 카드도 같이 뒤집혀 있어야, 펼친 카드를
   * 닫았을 때 원석이 아니라 프로필이 그 자리에 있다.
   */
  const handlePress = (item: GemCardItem, kind: GemKind, from: CardRect) => {
    const alreadyRevealed = isRevealed(item.profile.profileId);
    if (!alreadyRevealed) onReveal(item.profile);
    setExpanded({ item, kind, from, alreadyRevealed });
  };

  /** 펼친 카드 위에 또 화면을 띄우는 동작은 먼저 닫고 넘긴다 */
  const closeThen = (run: (profile: DiscoveryItem) => void) => () => {
    if (!expanded) return;
    const target = expanded.item.profile;
    setExpanded(null);
    run(target);
  };

  return (
    <View>
      <View style={styles.grid} onLayout={onLayout}>
        {/* 폭을 재기 전에는 카드를 그리지 않는다 — 0폭으로 한 번 그렸다가
            제자리를 찾아가는 깜빡임이 생긴다 */}
        {cardWidth > 0
          ? items.map((item, index) => {
              const kind = GEM_ORDER[index % GEM_ORDER.length];
              return (
                <GemCard
                  key={item.profile.profileId}
                  profile={item.profile}
                  kind={kind}
                  order={index}
                  width={cardWidth}
                  revealed={isRevealed(item.profile.profileId)}
                  hearted={isHearted(item.profile.profileId)}
                  busy={busy}
                  onPress={(rect) => handlePress(item, kind, rect)}
                  onHeart={() => onHeart(item.profile)}
                />
              );
            })
          : null}
      </View>

      {expanded ? (
        <ExpandedGemCard
          profile={expanded.item.profile}
          message={expanded.item.message}
          kind={expanded.kind}
          from={expanded.from}
          alreadyRevealed={expanded.alreadyRevealed}
          hearted={isHearted(expanded.item.profile.profileId)}
          busy={busy}
          heartLabel={heartLabel}
          heartedLabel={heartedLabel}
          onClose={() => setExpanded(null)}
          onHeart={closeThen(onHeart)}
          onDetail={closeThen(onDetail)}
          onPass={onPass ? closeThen(onPass) : undefined}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
