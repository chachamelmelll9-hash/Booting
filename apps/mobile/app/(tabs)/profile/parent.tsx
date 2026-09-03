import {
  ProfileStatusPanel,
  useParentProfile,
  useParentProfileMutations,
} from '@features/parent-profile';
import { theme } from '@shared/config/colors';
import { radius, spacing, typography } from '@shared/config/tokens';
import {
  AppButton,
  DestructiveConfirmDialog,
  EmptyState,
  Screen,
  SkeletonList,
  useToast,
} from '@shared/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

/**
 * 부모님 프로필 상태 관리.
 *
 * 공개 중단과 동의 철회를 둘 다 여기 둔다. 둘은 다른 동작이다 —
 * 중단은 되돌릴 수 있고, 철회는 동의 자체를 지워서 다시 받아야 한다.
 * 문구에서 그 차이를 분명히 한다.
 */
export default function ParentProfileScreen() {
  const router = useRouter();
  const toast = useToast();
  const { data: profile, isLoading } = useParentProfile();
  const { setVisibility, revokeConsent } = useParentProfileMutations();

  const [confirmHide, setConfirmHide] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  if (isLoading) {
    return (
      <Screen>
        <SkeletonList rows={3} />
      </Screen>
    );
  }

  if (!profile) {
    return (
      <Screen>
        <EmptyState
          icon="user-plus"
          title="등록된 부모님 프로필이 없습니다"
          description="자녀 인증을 마치면 부모님 프로필을 등록하실 수 있습니다."
          cta={{
            label: '등록 시작하기',
            onPress: () => router.push('/(parent-setup)/onboarding'),
          }}
          testID="parent-empty"
        />
      </Screen>
    );
  }

  const published = profile.status === 'published';

  return (
    <Screen scroll>
      <ProfileStatusPanel profile={profile} />

      {/*
        부모님 접속 코드.
        부모님은 회원가입 없이 이 여섯 자리만으로 자기 화면에 들어가신다.
        자녀가 부모님께 직접 알려드려야 하므로 눈에 잘 띄는 자리에 크게 둔다.
      */}
      {profile.accessCode ? (
        <View style={styles.codeBox} testID="parent-access-code">
          <Text style={styles.codeLabel}>부모님 접속 코드</Text>
          <Text style={styles.code} selectable>
            {profile.accessCode}
          </Text>
          <Text style={styles.codeHelp}>
            부모님께 이 코드를 알려드리세요. 앱 로그인 화면에서 &apos;부모님이신가요? 코드로
            시작&apos;을 누르고 넣으시면 됩니다.
          </Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        <AppButton
          label="프로필 수정하기"
          variant="secondary"
          testID="parent-edit"
          onPress={() => router.push('/(parent-setup)/profile-edit')}
        />

        {published ? (
          <AppButton
            label="공개 중단하기"
            variant="secondary"
            testID="parent-hide"
            onPress={() => setConfirmHide(true)}
          />
        ) : profile.badges.consent && profile.badges.review ? (
          <AppButton
            label="다시 공개하기"
            loading={setVisibility.isPending}
            testID="parent-publish"
            onPress={() =>
              setVisibility.mutate(true, {
                onSuccess: () => toast.show({ message: '다시 공개했습니다' }),
                onError: (e: Error) => toast.show({ message: e.message }),
              })
            }
          />
        ) : (
          <AppButton
            label="등록 이어서 하기"
            testID="parent-resume"
            onPress={() => router.push('/(parent-setup)/onboarding')}
          />
        )}
      </View>

      <View style={styles.danger}>
        <Text style={styles.dangerTitle}>부모님 동의 철회</Text>
        <Text style={styles.dangerBody}>
          부모님께서 더 이상 원하지 않으시면 동의를 철회할 수 있습니다. 프로필이 즉시
          비공개로 바뀌고, 다시 공개하려면 동의를 새로 받아야 합니다.
        </Text>
        <AppButton
          label="동의 철회하기"
          variant="ghost"
          testID="parent-revoke"
          onPress={() => setConfirmRevoke(true)}
        />
      </View>

      <DestructiveConfirmDialog
        visible={confirmHide}
        title="공개를 중단하시겠습니까?"
        body="추천 목록에서 사라지고 새로운 관심을 받지 않습니다. 진행 중인 대화는 유지되며, 언제든 다시 공개할 수 있습니다."
        confirmLabel="중단하기"
        busy={setVisibility.isPending}
        onCancel={() => setConfirmHide(false)}
        onConfirm={() =>
          setVisibility.mutate(false, {
            onSuccess: () => {
              setConfirmHide(false);
              toast.show({ message: '공개를 중단했습니다' });
            },
          })
        }
        testID="confirm-hide"
      />

      <DestructiveConfirmDialog
        visible={confirmRevoke}
        title="동의를 철회하시겠습니까?"
        body="프로필이 즉시 비공개로 바뀝니다. 다시 공개하시려면 부모님 동의를 처음부터 다시 받으셔야 합니다."
        confirmLabel="철회하기"
        busy={revokeConsent.isPending}
        onCancel={() => setConfirmRevoke(false)}
        onConfirm={() =>
          revokeConsent.mutate(undefined, {
            onSuccess: () => {
              setConfirmRevoke(false);
              toast.show({ message: '동의를 철회하고 비공개로 전환했습니다' });
            },
          })
        }
        testID="confirm-revoke"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  codeBox: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySurface,
    alignItems: 'center',
    gap: 6,
  },
  codeLabel: { ...typography.caption, color: theme.colors.primaryDark },
  code: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 8,
    color: theme.colors.text,
  },
  codeHelp: {
    ...typography.caption,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
  actions: { gap: spacing.xs, marginTop: spacing.lg },
  danger: {
    marginTop: spacing.xxl,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    gap: spacing.xxs,
  },
  dangerTitle: { ...typography.bodyStrong, color: theme.colors.text },
  dangerBody: { ...typography.caption, color: theme.colors.textTertiary },
});
