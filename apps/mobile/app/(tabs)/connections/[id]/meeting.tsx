import { useConnection } from '@features/connections';
import {
  ddayLabel,
  formatMeetAt,
  meetingPhase,
  useMeeting,
  useMeetingMutations,
} from '@features/meetings';
import { theme } from '@shared/config/colors';
import { CHILD_ACCOMPANY_RECOMMENDATION } from '@shared/config/safetyRules';
import { HIT_SIZE, radius, spacing, typography } from '@shared/config/tokens';
import {
  AppButton,
  FormSection,
  SafetyNotice,
  Screen,
  SkeletonList,
  TextField,
  useToast,
} from '@shared/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

/**
 * 만남 일정 — 제안 폼과 상세 보기를 한 화면에서 상태로 나눈다.
 *
 * 자녀 동행이 기본값(true)이다. 미동행을 고르면 별도 화면(`meeting-solo`)에서
 * 사유와 안전수칙을 받는다 — 같은 폼에 끼워 넣으면 그냥 넘겨버리게 된다.
 */
export default function MeetingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();

  const { data: connection } = useConnection(id);
  const { data: meeting, isLoading } = useMeeting(id);
  const { propose, accept } = useMeetingMutations(id ?? '');

  const [place, setPlace] = useState('');
  const [meetAt, setMeetAt] = useState('');
  const [error, setError] = useState<string | undefined>();

  if (isLoading) {
    return (
      <Screen>
        <SkeletonList rows={3} />
      </Screen>
    );
  }

  const phase = meetingPhase(meeting);

  if (meeting && phase !== 'none') {
    return (
      <Screen
        scroll
        footer={
          phase === 'accept-required' ? (
            <AppButton
              label="이 일정으로 하겠습니다"
              loading={accept.isPending}
              testID="meeting-accept"
              onPress={() =>
                accept.mutate(undefined, {
                  onSuccess: () => toast.show({ message: '일정이 확정되었습니다' }),
                  onError: (e: Error) => toast.show({ message: e.message }),
                })
              }
            />
          ) : phase === 'confirmable' ? (
            <AppButton
              label="만남을 확인할게요"
              testID="meeting-go-confirm"
              onPress={() => router.push(`/(tabs)/connections/${id}/meeting-confirm`)}
            />
          ) : undefined
        }
      >
        <View style={styles.card}>
          <Text style={styles.dday}>{ddayLabel(meeting.meetAt)}</Text>
          <Text style={styles.when}>{formatMeetAt(meeting.meetAt)}</Text>
          <Text style={styles.where}>{meeting.place}</Text>

          <View style={styles.divider} />

          <Text style={styles.row}>
            자녀 동행: {meeting.childAccompanied ? '동행합니다' : '동행하지 않습니다'}
          </Text>
          {meeting.soloReason ? (
            <Text style={styles.soloReason}>사유: {meeting.soloReason}</Text>
          ) : null}

          <Text style={styles.row}>{phaseMessage(phase)}</Text>
        </View>

        <View style={styles.safety}>
          <Text style={styles.safetyTitle}>안전하게 만나시려면</Text>
          <SafetyNotice variant="list" />
        </View>
      </Screen>
    );
  }

  const canPropose = connection?.status === 'parent_intent' || connection?.status === 'chatting';

  return (
    <Screen
      scroll
      footer={
        <AppButton
          label="일정 제안하기"
          loading={propose.isPending}
          testID="meeting-propose"
          onPress={() => {
            const parsed = parseMeetAt(meetAt);
            if (!parsed) {
              setError('YYYY-MM-DD HH:MM 형식으로 입력해주세요 (예: 2026-09-15 14:00)');
              return;
            }
            if (place.trim().length < 2) {
              setError('만날 장소를 입력해주세요');
              return;
            }
            setError(undefined);
            propose.mutate(
              { meetAt: parsed, place: place.trim(), childAccompanied: true },
              {
                onSuccess: () => toast.show({ message: '일정을 제안했습니다' }),
                onError: (e: Error) => toast.show({ message: e.message }),
              }
            );
          }}
        />
      }
    >
      {!canPropose ? (
        <Text style={styles.blocked}>
          양측 부모님의 의사 확인이 끝나야 일정을 잡을 수 있습니다.
        </Text>
      ) : null}

      <Text style={styles.title}>만남 일정 제안</Text>

      <View style={styles.recommend}>
        <Text style={styles.recommendText}>{CHILD_ACCOMPANY_RECOMMENDATION}</Text>
      </View>

      <FormSection label="날짜와 시간" required error={error}>
        <TextField
          testID="meeting-when"
          value={meetAt}
          onChangeText={setMeetAt}
          placeholder="2026-09-15 14:00"
        />
      </FormSection>

      <FormSection label="장소" required helper="사람이 많은 공개된 장소를 권합니다">
        <TextField
          testID="meeting-place"
          value={place}
          onChangeText={setPlace}
          placeholder="예: 송파구 롯데월드타워 1층 카페"
          maxLength={100}
        />
      </FormSection>

      <Pressable
        testID="meeting-solo-entry"
        accessibilityRole="button"
        accessibilityLabel="자녀 없이 부모님만 만나시나요"
        onPress={() => router.push(`/(tabs)/connections/${id}/meeting-solo`)}
        style={({ pressed }) => [styles.soloEntry, pressed && styles.pressed]}
      >
        <Text style={styles.soloEntryText}>자녀 없이 부모님만 만나시나요?</Text>
      </Pressable>

      <View style={styles.safety}>
        <SafetyNotice variant="list" />
      </View>
    </Screen>
  );
}

function phaseMessage(phase: ReturnType<typeof meetingPhase>): string {
  switch (phase) {
    case 'awaiting-accept':
      return '상대측의 수락을 기다리고 있습니다.';
    case 'accept-required':
      return '상대측이 제안한 일정입니다. 확인해주세요.';
    case 'scheduled':
      return '만남 이후에 확인 버튼이 열립니다.';
    case 'confirmable':
      return '만남은 어떠셨나요? 확인을 남겨주세요.';
    case 'awaiting-partner-confirm':
      // 여기서 '매칭 성공'이라고 쓰지 않는다 — 아직 한쪽만 확인했다
      return '확인해주셔서 감사합니다. 상대측 확인을 기다리고 있습니다.';
    case 'completed':
      return '양측 모두 만남을 확인했습니다.';
    default:
      return '';
  }
}

/** "YYYY-MM-DD HH:MM" → ISO. 형식이 틀리면 null */
function parseMeetAt(input: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/.exec(input.trim());
  if (!match) return null;
  const [, y, mo, d, h, mi] = match;
  const date = new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

const styles = StyleSheet.create({
  title: { ...typography.title, color: theme.colors.text, marginTop: spacing.sm },
  blocked: {
    ...typography.caption,
    color: theme.colors.warning,
    backgroundColor: theme.colors.warningBg,
    padding: spacing.sm,
    borderRadius: radius.md,
    marginTop: spacing.sm,
  },
  recommend: {
    backgroundColor: theme.colors.primarySurface,
    padding: spacing.sm,
    borderRadius: radius.md,
    marginVertical: spacing.md,
  },
  recommendText: { ...typography.caption, color: theme.colors.primaryDark },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: spacing.md,
    marginTop: spacing.md,
    gap: spacing.xxs,
  },
  dday: { ...typography.micro, color: theme.colors.primaryDark },
  when: { ...typography.heading, color: theme.colors.text },
  where: { ...typography.body, color: theme.colors.textSecondary },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border,
    marginVertical: spacing.xs,
  },
  row: { ...typography.caption, color: theme.colors.textSecondary },
  soloReason: { ...typography.caption, color: theme.colors.textTertiary },
  soloEntry: { minHeight: HIT_SIZE, justifyContent: 'center' },
  soloEntryText: {
    ...typography.caption,
    color: theme.colors.textTertiary,
    textDecorationLine: 'underline',
  },
  safety: { marginTop: spacing.lg, gap: spacing.xs },
  safetyTitle: { ...typography.bodyStrong, color: theme.colors.text },
  pressed: { opacity: 0.8 },
});
