import type { DiscoveryItem } from '@shared/api/booting.types';
import { theme } from '@shared/config/colors';
import { elevation, radius, spacing, typography } from '@shared/config/tokens';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { RelationshipGoalChips } from './RelationshipGoalChips';
import { VerificationBadgeRow } from './VerificationBadgeRow';

type Variant = 'deck' | 'list' | 'preview';

interface Props {
  profile: DiscoveryItem;
  variant?: Variant;
  onPress?: () => void;
  testID?: string;
}

const MARITAL_LABEL: Record<string, string> = {
  bereaved: '사별',
  divorced: '이혼',
};

/**
 * 부모님 카드.
 *
 * 미리보기(자녀가 승인 전에 보는 화면)와 실제 노출이 **같은 컴포넌트**다.
 * 두 벌로 만들면 "부모님이 승인한 화면"과 "남에게 보이는 화면"이 언젠가
 * 어긋나고, 그건 이 서비스에서 가장 하면 안 되는 종류의 버그다.
 */
export function ParentProfileCard({ profile, variant = 'deck', onPress, testID }: Props) {
  const deck = variant !== 'list';

  const body = (
    <View style={[styles.card, deck ? styles.cardDeck : styles.cardList]} testID={testID}>
      {profile.primaryPhotoUrl ? (
        <Image
          source={{ uri: profile.primaryPhotoUrl }}
          style={deck ? styles.photoDeck : styles.photoList}
          accessibilityLabel={`${profile.nickname} 님의 사진`}
        />
      ) : (
        <View style={[deck ? styles.photoDeck : styles.photoList, styles.photoFallback]}>
          <Text style={styles.photoFallbackText}>사진 없음</Text>
        </View>
      )}

      <View style={deck ? styles.infoDeck : styles.infoList}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>
            {profile.nickname} · {profile.age}세
          </Text>
        </View>

        <Text style={styles.meta}>
          {profile.region}
          {profile.distanceKm !== null ? ` · ${profile.distanceKm}km` : ''}
          {profile.maritalStatus ? ` · ${MARITAL_LABEL[profile.maritalStatus] ?? ''}` : ''}
        </Text>

        {profile.goals.length ? (
          <View style={styles.goals}>
            <RelationshipGoalChips goals={profile.goals} />
          </View>
        ) : null}

        {profile.introExcerpt ? (
          <Text style={styles.intro} numberOfLines={deck ? 2 : 1}>
            {profile.introExcerpt}
          </Text>
        ) : null}

        <View style={styles.badges}>
          <VerificationBadgeRow badges={profile.badges} compact={!deck} />
        </View>
      </View>
    </View>
  );

  if (!onPress) return body;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${profile.nickname} 프로필 열기`}
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...elevation.card,
  },
  cardDeck: {},
  cardList: { flexDirection: 'row', alignItems: 'center', padding: spacing.sm },
  photoDeck: { width: '100%', height: 280, backgroundColor: theme.colors.surfaceSecondary },
  photoList: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  photoFallback: { alignItems: 'center', justifyContent: 'center' },
  photoFallbackText: { ...typography.micro, color: theme.colors.textMuted },
  infoDeck: { padding: spacing.md, gap: spacing.xxs },
  infoList: { flex: 1, marginLeft: spacing.sm, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { ...typography.subheading, color: theme.colors.text },
  meta: { ...typography.caption, color: theme.colors.textTertiary },
  goals: { marginTop: spacing.xxs },
  intro: { ...typography.body, color: theme.colors.textSecondary, marginTop: spacing.xxs },
  badges: { marginTop: spacing.xs },
  pressed: { opacity: 0.9 },
});
