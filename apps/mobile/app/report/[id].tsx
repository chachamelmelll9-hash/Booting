import { ReportReasonPicker, useSafetyMutations } from '@features/safety';
import { theme } from '@shared/config/colors';
import { REPORT_REASONS } from '@shared/config/safetyRules';
import { spacing, typography } from '@shared/config/tokens';
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
import { StyleSheet, Text, View } from 'react-native';

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
                    // 신고는 차단을 포함한다 — 뒤로 가면 이미 볼 수 없는
                    // 프로필로 돌아가 403 화면을 보게 된다
                    toast.show({
                      message: '신고가 접수되었습니다. 이 분은 추천과 대화에서 보이지 않습니다.',
                    });
                    router.replace('/(tabs)/home');
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
        <ReportReasonPicker reasons={REPORT_REASONS} selected={reason} onSelect={setReason} />
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
  reasons: { marginTop: spacing.md, marginBottom: spacing.md },
  footer: { gap: spacing.xxs },
});
