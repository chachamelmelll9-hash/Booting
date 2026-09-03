import { useParentProfile, useParentProfileMutations } from '@features/parent-profile';
import { sendConsentLink } from '@features/parent-profile/lib/sendConsentLink';
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
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

const CONSENT_POINTS = [
  '부모님 사진과 소개가 다른 회원에게 공개됩니다.',
  '실명·생년월일·연락처·정확한 주소는 공개되지 않습니다.',
  '양쪽 부모님이 모두 원하실 때만 연락처가 서로에게 전달됩니다.',
  '언제든 부모님 뜻에 따라 공개를 중단할 수 있습니다.',
];

/** 부모님이 링크를 여실 때까지 기다리는 간격·횟수 */
const POLL_INTERVAL_MS = 5_000;
const POLL_ATTEMPTS = 24;

/**
 * 4단계 — 부모님 동의.
 *
 * **자녀가 대신 눌러 주는 경로는 없다.** 예전에는 "직접 여쭤봤습니다" 를 눌러
 * 스스로 기록했는데, 그건 자녀의 진술이지 부모님의 동의가 아니다. 개인정보
 * 보호법이 요구하는 것은 정보주체 본인의 동의이고, 다투게 되면 동의를 받았다는
 * 사실을 증명해야 하는 쪽은 우리다.
 *
 * 그래서 부모님께 링크를 보내고, 부모님이 그 페이지에서 직접 누르신 기록만
 * 동의로 인정한다. 이 화면은 보내고 기다리는 일만 한다.
 */
export default function ConsentScreen() {
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data: profile, isLoading } = useParentProfile();
  const { createConsentLink } = useParentProfileMutations();

  const [parentName, setParentName] = useState('');
  const [phone, setPhone] = useState('');
  const [waiting, setWaiting] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const already = profile?.badges.consent;

  // 동의가 들어오면 기다림을 끝낸다
  useEffect(() => {
    if (already) setWaiting(false);
  }, [already]);

  if (isLoading) {
    return (
      <Screen>
        <SkeletonList rows={3} />
      </Screen>
    );
  }

  if (!profile) {
    return (
      <Screen
        footer={
          <AppButton
            label="프로필 작성하러 가기"
            onPress={() => router.replace('/(parent-setup)/profile-edit')}
          />
        }
      >
        <Text style={styles.body}>먼저 부모님 프로필을 작성해주세요.</Text>
      </Screen>
    );
  }

  /** 부모님이 링크를 여실 때까지 프로필을 다시 물어본다 */
  const pollForConsent = () => {
    setWaiting(true);
    for (let i = 1; i <= POLL_ATTEMPTS; i++) {
      timers.current.push(
        setTimeout(() => {
          void queryClient.invalidateQueries({ queryKey: ['parent-profile'] });
          if (i === POLL_ATTEMPTS) setWaiting(false);
        }, POLL_INTERVAL_MS * i)
      );
    }
  };

  const handleSend = () => {
    const name = parentName.trim() || profile.displayName;
    if (!/^01[016789]\d{7,8}$/.test(phone)) {
      toast.show({ message: '부모님 휴대폰 번호를 확인해주세요' });
      return;
    }

    createConsentLink.mutate(
      { parentName: name, phone },
      {
        onSuccess: async (link) => {
          // 보내지 않고 닫았으면 기다림을 시작하지 않는다 —
          // 보내지도 않았는데 '보냈습니다' 가 뜨면 안 된다
          const outcome = await sendConsentLink(link.parentName, link.url);
          if (outcome === 'sent') pollForConsent();
        },
        onError: (e: Error) => toast.show({ message: e.message }),
      }
    );
  };

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
            label="부모님 동의 받기"
            loading={createConsentLink.isPending}
            disabled={waiting}
            testID="consent-send"
            onPress={handleSend}
          />
        )
      }
    >
      <StepProgressBar current={4} total={5} label="부모님 동의" />

      <Text style={styles.title}>부모님께 동의를 여쭙습니다</Text>
      <Text style={styles.lede}>
        아래 내용을 담은 링크를 부모님께 보내드립니다. 부모님이 직접 확인하고 눌러 주셔야
        프로필을 공개할 수 있습니다.
      </Text>

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
          {profile.consent?.parentName} 님이 직접 동의해 주셨습니다.
        </Text>
      ) : waiting ? (
        <Text style={styles.waiting} testID="consent-waiting">
          부모님께 보냈습니다.{'\n'}부모님이 링크를 열고 동의하시면 여기에 표시됩니다.
        </Text>
      ) : (
        <>
          <FormSection label="부모님 성함" helper="동의서에 이 이름으로 인사드립니다">
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
  lede: { ...typography.body, color: theme.colors.textSecondary, marginTop: spacing.xs },
  body: { ...typography.body, color: theme.colors.textSecondary, marginTop: spacing.md },
  points: { marginTop: spacing.md, gap: spacing.xs, marginBottom: spacing.lg },
  point: { flexDirection: 'row', gap: spacing.xs },
  bullet: { ...typography.body, color: theme.colors.primary },
  pointText: { ...typography.body, color: theme.colors.textSecondary, flex: 1 },
  done: {
    ...typography.body,
    color: theme.colors.primaryDark,
    backgroundColor: theme.colors.primarySurface,
    padding: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.lg,
  },
  waiting: {
    ...typography.body,
    color: theme.colors.primaryDark,
    backgroundColor: theme.colors.primarySurface,
    padding: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.lg,
  },
});
