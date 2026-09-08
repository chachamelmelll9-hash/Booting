import FontAwesome from '@expo/vector-icons/FontAwesome';
import { getKakaoIdToken, isKakaoCancel, kakaoLinkApi } from '@features/auth';
import { useVerification, useVerificationMutations } from '@features/parent-profile';
import { bootingKeys } from '@shared/api/booting';
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
import { useMutation, useQueryClient } from '@tanstack/react-query';
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

  const queryClient = useQueryClient();
  /**
   * 카카오 계정을 이 계정에 붙인다.
   *
   * 카카오 계정 하나는 부팅 계정 하나에만 붙으므로(서버 `social_identities`),
   * 이 연결이 곧 "계정을 몇 개든 만들 수는 없다" 가 된다. 전화번호나 실명은
   * 받아오지 않는다 — 그 동의항목은 비즈니스 앱 전환이 있어야 열린다.
   */
  const linkKakao = useMutation({
    mutationFn: async () => kakaoLinkApi.link(await getKakaoIdToken()),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: bootingKeys.verification });
      toast.show({ message: '카카오 계정이 확인되었습니다' });
    },
    onError: (error: unknown) => {
      // 사용자가 카카오 화면에서 그냥 나오신 것 — 실패로 알릴 일이 아니다
      if (isKakaoCancel(error)) return;
      toast.show({
        message: error instanceof Error ? error.message : '확인하지 못했습니다',
      });
    },
  });

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

  const done = status.canCreateProfile;

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
      <StepProgressBar current={2} total={5} label="계정 확인" />

      <Text style={styles.title}>계정을 한 번 확인합니다</Text>
      <Text style={styles.body}>
        한 분이 계정을 여러 개 만들어 등록하시는 것을 막기 위한 절차입니다.
        {status.phoneAvailable ? ' 아래 중 하나만 하시면 됩니다.' : ''}
      </Text>

      {/*
        카카오를 먼저 둔다. 지금 실제로 열리는 문이 이쪽이고(문자 발송은 사업자
        계약이 있어야 한다), 부모님께 프로필과 동의 링크를 보내는 통로도 카카오라
        어차피 한 번은 거치시게 된다.
      */}
      <View style={styles.card}>
        <CheckRow label="카카오 계정 확인" done={status.kakaoLinked} />
        {status.kakaoLinked ? (
          <Text style={styles.doneText}>카카오 계정이 연결되었습니다</Text>
        ) : (
          <>
            <Text style={styles.cardHint}>
              카카오 계정 하나로는 한 분만 등록하실 수 있습니다.
            </Text>
            <AppButton
              label="카카오로 확인하기"
              loading={linkKakao.isPending}
              testID="verify-kakao"
              onPress={() => linkKakao.mutate()}
            />
          </>
        )}
      </View>

      {/*
        문자 사업자가 없으면 아예 감춘다.
        못 보내는 동안 버튼만 두면 눌러도 에러가 나는 길이 하나 생긴다. 서버가
        `phoneAvailable` 로 알려주므로, 사업자가 붙는 순간 이 화면은 저절로 살아난다.
      */}
      {status.phoneAvailable ? (
        <>
      <Text style={styles.orLabel}>또는</Text>

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
        </>
      ) : null}
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
  cardHint: { ...typography.caption, color: theme.colors.textTertiary },
  orLabel: {
    ...typography.caption,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
