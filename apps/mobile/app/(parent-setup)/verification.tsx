import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useAuthStore } from '@features/auth';
import {
  pickImage,
  uploadToStorage,
  useVerification,
  useVerificationMutations,
} from '@features/parent-profile';
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
 * 2단계 — 자녀 인증.
 *
 * 본인인증과 가족관계 확인 둘 다 끝나야 프로필을 만들 수 있다.
 * 이게 이 서비스에서 "아무나 남의 부모님을 올리는" 걸 막는 유일한 장치다.
 */
export default function VerificationScreen() {
  const router = useRouter();
  const toast = useToast();
  const user = useAuthStore((s) => s.user);

  const { data: status, isLoading } = useVerification();
  const { submitPhone, submitFamilyDoc } = useVerificationMutations();

  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [uploading, setUploading] = useState(false);

  if (isLoading || !status) {
    return (
      <Screen>
        <SkeletonList rows={3} />
      </Screen>
    );
  }

  const done = status.phoneVerified && status.familyVerified;

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
                  if (!/^01[016789]\d{7,8}$/.test(phone)) {
                    toast.show({ message: '휴대폰 번호 형식을 확인해주세요' });
                    return;
                  }
                  setCodeSent(true);
                  toast.show({ message: '인증번호를 전송했습니다' });
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

      <View style={styles.card}>
        <CheckRow label="가족관계 확인" done={status.familyVerified} />
        {status.familyVerified ? (
          <Text style={styles.doneText}>가족관계 확인이 완료되었습니다</Text>
        ) : (
          <>
            <Text style={styles.body}>
              가족관계증명서를 올려주세요. 원본은 확인 용도로만 쓰이고 다른 사용자에게는
              절대 공개되지 않습니다.
            </Text>
            <AppButton
              label="가족관계증명서 올리기"
              variant="secondary"
              loading={uploading || submitFamilyDoc.isPending}
              testID="verify-family-doc"
              onPress={async () => {
                if (!user?.id) {
                  toast.show({ message: '로그인 정보를 확인할 수 없습니다' });
                  return;
                }
                try {
                  setUploading(true);
                  const image = await pickImage();
                  if (!image) return;
                  const path = await uploadToStorage('family-docs', user.id, image);
                  submitFamilyDoc.mutate(path, {
                    onSuccess: () => toast.show({ message: '가족관계 확인이 완료되었습니다' }),
                    onError: (e: Error) => toast.show({ message: e.message }),
                  });
                } catch (error) {
                  toast.show({ message: (error as Error).message });
                } finally {
                  setUploading(false);
                }
              }}
            />
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
