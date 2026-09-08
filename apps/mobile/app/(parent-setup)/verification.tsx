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
import { useEffect,useState } from 'react';
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
  const { requestPhoneCode, submitPhone } = useVerificationMutations();

  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  /** 재발송까지 남은 초 — 서버가 정한 간격을 화면이 그대로 센다 */
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  /**
   * 형식은 서버가 최종 판정한다. 여기서 한 번 더 보는 이유는 오타 때문에
   * 문자 한 통을 낭비하지 않기 위해서다.
   */
  const sendCode = () => {
    if (!/^01[016789]\d{7,8}$/.test(phone)) {
      toast.show({ message: '휴대폰 번호를 확인해주세요 (예: 01012345678)' });
      return;
    }
    requestPhoneCode.mutate(
      { phone },
      {
        onSuccess: (result) => {
          setCodeSent(true);
          setResendIn(result.resendAfterSec);
          toast.show({ message: '인증번호를 문자로 보냈습니다' });
        },
        onError: (e: Error) => toast.show({ message: e.message }),
      }
    );
  };

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
                loading={requestPhoneCode.isPending}
                testID="verify-send-code"
                variant="secondary"
                onPress={() => sendCode()}
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
                {/* 문자가 안 올 수 있다. 다시 받을 길이 화면에 없으면 여기서 막힌다 */}
                <AppButton
                  label={resendIn > 0 ? `인증번호 다시 받기 (${resendIn}초)` : '인증번호 다시 받기'}
                  variant="secondary"
                  disabled={resendIn > 0 || requestPhoneCode.isPending}
                  testID="verify-resend-code"
                  onPress={() => sendCode()}
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
