import { useReports } from '@features/safety';
import { theme } from '@shared/config/colors';
import { reportReasonLabel } from '@shared/config/safetyRules';
import { radius, spacing, typography } from '@shared/config/tokens';
import { EmptyState, Screen, SkeletonList } from '@shared/ui';
import { FlatList, StyleSheet, Text, View } from 'react-native';

const STATUS_LABEL: Record<string, string> = {
  pending: '접수됨',
  reviewing: '확인 중',
  resolved: '처리 완료',
  dismissed: '조치 없음',
};

export default function ReportsScreen() {
  const { data: reports, isLoading } = useReports();

  if (isLoading) {
    return (
      <Screen>
        <SkeletonList rows={3} />
      </Screen>
    );
  }

  if (!reports?.length) {
    return (
      <Screen>
        <EmptyState
          icon="flag-o"
          title="신고하신 내역이 없습니다"
          testID="reports-empty"
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <FlatList
        data={reports}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.header}>
              <Text style={styles.name}>{item.targetNickname}</Text>
              <View style={styles.status}>
                <Text style={styles.statusText}>{STATUS_LABEL[item.status] ?? item.status}</Text>
              </View>
            </View>
            <Text style={styles.reason}>{reportReasonLabel(item.reason)}</Text>
            {item.detail ? <Text style={styles.detail}>{item.detail}</Text> : null}
            <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
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
  row: {
    backgroundColor: theme.colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: spacing.md,
    gap: 2,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { ...typography.bodyStrong, color: theme.colors.text },
  status: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  statusText: { ...typography.micro, color: theme.colors.textSecondary },
  reason: { ...typography.body, color: theme.colors.textSecondary },
  detail: { ...typography.caption, color: theme.colors.textTertiary },
  date: { ...typography.micro, color: theme.colors.textMuted, marginTop: spacing.xxs },
});
