import { FEEDBACK_OPTIONS, useMeeting, useMeetingMutations } from '@features/meetings';
import type { MeetingFeedbackKind } from '@shared/api/booting.types';
import { theme } from '@shared/config/colors';
import { radius, spacing, typography } from '@shared/config/tokens';
import { AppButton, Screen, useToast } from '@shared/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

/**
 * 만남 후기 (PRD 12.3).
 *
 * **상대에게 절대 공개되지 않는다.** 그래서 이 화면에는 상대 응답을 보여주는
 * 자리가 없고, 서버에도 조회 API 가 없다 (test-scenarios S20.3 이 경로 부재를 검증).
 * 사용자가 솔직하게 답할 수 있어야 데이터가 쓸모 있어진다.
 */
export default function MeetingFeedbackScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();

  const { data: meeting } = useMeeting(id);
  const { sendFeedback } = useMeetingMutations(id ?? '');
  const [selected, setSelected] = useState<MeetingFeedbackKind | null>(
    meeting?.myFeedback ?? null
  );

  return (
    <Screen
      scroll
      footer={
        <AppButton
          label="보내기"
          disabled={!selected}
          loading={sendFeedback.isPending}
          testID="feedback-submit"
          onPress={() =>
            selected &&
            sendFeedback.mutate(selected, {
              onSuccess: () => {
                toast.show({ message: '응답을 보냈습니다' });
                router.back();
              },
              onError: (e: Error) => toast.show({ message: e.message }),
            })
          }
        />
      }
    >
      <Text style={styles.title}>만남 후 어떠셨나요?</Text>
      <Text style={styles.privacy}>
        이 응답은 상대방에게 공개되지 않습니다. 편하게 답해주세요.
      </Text>

      <View style={styles.options}>
        {FEEDBACK_OPTIONS.map((option) => {
          const on = selected === option.key;
          return (
            <Pressable
              key={option.key}
              testID={`feedback-${option.key}`}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={option.label}
              onPress={() => setSelected(option.key)}
              style={({ pressed }) => [
                styles.option,
                on && styles.optionSelected,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.optionLabel, on && styles.optionLabelSelected]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.title, color: theme.colors.text, marginTop: spacing.sm },
  privacy: {
    ...typography.caption,
    color: theme.colors.primaryDark,
    backgroundColor: theme.colors.primarySurface,
    padding: spacing.sm,
    borderRadius: radius.md,
    marginTop: spacing.xs,
  },
  options: { gap: spacing.xs, marginTop: spacing.lg },
  option: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    backgroundColor: theme.colors.surface,
  },
  optionSelected: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primarySurface },
  optionLabel: { ...typography.body, color: theme.colors.text },
  optionLabelSelected: { color: theme.colors.primaryDark, fontWeight: '600' },
  pressed: { opacity: 0.85 },
});
