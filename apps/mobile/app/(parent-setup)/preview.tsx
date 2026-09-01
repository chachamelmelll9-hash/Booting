import {
  missingLabel,
  useParentProfile,
  useParentProfileMutations,
  useProfileDraftStore,
} from '@features/parent-profile';
import type { DiscoveryItem } from '@shared/api/booting.types';
import { theme } from '@shared/config/colors';
import { radius, spacing, typography } from '@shared/config/tokens';
import {
  AppButton,
  ParentProfileCard,
  Screen,
  SkeletonList,
  StepProgressBar,
  useToast,
} from '@shared/ui';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

/**
 * 5단계 — 미리보기 후 공개.
 *
 * **다른 사람에게 보이는 것과 정확히 같은 컴포넌트**로 그린다. 미리보기 전용
 * 마크업을 따로 만들면 언제든 어긋나고, 부모님은 승인하지 않은 화면이 공개된다.
 */
export default function PreviewScreen() {
  const router = useRouter();
  const toast = useToast();
  const { data: profile, isLoading } = useParentProfile();
  const { submit } = useParentProfileMutations();
  const resetDraft = useProfileDraftStore((s) => s.reset);

  if (isLoading || !profile) {
    return (
      <Screen>
        <SkeletonList rows={1} shape="card" />
      </Screen>
    );
  }

  // 서버가 내려주는 공개용 모양을 그대로 흉내낸다 (별명·나이·지역)
  const preview: DiscoveryItem = {
    profileId: profile.id,
    nickname: profile.nickname,
    age: profile.age,
    region: profile.region,
    distanceKm: null,
    maritalStatus: profile.maritalStatus,
    goals: profile.goals,
    primaryPhotoUrl: profile.photos.find((p) => p.isPrimary)?.url ?? profile.photos[0]?.url ?? '',
    introExcerpt: profile.introByChild ?? '',
    badges: profile.badges,
  };

  const published = profile.status === 'published';

  return (
    <Screen
      scroll
      footer={
        published ? (
          <AppButton
            label="완료"
            testID="preview-done"
            onPress={() => {
              resetDraft();
              router.replace('/(tabs)/home');
            }}
          />
        ) : (
          <AppButton
            label="이대로 공개하기"
            disabled={!profile.submittable}
            loading={submit.isPending}
            testID="preview-publish"
            onPress={() =>
              submit.mutate(undefined, {
                onSuccess: () => {
                  resetDraft();
                  toast.show({ message: '부모님 프로필이 공개되었습니다' });
                },
                onError: (e: Error) => toast.show({ message: e.message }),
              })
            }
          />
        )
      }
    >
      <StepProgressBar current={5} total={5} label="미리보기" />

      <Text style={styles.title}>다른 분들에게는 이렇게 보입니다</Text>
      <Text style={styles.body}>
        실명 대신 별명 &lsquo;{preview.nickname}&rsquo;으로, 생년월일 대신 나이로만
        표시됩니다.
      </Text>

      <View style={styles.card}>
        <ParentProfileCard profile={preview} variant="preview" testID="preview-card" />
      </View>

      {!profile.submittable ? (
        <View style={styles.missing} testID="preview-missing">
          <Text style={styles.missingTitle}>공개하려면 아래 항목이 필요합니다</Text>
          {profile.missing.map((key) => (
            <Text key={key} style={styles.missingItem}>
              · {missingLabel(key)}
            </Text>
          ))}
          <AppButton
            label="수정하러 가기"
            variant="secondary"
            onPress={() => router.replace('/(parent-setup)/profile-edit')}
          />
        </View>
      ) : null}

      {published ? (
        <Text style={styles.published} testID="preview-published">
          공개되었습니다. 이제 추천 피드에서 다른 부모님을 만나보실 수 있습니다.
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.title, color: theme.colors.text, marginTop: spacing.md },
  body: { ...typography.body, color: theme.colors.textSecondary, marginTop: spacing.xs },
  card: { marginTop: spacing.lg },
  missing: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: theme.colors.warningBg,
    gap: spacing.xxs,
  },
  missingTitle: { ...typography.bodyStrong, color: theme.colors.text },
  missingItem: { ...typography.caption, color: theme.colors.textSecondary },
  published: {
    ...typography.body,
    color: theme.colors.primaryDark,
    backgroundColor: theme.colors.primarySurface,
    padding: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.lg,
  },
});
