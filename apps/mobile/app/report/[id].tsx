import { useSafetyMutations } from '@features/safety';
import { theme } from '@shared/config/colors';
import { REPORT_REASONS } from '@shared/config/safetyRules';
import { radius, spacing, typography } from '@shared/config/tokens';
import {
  AppButton,
  DestructiveConfirmDialog,
  FormSection,
  Screen,
  TextField,
  useToast,
} from '@shared/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

/**
 * 신고 · 차단.
 *
 * 신고와 차단을 한 화면에 둔다 — 실제로 신고하는 사람은 대개 다시 보고 싶지도
 * 않다. 차단은 되돌리기 어렵고 진행 중인 대화까지 끝내므로 확인을 한 번 받는다.
 */
export default function ReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { report, block } = useSafetyMutations();

  const [reason, setReason] = useState<string | null>(null);
  const [detail, setDetail] = useState('');
  const [confirmBlock, setConfirmBlock] = useState(false);

  return (
    <Screen
      scroll
      footer={
        <View style={styles.footer}>
          <AppButton
            label="신고하기"
            disabled={!reason}
            loading={report.isPending}
            testID="report-submit"
            onPress={() =>
              reason &&
              report.mutate(
                { targetProfileId: id as string, reason, detail: detail.trim() || undefined },
                {
                  onSuccess: () => {
                    toast.show({ message: '신고가 접수되었습니다' });
                    router.back();
                  },
                  onError: (e: Error) => toast.show({ message: e.message }),
                }
              )
            }
          />
          <AppButton
            label="이 분 차단하기"
            variant="secondary"
            testID="block-open"
            onPress={() => setConfirmBlock(true)}
          />
        </View>
      }
    >
      <Text style={styles.title}>무엇이 문제였나요?</Text>

      <View style={styles.reasons}>
        {REPORT_REASONS.map((option) => {
          const on = reason === option.key;
          return (
            <Pressable
              key={option.key}
              testID={`report-${option.key}`}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={option.label}
              onPress={() => setReason(option.key)}
              style={({ pressed }) => [
                styles.reason,
                on && styles.reasonSelected,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.reasonText, on && styles.reasonTextSelected]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <FormSection label="자세한 내용" helper="선택 사항입니다">
        <TextField
          testID="report-detail"
          value={detail}
          onChangeText={setDetail}
          placeholder="어떤 일이 있었는지 적어주세요"
          multiline
          maxLength={500}
        />
      </FormSection>

      <DestructiveConfirmDialog
        visible={confirmBlock}
        title="이 분을 차단하시겠습니까?"
        body="서로 프로필이 보이지 않게 되고, 진행 중인 대화도 종료됩니다."
        confirmLabel="차단하기"
        busy={block.isPending}
        onCancel={() => setConfirmBlock(false)}
        onConfirm={() =>
          block.mutate(id as string, {
            onSuccess: () => {
              setConfirmBlock(false);
              toast.show({ message: '차단했습니다' });
              router.replace('/(tabs)/home');
            },
            onError: (e: Error) => toast.show({ message: e.message }),
          })
        }
        testID="confirm-block"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.title, color: theme.colors.text, marginTop: spacing.md },
  reasons: { gap: spacing.xs, marginTop: spacing.md, marginBottom: spacing.md },
  reason: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    backgroundColor: theme.colors.surface,
  },
  reasonSelected: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primarySurface },
  reasonText: { ...typography.body, color: theme.colors.text },
  reasonTextSelected: { color: theme.colors.primaryDark, fontWeight: '600' },
  footer: { gap: spacing.xxs },
  pressed: { opacity: 0.85 },
});
