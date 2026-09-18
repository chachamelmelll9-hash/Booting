import type { DiscoveryFilter } from '@shared/api/booting.types';
import { theme } from '@shared/config/colors';
import { SMOKING_OPTIONS, type SmokingOption } from '@shared/config/profileOptions';
import { HIT_SIZE, radius, spacing, typography } from '@shared/config/tokens';
import { AppButton } from '@shared/ui/AppButton';
import { FormSection, TextField } from '@shared/ui/FormSection';
import { RelationshipGoalChips } from '@shared/ui/RelationshipGoalChips';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { RADIUS_OPTIONS } from '../model/useDiscoveryFilterStore';

interface Props {
  initial: DiscoveryFilter;
  onApply: (filter: DiscoveryFilter) => void;
  onReset: () => void;
  saving?: boolean;
}

/**
 * 추천 조건.
 *
 * 자녀 수·동거 가족 필터는 **의도적으로 없다** (PRD). 그 조건으로 사람을
 * 걸러내는 순간 이 서비스는 부모님을 조건표로 만드는 앱이 된다.
 * 두 항목은 상세 화면에서만 보인다.
 */
export function FilterSheet({ initial, onApply, onReset, saving = false }: Props) {
  const [filter, setFilter] = useState<DiscoveryFilter>(initial);
  const patch = (p: Partial<DiscoveryFilter>) => setFilter((f) => ({ ...f, ...p }));

  /**
   * 키 범위는 서버가 120~220 만 받는다. 범위 밖 값이나 최소>최대를 그대로
   * 보내면 400 이 돌아오고 시트는 이유 없이 닫히지 않는다. 여기서 먼저 막는다.
   */
  const heightError = heightRangeError(filter);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
        <FormSection label="찾는 분" helper="부모님이 만나실 상대의 성별입니다">
          <View style={styles.row}>
            {(
              [
                { key: undefined, label: '상관없음' },
                { key: 'female' as const, label: '여성' },
                { key: 'male' as const, label: '남성' },
              ]
            ).map((option) => (
              <Chip
                key={option.label}
                label={option.label}
                selected={filter.targetGender === option.key}
                onPress={() => patch({ targetGender: option.key })}
              />
            ))}
          </View>
        </FormSection>

        <FormSection label="거리" helper="부모님 거주지 기준입니다">
          <View style={styles.row}>
            {RADIUS_OPTIONS.map((option) => (
              <Chip
                key={option.km}
                label={option.label}
                selected={filter.radiusKm === option.km}
                onPress={() => patch({ radiusKm: option.km })}
              />
            ))}
          </View>
        </FormSection>

        <View style={styles.ageRow}>
          <View style={styles.ageField}>
            <FormSection label="나이 최소">
              <TextField
                value={filter.ageMin ? String(filter.ageMin) : ''}
                onChangeText={(v) => patch({ ageMin: v ? Number(v) : undefined })}
                keyboardType="number-pad"
                placeholder="50"
                maxLength={3}
              />
            </FormSection>
          </View>
          <View style={styles.ageField}>
            <FormSection label="나이 최대">
              <TextField
                value={filter.ageMax ? String(filter.ageMax) : ''}
                onChangeText={(v) => patch({ ageMax: v ? Number(v) : undefined })}
                keyboardType="number-pad"
                placeholder="85"
                maxLength={3}
              />
            </FormSection>
          </View>
        </View>

        <FormSection label="혼인 상태">
          <View style={styles.row}>
            {(
              [
                { key: undefined, label: '상관없음' },
                { key: 'bereaved' as const, label: '사별' },
                { key: 'divorced' as const, label: '이혼' },
              ]
            ).map((option) => (
              <Chip
                key={option.label}
                label={option.label}
                selected={filter.maritalFilter === option.key}
                onPress={() => patch({ maritalFilter: option.key })}
              />
            ))}
          </View>
        </FormSection>

        <FormSection label="흡연" helper="상대 부모님의 흡연 여부입니다">
          <View style={styles.row}>
            {(
              [
                { key: undefined, label: '상관없음' },
                ...SMOKING_OPTIONS.map((option) => ({ key: option, label: option })),
              ] as { key: SmokingOption | undefined; label: string }[]
            ).map((option) => (
              <Chip
                key={option.label}
                label={option.label}
                selected={filter.smoking === option.key}
                onPress={() => patch({ smoking: option.key })}
              />
            ))}
          </View>
        </FormSection>

        {/* 키를 적지 않은 분은 범위를 걸면 빠진다 — helper 로 미리 알린다 */}
        <View style={styles.ageRow}>
          <View style={styles.ageField}>
            <FormSection label="키 최소" helper="cm · 비우면 제한 없음">
              <TextField
                value={filter.heightMin ? String(filter.heightMin) : ''}
                onChangeText={(v) => patch({ heightMin: v ? Number(v) : undefined })}
                keyboardType="number-pad"
                placeholder="150"
                maxLength={3}
                testID="filter-height-min"
              />
            </FormSection>
          </View>
          <View style={styles.ageField}>
            <FormSection label="키 최대" helper="키를 적지 않은 분은 제외됩니다">
              <TextField
                value={filter.heightMax ? String(filter.heightMax) : ''}
                onChangeText={(v) => patch({ heightMax: v ? Number(v) : undefined })}
                keyboardType="number-pad"
                placeholder="180"
                maxLength={3}
                testID="filter-height-max"
              />
            </FormSection>
          </View>
        </View>

        <FormSection label="관계 목적" helper="선택한 목적 중 하나라도 맞으면 보여드립니다">
          <RelationshipGoalChips
            goals={filter.goals ?? []}
            mode="select"
            onChange={(goals) => patch({ goals })}
          />
          {filter.goals?.includes('same_sex_friend') ? (
            <Text style={styles.goalNotice}>
              동성 친구를 선택하시면 같은 성별의 동성 친구를 찾는 분만 추천됩니다.
            </Text>
          ) : null}
        </FormSection>

        {heightError ? <Text style={styles.error}>{heightError}</Text> : null}

        <Text style={styles.note}>
          자녀 수와 동거 가족은 조건으로 고르지 않습니다. 프로필 상세에서 확인하실 수 있습니다.
          {'\n\n'}
          부모님 관계 목적에 &lsquo;동성 친구&rsquo;가 있으면 같은 성별의 동성 친구를 찾는
          분만 추천해드립니다. 이때는 위의 성별 조건이 적용되지 않습니다.
        </Text>
      </ScrollView>

      <View style={styles.actions}>
        <AppButton label="초기화" variant="secondary" onPress={onReset} />
        <AppButton
          label="이 조건으로 보기"
          onPress={() => onApply(filter)}
          loading={saving}
          disabled={!!heightError}
          testID="filter-apply"
        />
      </View>
    </View>
  );
}

const HEIGHT_MIN_CM = 120;
const HEIGHT_MAX_CM = 220;

function heightRangeError(filter: DiscoveryFilter): string | null {
  const { heightMin, heightMax } = filter;
  const outOfRange = (v: number | undefined) =>
    v != null && (v < HEIGHT_MIN_CM || v > HEIGHT_MAX_CM);
  if (outOfRange(heightMin) || outOfRange(heightMax)) {
    return `키는 ${HEIGHT_MIN_CM}~${HEIGHT_MAX_CM}cm 사이로 적어주세요`;
  }
  if (heightMin != null && heightMax != null && heightMin > heightMax) {
    return '키 최소가 최대보다 큽니다';
  }
  return null;
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && styles.pressed]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { maxHeight: 560 },
  scroll: { flexGrow: 0 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    minHeight: HIT_SIZE,
    paddingHorizontal: spacing.sm,
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  chipSelected: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primarySurface },
  chipText: { ...typography.caption, color: theme.colors.textSecondary },
  chipTextSelected: { color: theme.colors.primaryDark, fontWeight: '600' },
  ageRow: { flexDirection: 'row', gap: spacing.sm },
  ageField: { flex: 1 },
  note: { ...typography.caption, color: theme.colors.textTertiary, marginBottom: spacing.sm },
  error: { ...typography.caption, color: theme.colors.error, marginBottom: spacing.sm },
  goalNotice: {
    ...typography.caption,
    color: theme.colors.primaryDark,
    backgroundColor: theme.colors.primarySurface,
    padding: spacing.xs,
    borderRadius: radius.md,
    marginTop: spacing.xs,
  },
  actions: { gap: spacing.xs, paddingTop: spacing.sm },
  pressed: { opacity: 0.8 },
});
