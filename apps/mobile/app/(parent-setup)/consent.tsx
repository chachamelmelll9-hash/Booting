import { useParentProfile, useParentProfileMutations } from '@features/parent-profile';
import { theme } from '@shared/config/colors';
import { radius, spacing, typography } from '@shared/config/tokens';
import {
  AppButton,
  FormSection,
  Screen,
  SkeletonList,
  StepProgressBar,
  TextField,
  useToast,
} from '@shared/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const CONSENT_POINTS = [
  '부모님 사진과 소개가 다른 회원에게 공개됩니다.',
  '실명·생년월일·연락처·정확한 주소는 공개되지 않습니다.',
  '언제든 부모님 뜻에 따라 공개를 중단할 수 있습니다.',
];

/**
 * 4단계 — 부모님 동의.
 *
 * 이 단계 없이 published 로 가는 경로는 서버에도 없다. 동의를 철회하면
 * 프로필은 즉시 비공개로 내려간다.
 */
export default function ConsentScreen() {
  const router = useRouter();
  const toast = useToast();
  const { data: profile, isLoading } = useParentProfile();
  const { requestConsent } = useParentProfileMutations();

  const [method, setMethod] = useState<'in_person' | 'sms'>('in_person');
  const [parentName, setParentName] = useState('');
  const [phone, setPhone] = useState('');

  if (isLoading) {
    return (
      <Screen>
        <SkeletonList rows={3} />
      </Screen>
    );
  }

  if (!profile) {
    return (
      <Screen footer={<AppButton label="프로필 작성하러 가기" onPress={() => router.replace('/(parent-setup)/profile-edit')} />}>
        <Text style={styles.body}>먼저 부모님 프로필을 작성해주세요.</Text>
      </Screen>
    );
  }

  const already = profile.badges.consent;

  return (
    <Screen
      scroll
      footer={
        already ? (
          <AppButton
            label="다음"
            testID="consent-next"
            onPress={() => router.push('/(parent-setup)/preview')}
          />
        ) : (
          <AppButton
            label="동의 받았습니다"
            loading={requestConsent.isPending}
            testID="consent-submit"
            onPress={() => {
              const name = parentName.trim() || profile.displayName;
              // 동의 방법과 무관하게 번호를 받는다 — 매칭이 되면 이 번호를
              // 상대 부모님께 열어드리는 것이 이 서비스의 목적지다
              if (!/^01[016789]\d{7,8}$/.test(phone)) {
                toast.show({ message: '부모님 휴대폰 번호를 확인해주세요' });
                return;
              }
              requestConsent.mutate(
                { method, parentName: name, phone },
                {
                  onSuccess: () => {
                    toast.show({ message: '부모님 동의가 기록되었습니다' });
                    router.push('/(parent-setup)/preview');
                  },
                  onError: (e: Error) => toast.show({ message: e.message }),
                }
              );
            }}
          />
        )
      }
    >
      <StepProgressBar current={4} total={5} label="부모님 동의" />

      <Text style={styles.title}>부모님께 꼭 알려드려 주세요</Text>

      <View style={styles.points}>
        {CONSENT_POINTS.map((point) => (
          <View key={point} style={styles.point}>
            <Text style={styles.bullet}>·</Text>
            <Text style={styles.pointText}>{point}</Text>
          </View>
        ))}
      </View>

      {already ? (
        <Text style={styles.done} testID="consent-done">
          {profile.consent?.parentName} 님의 동의가 확인되었습니다.
        </Text>
      ) : (
        <>
          <Text style={styles.question}>어떻게 동의를 받으셨나요?</Text>
          <View style={styles.methods}>
            {(
              [
                { key: 'in_person' as const, label: '직접 여쭤봤습니다', hint: '대면·통화로 확인' },
                { key: 'sms' as const, label: '문자로 확인받겠습니다', hint: '부모님 번호로 안내 발송' },
              ]
            ).map((option) => {
              const on = method === option.key;
              return (
                <Pressable
                  key={option.key}
                  testID={`consent-${option.key}`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={option.label}
                  onPress={() => setMethod(option.key)}
                  style={({ pressed }) => [
                    styles.method,
                    on && styles.methodSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.methodLabel, on && styles.methodLabelSelected]}>
                    {option.label}
                  </Text>
                  <Text style={styles.methodHint}>{option.hint}</Text>
                </Pressable>
              );
            })}
          </View>

          <FormSection label="부모님 성함" helper="동의 기록에 남습니다">
            <TextField
              testID="consent-name"
              value={parentName}
              onChangeText={setParentName}
              placeholder={profile.displayName}
              maxLength={20}
            />
          </FormSection>

          <FormSection
            label="부모님 휴대폰 번호"
            required
            helper="양측 부모님이 서로 원하시면 이 번호를 상대 부모님께 알려드립니다."
          >
            <TextField
              testID="consent-phone"
              value={phone}
              onChangeText={setPhone}
              placeholder="01012345678"
              keyboardType="phone-pad"
              maxLength={11}
            />
          </FormSection>

        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.title, color: theme.colors.text, marginTop: spacing.md },
  body: { ...typography.body, color: theme.colors.textSecondary, marginTop: spacing.md },
  points: { marginTop: spacing.md, gap: spacing.xs },
  point: { flexDirection: 'row', gap: spacing.xs },
  bullet: { ...typography.body, color: theme.colors.primary },
  pointText: { ...typography.body, color: theme.colors.textSecondary, flex: 1 },
  question: { ...typography.subheading, color: theme.colors.text, marginTop: spacing.xl },
  methods: { gap: spacing.xs, marginTop: spacing.sm, marginBottom: spacing.lg },
  method: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    backgroundColor: theme.colors.surface,
    gap: 2,
  },
  methodSelected: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primarySurface },
  methodLabel: { ...typography.bodyStrong, color: theme.colors.text },
  methodLabelSelected: { color: theme.colors.primaryDark },
  methodHint: { ...typography.caption, color: theme.colors.textTertiary },
  done: {
    ...typography.body,
    color: theme.colors.primaryDark,
    backgroundColor: theme.colors.primarySurface,
    padding: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.lg,
  },
  pressed: { opacity: 0.85 },
});
