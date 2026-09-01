import { useBlocks, useSafetyMutations } from '@features/safety';
import { theme } from '@shared/config/colors';
import { spacing, typography } from '@shared/config/tokens';
import { AppButton, EmptyState, Screen, SkeletonList, useToast } from '@shared/ui';
import { FlatList, StyleSheet, Text, View } from 'react-native';

export default function BlockedScreen() {
  const toast = useToast();
  const { data: blocks, isLoading } = useBlocks();
  const { unblock } = useSafetyMutations();

  if (isLoading) {
    return (
      <Screen>
        <SkeletonList rows={3} />
      </Screen>
    );
  }

  if (!blocks?.length) {
    return (
      <Screen>
        <EmptyState
          icon="ban"
          title="차단한 분이 없습니다"
          description="프로필 상세나 대화 화면에서 차단하실 수 있습니다."
          testID="blocked-empty"
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <FlatList
        data={blocks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.info}>
              <Text style={styles.name}>{item.maskedName}</Text>
              <Text style={styles.date}>{formatDate(item.createdAt)} 차단</Text>
            </View>
            <AppButton
              label="해제"
              variant="secondary"
              fullWidth={false}
              loading={unblock.isPending}
              onPress={() =>
                unblock.mutate(item.id, {
                  onSuccess: () => toast.show({ message: '차단을 해제했습니다' }),
                  onError: (e: Error) => toast.show({ message: e.message }),
                })
              }
            />
          </View>
        )}
      />
    </Screen>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`;
}

const styles = StyleSheet.create({
  list: { paddingVertical: spacing.sm, gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  info: { flex: 1 },
  name: { ...typography.body, color: theme.colors.text },
  date: { ...typography.caption, color: theme.colors.textTertiary },
});
