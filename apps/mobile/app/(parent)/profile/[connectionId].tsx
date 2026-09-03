import { useParentActions, useParentInbox } from '@features/parent-view';
import type { ParentInterestResult } from '@shared/api/booting.types';
import { theme } from '@shared/config/colors';
import { goalLabel } from '@shared/config/relationshipGoals';
import { radius, spacing, typography } from '@shared/config/tokens';
import {
  AppButton,
  DestructiveConfirmDialog,
  EmptyState,
  Screen,
  SkeletonList,
  useToast,
} from '@shared/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Linking, Modal, StyleSheet, Text, View } from 'react-native';

const MARITAL_LABEL: Record<string, string> = { bereaved: '사별', divorced: '이혼' };

/**
 * 부모님이 보시는 상대 프로필 한 장.
 *
 * 아래에 선택지가 딱 둘이다:
 *   - 대화해보고 싶어요  → 양쪽이 모두 누르면 그때 연락처가 열린다
 *   - 다른 프로필 볼래요 → 되돌릴 수 없으니 한 번 더 확인받는다
 *
 * 한쪽만 눌렀을 때는 상대에게 아무것도 알리지 않는다. 거절이 드러나지 않아야
 * 두 분 다 편하게 정하실 수 있다.
 */
export default function ParentProfileScreen() {
  const { connectionId } = useLocalSearchParams<{ connectionId: string }>();
  const router = useRouter();
  const toast = useToast();
  const { data: items, isLoading } = useParentInbox();
  const { markViewed, express, decline } = useParentActions();

  const [confirmDecline, setConfirmDecline] = useState(false);
  const [celebration, setCelebration] = useState<ParentInterestResult | null>(null);

  const item = items?.find((i) => i.connectionId === connectionId);

  /** 열어보신 순간 초록 강조를 끈다 */
  const markSeen = markViewed.mutate;
  useEffect(() => {
    if (item?.unseen && connectionId) markSeen(connectionId);
  }, [item?.unseen, connectionId, markSeen]);

  if (isLoading) {
    return (
      <Screen>
        <SkeletonList rows={2} />
      </Screen>
    );
  }

  if (!item) {
    return (
      <Screen>
        <EmptyState
          icon="exclamation-circle"
          title="프로필을 볼 수 없습니다"
          description="자녀분이 거두었거나 이미 정리된 프로필입니다."
          cta={{ label: '목록으로', onPress: () => router.replace('/(parent)/home') }}
        />
      </Screen>
    );
  }

  const { profile } = item;
  const goals = (profile.goals ?? []).map(goalLabel).filter(Boolean);

  return (
    <Screen
      scroll
      footer={
        item.matched ? (
          <View style={styles.contactBox} testID="parent-contact">
            <Text style={styles.contactLabel}>연락처가 열렸습니다</Text>
            <Text style={styles.contactName}>{item.partnerName ?? profile.nickname} 님</Text>
            <Text style={styles.contactPhone}>{item.partnerPhone ?? '연락처 준비 중'}</Text>
            {item.partnerPhone ? (
              <AppButton
                label="전화 걸기"
                testID="parent-call"
                onPress={() => void Linking.openURL(`tel:${item.partnerPhone ?? ''}`)}
              />
            ) : null}
          </View>
        ) : item.interested ? (
          <View style={styles.waitBox}>
            <Text style={styles.waitText}>
              마음을 전해드렸습니다.{'\n'}상대 부모님의 답을 기다리고 있습니다.
            </Text>
          </View>
        ) : (
          <View style={styles.actions}>
            <AppButton
              label="대화해보고 싶어요"
              loading={express.isPending}
              testID="parent-interest"
              onPress={() =>
                express.mutate(connectionId, {
                  onSuccess: (result) => {
                    if (result.matched) setCelebration(result);
                    else toast.show({ message: '상대 부모님께 전해드렸습니다' });
                  },
                  onError: (error: Error) => toast.show({ message: error.message }),
                })
              }
            />
            <AppButton
              label="다른 프로필 볼래요"
              variant="secondary"
              testID="parent-decline"
              onPress={() => setConfirmDecline(true)}
            />
          </View>
        )
      }
    >
      {profile.primaryPhotoUrl ? (
        <Image
          source={{ uri: profile.primaryPhotoUrl }}
          style={styles.photo}
          accessibilityLabel={`${profile.nickname} 님의 사진`}
        />
      ) : null}

      <Text style={styles.name}>
        {profile.nickname} 님 · {profile.age}세
      </Text>
      <Text style={styles.region}>
        {profile.region}
        {MARITAL_LABEL[profile.maritalStatus] ? ` · ${MARITAL_LABEL[profile.maritalStatus]}` : ''}
      </Text>

      {goals.length ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>찾으시는 인연</Text>
          <Text style={styles.sectionBody}>{goals.join(', ')}</Text>
        </View>
      ) : null}

      {profile.introExcerpt ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>자녀분이 소개하는 부모님</Text>
          <Text style={styles.sectionBody}>{profile.introExcerpt}</Text>
        </View>
      ) : null}

      <DestructiveConfirmDialog
        visible={confirmDecline}
        title="해당 프로필은 영구삭제됩니다."
        body="진행하시겠습니까? 이 분의 프로필은 다시 보실 수 없습니다."
        confirmLabel="삭제하기"
        busy={decline.isPending}
        onCancel={() => setConfirmDecline(false)}
        onConfirm={() =>
          decline.mutate(connectionId, {
            onSuccess: () => {
              setConfirmDecline(false);
              router.replace('/(parent)/home');
            },
            onError: (error: Error) => toast.show({ message: error.message }),
          })
        }
        testID="parent-decline-confirm"
      />

      {/* 양쪽이 모두 원하신 순간 — 이 앱이 하려던 일이 여기서 끝난다 */}
      <Modal visible={!!celebration} transparent animationType="fade">
        <View style={styles.celebrationBackdrop}>
          <View style={styles.celebration} testID="parent-match-celebration">
            <Text style={styles.celebrationEmoji}>🎉</Text>
            <Text style={styles.celebrationTitle}>
              축하합니다{'\n'}
              {celebration?.partnerNickname ?? profile.nickname} 님과 마음이 통했습니다!
            </Text>
            <Text style={styles.celebrationBody}>
              두 분 모두 대화를 원하셔서 서로의 연락처를 열어드렸습니다.
            </Text>
            <View style={styles.celebrationContact}>
              <Text style={styles.contactName}>{celebration?.partnerName ?? ''} 님</Text>
              <Text style={styles.contactPhone}>{celebration?.partnerPhone ?? ''}</Text>
            </View>
            <AppButton
              label="확인"
              testID="parent-match-confirm"
              onPress={() => setCelebration(null)}
            />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  photo: {
    width: '100%',
    height: 320,
    borderRadius: radius.lg,
    marginTop: spacing.sm,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  name: { ...typography.display, color: theme.colors.text, marginTop: spacing.md },
  region: { ...typography.subheading, color: theme.colors.textSecondary, marginTop: 4 },
  section: { marginTop: spacing.lg, gap: 6 },
  sectionTitle: { ...typography.bodyStrong, color: theme.colors.primaryDark },
  sectionBody: { ...typography.subheading, color: theme.colors.text, lineHeight: 30 },
  actions: { gap: spacing.xs },
  waitBox: {
    backgroundColor: theme.colors.primarySurface,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  waitText: {
    ...typography.subheading,
    color: theme.colors.primaryDark,
    textAlign: 'center',
    lineHeight: 30,
  },
  contactBox: {
    backgroundColor: theme.colors.successBg,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: theme.colors.success,
    padding: spacing.md,
    gap: 6,
  },
  contactLabel: { ...typography.bodyStrong, color: theme.colors.success },
  contactName: { ...typography.subheading, color: theme.colors.text },
  contactPhone: {
    fontSize: 30,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  celebrationBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    backgroundColor: 'rgba(17,24,39,0.55)',
  },
  celebration: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    alignItems: 'center',
  },
  celebrationEmoji: { fontSize: 56 },
  celebrationTitle: {
    ...typography.title,
    color: theme.colors.text,
    textAlign: 'center',
    lineHeight: 36,
  },
  celebrationBody: {
    ...typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
  },
  celebrationContact: {
    alignItems: 'center',
    backgroundColor: theme.colors.successBg,
    borderRadius: radius.md,
    padding: spacing.md,
    marginVertical: spacing.xs,
    alignSelf: 'stretch',
  },
});
