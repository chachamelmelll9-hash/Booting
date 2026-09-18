import { useProfileDraftStore } from '@features/parent-profile';
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
import { StyleSheet, Text, View } from 'react-native';

const INTRO_POINTS = [
  '자녀분이 대신 등록하고 프로필을 고르며, 부모님은 최종 결정만 하시면 됩니다.',
  '부모님 동의 없이는 프로필이 공개되지 않습니다.',
  '실명·생년월일·연락처는 상대에게 공개되지 않습니다.',
];

/**
 * 1단계 — 서비스 안내 + 자격 확인.
 *
 * 전에는 여기서 사별/이혼/별거/혼인 중 가운데 하나를 고르게 했다. 이제는
 * **어느 쪽인지 묻지 않는다** (2026-09-18). 사별인지 이혼인지는 부모님의 가족사라
 * 남에게 알리고 싶지 않은 값인데, 자격을 가르는 데는 "둘 중 하나" 라는 사실만
 * 있으면 된다. 그래서 문장을 읽고 "네, 해당됩니다" 로 확인만 받는다.
 *
 * 팝업이 아니라 화면 안의 단계로 둔다 — 작은 팝업은 읽지 않고 반사적으로 닫힌다.
 * 이 확인이 없으면 서버가 프로필 생성을 거부한다 (`eligibilityConfirmed`).
 * 옛 버전은 브랜치 `이혼사별여부있음` 에 있다.
 */
export default function OnboardingScreen() {
  const router = useRouter();
  const set = useProfileDraftStore((s) => s.set);

  return (
    <Screen
      scroll
      footer={
        <AppButton
          label="네, 해당됩니다"
          testID="onboarding-next"
          onPress={() => {
            set({ eligibilityConfirmed: true });
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

      {/* 자격 확인 — 무엇을 묻는지, 왜 묻는지, 무엇은 안 묻는지를 한 자리에 */}
      <View style={styles.eligibility} testID="eligibility-notice">
        <Text style={styles.eligibilityTitle}>등록하시기 전에 확인해주세요</Text>
        <Text style={styles.eligibilityBody}>
          등록하실 수 있는 부모님은 <Text style={styles.strong}>사별 또는 이혼</Text>하신 분입니다.
          {'\n'}별거 중이시거나 혼인 관계가 유지되는 경우에는 등록하실 수 없습니다.
        </Text>
        <Text style={styles.eligibilityNote}>
          사별인지 이혼인지는 여쭤보지 않으며, 어디에도 표시되지 않습니다.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { marginTop: spacing.lg, gap: spacing.xs },
  points: { marginTop: spacing.xl, gap: spacing.xs },
  point: { flexDirection: 'row', gap: spacing.xs },
  bullet: { ...typography.body, color: theme.colors.primary },
  pointText: { ...typography.body, color: theme.colors.textSecondary, flex: 1 },
  eligibility: {
    marginTop: spacing.xxl,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySurface,
    gap: spacing.xs,
  },
  eligibilityTitle: { ...typography.subheading, color: theme.colors.text },
  eligibilityBody: { ...typography.body, color: theme.colors.text, lineHeight: 24 },
  strong: { fontWeight: '700', color: theme.colors.primaryDark },
  eligibilityNote: { ...typography.caption, color: theme.colors.textTertiary },
});
