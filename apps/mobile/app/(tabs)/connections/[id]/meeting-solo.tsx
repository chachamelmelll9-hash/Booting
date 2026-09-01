import { useMeetingMutations } from '@features/meetings';
import { theme } from '@shared/config/colors';
import {
  CHILD_ACCOMPANY_RECOMMENDATION,
  SOLO_SAFETY_CHECKLIST,
} from '@shared/config/safetyRules';
import { radius, spacing, typography } from '@shared/config/tokens';
import { AppButton, FormSection, SafetyNotice, Screen, TextField, useToast } from '@shared/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

/**
 * 자녀 미동행 확인 (TODO-03 / TODO-14).
 *
 * 별도 화면인 이유: 일정 폼 안의 체크박스 하나로 두면 아무도 읽지 않고 넘긴다.
 * 사유를 직접 쓰게 하고 안전수칙 3개를 **모두** 체크해야 진행된다.
 * 서버도 같은 조건을 강제한다 (사유·안전수칙 없으면 400).
 */
export default function MeetingSoloScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { propose } = useMeetingMutations(id ?? '');

  const [reason, setReason] = useState('');
  const [place, setPlace] = useState('');
  const [meetAt, setMeetAt] = useState('');
  const [checked, setChecked] = useState<boolean[]>(SOLO_SAFETY_CHECKLIST.map(() => false));
  const [error, setError] = useState<string | undefined>();

  const allChecked = checked.every(Boolean);
  const ready = allChecked && reason.trim().length >= 2;

  return (
    <Screen
      scroll
      footer={
        <AppButton
          label="이 조건으로 일정 제안하기"
          disabled={!ready}
          loading={propose.isPending}
          testID="solo-submit"
          onPress={() => {
            const parsed = parseMeetAt(meetAt);
            if (!parsed) {
              setError('YYYY-MM-DD HH:MM 형식으로 입력해주세요');
              return;
            }
            if (place.trim().length < 2) {
              setError('만날 장소를 입력해주세요');
              return;
            }
            setError(undefined);
            propose.mutate(
              {
                meetAt: parsed,
                place: place.trim(),
                childAccompanied: false,
                soloReason: reason.trim(),
                safetyAck: true,
              },
              {
                onSuccess: () => {
                  toast.show({ message: '일정을 제안했습니다' });
                  router.back();
                },
                onError: (e: Error) => toast.show({ message: e.message }),
              }
            );
          }}
        />
      }
    >
      <View style={styles.warning}>
        <Text style={styles.warningText}>{CHILD_ACCOMPANY_RECOMMENDATION}</Text>
      </View>

      <FormSection
        label="자녀가 동행하지 못하는 이유"
        required
        helper="상대측에도 함께 전달됩니다"
      >
        <TextField
          testID="solo-reason"
          value={reason}
          onChangeText={setReason}
          placeholder="예: 지방 거주로 당일 이동이 어렵습니다"
          multiline
          maxLength={200}
        />
      </FormSection>

      <FormSection label="날짜와 시간" required error={error}>
        <TextField
          testID="solo-when"
          value={meetAt}
          onChangeText={setMeetAt}
          placeholder="2026-09-15 14:00"
        />
      </FormSection>

      <FormSection label="장소" required>
        <TextField
          testID="solo-place"
          value={place}
          onChangeText={setPlace}
          placeholder="예: 강남역 2번 출구 앞 카페"
          maxLength={100}
        />
      </FormSection>

      <Text style={styles.checklistTitle}>아래 항목을 모두 확인해주세요</Text>
      <SafetyNotice
        variant="checklist"
        checked={checked}
        onToggle={(index) =>
          setChecked((prev) => prev.map((v, i) => (i === index ? !v : v)))
        }
      />
      {!allChecked ? (
        <Text style={styles.hint}>모든 항목을 확인하셔야 일정을 제안할 수 있습니다.</Text>
      ) : null}
    </Screen>
  );
}

function parseMeetAt(input: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/.exec(input.trim());
  if (!match) return null;
  const [, y, mo, d, h, mi] = match;
  const date = new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

const styles = StyleSheet.create({
  warning: {
    backgroundColor: theme.colors.warningBg,
    padding: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  warningText: { ...typography.body, color: theme.colors.textSecondary },
  checklistTitle: { ...typography.bodyStrong, color: theme.colors.text, marginBottom: spacing.xs },
  hint: { ...typography.caption, color: theme.colors.textTertiary, marginTop: spacing.xs },
});
