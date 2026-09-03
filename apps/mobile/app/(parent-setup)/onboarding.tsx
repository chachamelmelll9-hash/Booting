import {
  ineligibleReason,
  isEligible,
  MARITAL_CHOICES,
  type MaritalChoice,
  useProfileDraftStore,
} from '@features/parent-profile';
import { theme } from '@shared/config/colors';
import { radius, spacing, typography } from '@shared/config/tokens';
import {
  AppButton,
  BootingLogo,
  BootingTagline,
  Screen,
  StepProgressBar,
} from '@shared/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const INTRO_POINTS = [
  '자녀분이 대신 등록하고 프로필을 고르며, 부모님은 최종 결정만 하시면 됩니다.',
  '부모님 동의 없이는 프로필이 공개되지 않습니다.',
  '실명·생년월일·연락처는 상대에게 공개되지 않습니다.',
];

/**
 * 1단계 — 서비스 안내 + 자격 확인.
 *
 * 혼인 상태를 여기서 먼저 묻는 이유: 별거·혼인 중이면 등록 자체가 불가능한데,
 * 프로필을 다 쓰고 나서 막히면 시간을 통째로 버리게 된다.
 */
export default function OnboardingScreen() {
  const router = useRouter();
  const { draft, set } = useProfileDraftStore();
  const [choice, setChoice] = useState<MaritalChoice | null>(
    (draft.maritalStatus as MaritalChoice) ?? null
  );

  const blocked = choice ? ineligibleReason(choice) : null;
  const canProceed = !!choice && isEligible(choice);

  return (
    <Screen
      scroll
      footer={
        <AppButton
          label="다음"
          disabled={!canProceed}
          testID="onboarding-next"
          onPress={() => {
            if (!choice || !isEligible(choice)) return;
            set({ maritalStatus: choice });
            router.push('/(parent-setup)/verification');
          }}
        />
      }
    >
      <StepProgressBar current={1} total={5} label="서비스 안내" />

      <View style={styles.hero}>
        <BootingLogo size="lg" />
        <BootingTagline size="lg" />
      </View>

      <View style={styles.points}>
        {INTRO_POINTS.map((point) => (
          <View key={point} style={styles.point}>
            <Text style={styles.bullet}>·</Text>
            <Text style={styles.pointText}>{point}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.question}>부모님의 현재 혼인 상태를 알려주세요</Text>
      <View style={styles.choices}>
        {MARITAL_CHOICES.map((option) => {
          const on = choice === option.key;
          return (
            <Pressable
              key={option.key}
              testID={`marital-${option.key}`}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={option.label}
              onPress={() => setChoice(option.key)}
              style={({ pressed }) => [
                styles.choice,
                on && styles.choiceSelected,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.choiceText, on && styles.choiceTextSelected]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* 막는 이유를 문장으로 보여준다 — 비활성 버튼만 두면 고장으로 오해한다 */}
      {blocked ? (
        <Text style={styles.blocked} testID="marital-blocked">
          {blocked}
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { marginTop: spacing.lg, gap: spacing.xs },
  points: { marginTop: spacing.xl, gap: spacing.xs },
  point: { flexDirection: 'row', gap: spacing.xs },
  bullet: { ...typography.body, color: theme.colors.primary },
  pointText: { ...typography.body, color: theme.colors.textSecondary, flex: 1 },
  question: { ...typography.subheading, color: theme.colors.text, marginTop: spacing.xxl },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm },
  choice: {
    minWidth: 88,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
  },
  choiceSelected: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primarySurface },
  choiceText: { ...typography.body, color: theme.colors.textSecondary },
  choiceTextSelected: { color: theme.colors.primaryDark, fontWeight: '600' },
  blocked: {
    ...typography.body,
    color: theme.colors.error,
    backgroundColor: theme.colors.errorBg,
    padding: spacing.sm,
    borderRadius: radius.md,
    marginTop: spacing.md,
  },
  pressed: { opacity: 0.85 },
});
