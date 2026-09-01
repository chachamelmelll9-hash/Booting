import { theme } from '@shared/config/colors';
import { HIT_SIZE, radius, spacing, typography } from '@shared/config/tokens';
import { BottomSheet } from '@shared/ui/BottomSheet';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput } from 'react-native';

import { useRegions } from '../model/useParentProfile';

interface Props {
  visible: boolean;
  onSelect: (region: { code: string; label: string }) => void;
  onDismiss: () => void;
}

/**
 * 시·군·구 선택기.
 *
 * 229개를 그냥 나열하면 못 찾는다. 검색 한 줄을 위에 두고 시·도 접두어로도
 * 걸리게 했다 ("송파" 도 "서울" 도 같은 항목을 찾는다).
 */
export function RegionPicker({ visible, onSelect, onDismiss }: Props) {
  const { data: regions = [], isLoading } = useRegions();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return regions;
    return regions.filter((r) => r.sigungu.includes(q) || r.sido.includes(q) || r.label.includes(q));
  }, [regions, query]);

  return (
    <BottomSheet visible={visible} title="거주 지역" onDismiss={onDismiss}>
      <TextInput
        testID="region-search"
        value={query}
        onChangeText={setQuery}
        placeholder="시·군·구 검색 (예: 송파, 수원)"
        placeholderTextColor={theme.colors.placeholder}
        style={styles.search}
      />
      {isLoading ? (
        <Text style={styles.state}>지역 목록을 불러오는 중입니다…</Text>
      ) : filtered.length === 0 ? (
        <Text style={styles.state}>검색 결과가 없습니다</Text>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.code}
          style={styles.list}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() => onSelect({ code: item.code, label: item.label })}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <Text style={styles.rowText}>{item.label}</Text>
            </Pressable>
          )}
        />
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  search: {
    minHeight: HIT_SIZE,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    ...typography.body,
    color: theme.colors.text,
  },
  list: { maxHeight: 380 },
  row: { minHeight: HIT_SIZE, justifyContent: 'center' },
  rowText: { ...typography.body, color: theme.colors.text },
  state: { ...typography.body, color: theme.colors.textTertiary, paddingVertical: spacing.md },
  pressed: { opacity: 0.7 },
});
