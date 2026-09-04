import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useVerification, useVerificationMutations } from '@features/parent-profile';
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
import { StyleSheet, Text, View } from 'react-native';

/**
 * 2단계 — 자녀 본인확인.
 *
 * 휴대폰 본인인증 하나다. 가족관계증명서는 받지 않는다 — 남의 부모님을 막는
 * 실제 장치는 **부모님 본인의 동의**이고(부모님이 링크를 열고 직접 누르셔야
 * 공개된다), 증명서는 그 위에 서류 한 장을 더 얹어 등록하려는 자녀 모두를
 * 주민센터로 보냈다.
 */
export default function VerificationScreen() {
  const router = useRouter();
  const toast = useToast();

  const { data: status, isLoading } = useVerification();
  const { submitPhone } = useVerificationMutations();

  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);

  if (isLoading || !status) {
    return (
      <Screen>
        <SkeletonList rows={3} />
      </Screen>
    );
  }

  const done = status.phoneVerified;

  return (
    <Screen
      scroll
      footer={
        <AppButton
          label="다음"
          disabled={!done}
          testID="verification-next"
          onPress={() => router.push('/(parent-setup)/profile-edit')}
        />
      }
    >
      <StepProgressBar current={2} total={5} label="자녀 인증" />

      <Text style={styles.title}>자녀분 본인 확인</Text>
      <Text style={styles.body}>
        부모님을 대신해 등록하시는 분이 실제 자녀인지 확인합니다.
      </Text>

      <View style={styles.card}>
        <CheckRow label="휴대폰 본인인증" done={status.phoneVerified} />
        {status.phoneVerified ? (
          <Text style={styles.doneText}>{status.phoneMasked} 인증 완료</Text>
        ) : (
          <>
            <FormSection label="휴대폰 번호" required>
              <TextField
                testID="verify-phone"
                value={phone}
                onChangeText={setPhone}
                placeholder="01012345678"
                keyboardType="phone-pad"
                maxLength={11}
              />
            </FormSection>

            {!codeSent ? (
              <AppButton
                label="인증번호 받기"
                variant="secondary"
                testID="verify-send-code"
                onPress={() => {
                  // TODO-04 개발 스텁: 실 SMS 연동 전까지는 숫자면 통과시킨다.
                  // 실제 문자를 받을 수 없는 환경에서 형식 검사가 등록을 막는다.
                  if (!/^\d{4,15}$/.test(phone)) {
                    toast.show({ message: '숫자로 입력해주세요' });
                    return;
                  }
                  setCodeSent(true);
                  toast.show({ message: '인증번호를 전송했습니다 (개발용: 아무 숫자나 입력)' });
                }}
              />
            ) : (
              <>
                <FormSection label="인증번호 6자리" required>
                  <TextField
                    testID="verify-code"
                    value={code}
                    onChangeText={setCode}
                    placeholder="000000"
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </FormSection>
                <AppButton
                  label="인증 확인"
                  loading={submitPhone.isPending}
                  testID="verify-submit-phone"
                  onPress={() =>
                    submitPhone.mutate(
                      { phone, token: code },
                      {
                        onSuccess: () => toast.show({ message: '본인인증이 완료되었습니다' }),
                        onError: (e: Error) => toast.show({ message: e.message }),
                      }
                    )
                  }
                />
              </>
            )}
          </>
        )}
      </View>

    </Screen>
  );
}

function CheckRow({ label, done }: { label: string; done: boolean }) {
  return (
    <View style={styles.checkRow}>
      <FontAwesome
        name={done ? 'check-circle' : 'circle-o'}
        size={18}
        color={done ? theme.colors.primary : theme.colors.textMuted}
      />
      <Text style={styles.checkLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.title, color: theme.colors.text, marginTop: spacing.md },
  body: { ...typography.body, color: theme.colors.textSecondary, marginTop: spacing.xs },
  card: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    gap: spacing.xs,
  },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  checkLabel: { ...typography.subheading, color: theme.colors.text },
  doneText: { ...typography.caption, color: theme.colors.primaryDark },
});
