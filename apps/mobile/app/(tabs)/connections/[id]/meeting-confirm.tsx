import { formatMeetAt, useMeeting, useMeetingMutations } from '@features/meetings';
import { theme } from '@shared/config/colors';
import { statusDescription } from '@shared/config/connectionStatus';
import { radius, spacing, typography } from '@shared/config/tokens';
import { AppButton, Screen, SkeletonList, useToast } from '@shared/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

/**
 * 만남 확인.
 *
 * **여기서 '매칭 성공'을 말하지 않는다.** 내가 확인해도 상대가 확인하기 전까지는
 * `meeting_confirm_pending` 이고, 문구는 `connectionStatus.ts` 에서만 온다.
 * 최종 판정은 서버(`meetings/match.service.ts`)가 하고 화면은 결과를 읽을 뿐이다.
 * test-scenarios S19.2 가 이 화면에서 '매칭 성공' 문구의 부재를 검증한다.
 */
export default function MeetingConfirmScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();

  const { data: meeting, isLoading } = useMeeting(id);
  const { confirm } = useMeetingMutations(id ?? '');

  if (isLoading || !meeting) {
    return (
      <Screen>
        <SkeletonList rows={2} />
      </Screen>
    );
  }

  if (meeting.confirmedByMe) {
    return (
      <Screen>
        <View style={styles.panel}>
          <Text style={styles.title}>확인해주셔서 감사합니다</Text>
          <Text style={styles.body}>
            {/* 서버가 판정한 상태 문구를 그대로 쓴다 */}
            {statusDescription(meeting.status === 'completed' ? 'matched' : 'meeting_confirm_pending')}
          </Text>
        </View>
        <AppButton label="닫기" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <AppButton
          label="네, 만났습니다"
          loading={confirm.isPending}
          testID="confirm-met"
          onPress={() =>
            confirm.mutate(undefined, {
              onSuccess: (result) => {
                // 문구는 상태값에서만 온다 — 여기서 직접 '성공'을 쓰지 않는다
                toast.show({ message: statusDescription(result.connectionStatus) });
                router.back();
              },
              onError: (e: Error) => toast.show({ message: e.message }),
            })
          }
        />
      }
    >
      <View style={styles.panel}>
        <Text style={styles.title}>만남은 어떠셨나요?</Text>
        <Text style={styles.when}>{formatMeetAt(meeting.meetAt)}</Text>
        <Text style={styles.where}>{meeting.place}</Text>
        <Text style={styles.body}>
          부모님께서 실제로 만나셨다면 확인을 눌러주세요. 양측 모두 확인하셔야 최종 처리됩니다.
        </Text>
        {meeting.confirmedByPartner ? (
          <Text style={styles.partner}>상대측은 이미 확인했습니다.</Text>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: theme.colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: spacing.lg,
    marginTop: spacing.md,
    gap: spacing.xxs,
  },
  title: { ...typography.title, color: theme.colors.text },
  when: { ...typography.subheading, color: theme.colors.text, marginTop: spacing.xs },
  where: { ...typography.body, color: theme.colors.textSecondary },
  body: { ...typography.body, color: theme.colors.textSecondary, marginTop: spacing.sm },
  partner: { ...typography.caption, color: theme.colors.primaryDark, marginTop: spacing.xs },
});
