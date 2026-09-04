import { useParentActions, useParentProfileDetail } from '@features/parent-view';
import type { ParentInterestResult, PublicProfile } from '@shared/api/booting.types';
import { theme } from '@shared/config/colors';
import { formatOccupation } from '@shared/config/profileOptions';
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
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';

const MARITAL_LABEL: Record<string, string> = { bereaved: '사별', divorced: '이혼' };

/** 항목 한 줄 — 왼쪽 이름, 오른쪽 값. 값이 없으면 줄 자체를 그리지 않는다 */
function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

/** 문단 한 덩이 — 소개글처럼 긴 글에 쓴다 */
function Paragraph({ title, body }: { title: string; body?: string | null }) {
  if (!body) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.paragraph}>{body}</Text>
    </View>
  );
}

function livingLabels(profile: PublicProfile): string | null {
  const parts = [
    profile.childrenCount ? `자녀 ${profile.childrenCount}` : '',
    profile.livingWith ? `${profile.livingWith}와 함께` : '',
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}

/**
 * 부모님이 보시는 상대 프로필 한 장.
 *
 * 자녀 화면의 상세와 담는 내용은 같지만 **읽는 방식이 다르다**. 부모님은 이
 * 한 장으로 판단하시고 다시 넘겨보지 않으신다. 그래서:
 *   - 본문 19sp, 행간 32 — 돋보기 없이 읽히는 크기를 먼저 잡았다
 *   - 사진은 가로로 넘겨 전부 보신다 (자녀는 카드 한 장만 본다)
 *   - 항목은 이름·값 두 칸으로만 — 표처럼 훑을 수 있어야 한다
 *
 * 아래 선택지는 딱 둘이다. 한쪽만 눌렀을 때는 상대에게 알리지 않는다.
 */
export default function ParentProfileScreen() {
  const { connectionId } = useLocalSearchParams<{ connectionId: string }>();
  const router = useRouter();
  const toast = useToast();
  const { data: detail, isLoading, error, refetch } = useParentProfileDetail(connectionId);
  const { express, decline } = useParentActions();
  const queryClient = useQueryClient();

  const [confirmDecline, setConfirmDecline] = useState(false);
  const [celebration, setCelebration] = useState<ParentInterestResult | null>(null);

  /**
   * '봤다' 는 서버가 상세를 내주면서 함께 찍는다 — 여기서 따로 부르지 않는다.
   * 예전에는 앱이 `POST .../view` 를 따로 불렀는데, 그 요청만 실패하면
   * (신호가 끊겼거나 바로 뒤로 나가셨거나) 초록 강조가 계속 남았다.
   *
   * 여기서는 목록만 새로 물어보면 된다. 상세를 받은 시점에 서버는 이미 찍었다.
   */
  const loaded = !!detail;
  useEffect(() => {
    if (loaded) void queryClient.invalidateQueries({ queryKey: ['parent', 'inbox'] });
  }, [loaded, queryClient]);

  if (isLoading) {
    return (
      <Screen>
        <SkeletonList rows={2} />
      </Screen>
    );
  }

  if (!detail) {
    /**
     * 못 불러온 이유를 구분한다.
     *
     * 서버가 403/404 를 주면 정말 없어진 것이다 (자녀가 거두었거나 인연이 끝났다).
     * 그 밖의 실패는 통신 문제인데, 그때까지 "자녀분이 거두었다"고 말하면 멀쩡한
     * 프로필을 두고 부모님이 "얘가 취소했구나" 하고 오해하신다. 실제로 서버가
     * 잠깐 내려갔을 때 이 문구가 떴다 (실측).
     *
     * 통신 문제일 때는 되돌아가는 길이 아니라 **다시 시도**를 드려야 한다.
     * 목록으로 보내면 부모님은 같은 카드를 다시 눌러보실 수밖에 없다.
     */
    const status = (error as { status?: number } | null)?.status;
    const gone = status === 403 || status === 404;
    return (
      <Screen>
        <EmptyState
          icon="exclamation-circle"
          title={gone ? '프로필을 볼 수 없습니다' : '잠시 불러오지 못했습니다'}
          description={
            gone
              ? '자녀분이 거두었거나 이미 정리된 프로필입니다.'
              : '인터넷 연결을 확인하고 다시 눌러 주세요.'
          }
          cta={
            gone
              ? { label: '목록으로', onPress: () => router.replace('/(parent)/home') }
              : { label: '다시 시도', onPress: () => void refetch() }
          }
        />
      </Screen>
    );
  }

  const { profile } = detail;
  const goals = (profile.goals ?? []).map(goalLabel).filter(Boolean);
  const photos = profile.photoUrls?.length
    ? profile.photoUrls
    : profile.primaryPhotoUrl
      ? [profile.primaryPhotoUrl]
      : [];

  return (
    <Screen
      scroll
      footer={
        detail.matched ? (
          <View style={styles.contactBox} testID="parent-contact">
            {/* 상대가 나중에 눌러 성사된 쪽은 축하 팝업을 못 봤다.
                여기서 같은 문장을 한 번 더 말해 준다 */}
            <Text style={styles.contactLabel}>
              {profile.nickname} 님과 마음이 통했습니다
            </Text>
            <Text style={styles.contactName}>{detail.partnerName ?? profile.nickname} 님</Text>
            <Text style={styles.contactPhone} selectable>
              {detail.partnerPhone ?? '연락처 준비 중'}
            </Text>
          </View>
        ) : detail.interested ? (
          <View style={styles.waitBox}>
            {/* 누구를 기다리는지 이름으로 말한다 — 여러 분을 받아보시는 중이면
                '상대 부모님'만으로는 어느 분인지 알 수 없다 */}
            <Text style={styles.waitText}>
              마음을 전해드렸습니다.{'\n'}
              {profile.nickname} 님의 답을 기다리고 있습니다.
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
      {/* 사진은 전부 보신다 — 한 장만 보고 정하실 일이 아니다 */}
      {photos.length ? (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.photoStrip}
        >
          {photos.map((url, index) => (
            <Image
              key={url}
              source={{ uri: url }}
              style={styles.photo}
              accessibilityLabel={`${profile.nickname} 님의 사진 ${index + 1}`}
            />
          ))}
        </ScrollView>
      ) : null}
      {photos.length > 1 ? (
        <Text style={styles.photoHint}>사진 {photos.length}장 · 옆으로 넘겨보세요</Text>
      ) : null}

      <Text style={styles.name}>
        {profile.nickname} 님 · {profile.age}세
      </Text>
      <Text style={styles.region}>
        {profile.region}
        {MARITAL_LABEL[profile.maritalStatus] ? ` · ${MARITAL_LABEL[profile.maritalStatus]}` : ''}
      </Text>

      {goals.length ? (
        <View style={styles.goalRow}>
          {goals.map((goal) => (
            <View key={goal} style={styles.goalChip}>
              <Text style={styles.goalText}>{goal}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <Paragraph title="자녀분이 소개하는 부모님" body={profile.introByChild || profile.introExcerpt} />
      <Paragraph title="이런 분을 만나고 싶어요" body={profile.desiredPartner} />
      <Paragraph title="부모님이 전하는 말" body={profile.parentMessage} />
      <Paragraph title="좌우명" body={profile.motto} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>생활</Text>
        <Row label="키" value={profile.heightCm ? `${profile.heightCm}cm` : null} />
        <Row label="종교" value={profile.religion} />
        <Row
          label="직업"
          value={formatOccupation(
            profile.occupation ?? profile.retiredOccupation,
            profile.economicallyActive
          )}
        />
        <Row label="가족" value={livingLabels(profile)} />
        <Row label="음주" value={profile.drinking} />
        <Row label="흡연" value={profile.smoking} />
        <Row label="취미" value={profile.hobbies?.length ? profile.hobbies.join(', ') : null} />
      </View>

      <View style={styles.badgeBox}>
        <Text style={styles.badgeTitle}>부팅이 확인한 것</Text>
        <Text style={styles.badgeText}>
          자녀분 본인 확인을 마쳤고, 이분의 부모님께서 직접 동의하셨습니다.
        </Text>
      </View>

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
              <Text style={styles.contactPhone} selectable>
                {celebration?.partnerPhone ?? ''}
              </Text>
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

const PHOTO_WIDTH = 300;

const styles = StyleSheet.create({
  photoStrip: { marginTop: spacing.sm },
  photo: {
    width: PHOTO_WIDTH,
    height: 360,
    borderRadius: radius.lg,
    marginRight: spacing.xs,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  photoHint: {
    ...typography.caption,
    color: theme.colors.textTertiary,
    marginTop: spacing.xxs,
  },
  name: { ...typography.display, color: theme.colors.text, marginTop: spacing.md },
  region: { ...typography.subheading, color: theme.colors.textSecondary, marginTop: 4 },
  goalRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xxs, marginTop: spacing.sm },
  goalChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: theme.colors.primarySurface,
  },
  goalText: { ...typography.body, color: theme.colors.primaryDark, fontWeight: '600' },
  section: { marginTop: spacing.lg, gap: spacing.xs },
  sectionTitle: { ...typography.bodyStrong, color: theme.colors.primaryDark },
  // 부모님이 돋보기 없이 읽는 크기 — 자녀 화면보다 한 단계 크다
  paragraph: { fontSize: 19, lineHeight: 32, color: theme.colors.text },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  rowLabel: { width: 84, fontSize: 18, color: theme.colors.textTertiary },
  rowValue: { flex: 1, fontSize: 19, lineHeight: 28, color: theme.colors.text },
  badgeBox: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: theme.colors.primarySurface,
    gap: 4,
  },
  badgeTitle: { ...typography.bodyStrong, color: theme.colors.primaryDark },
  badgeText: { fontSize: 17, lineHeight: 28, color: theme.colors.textSecondary },
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
    borderColor: theme.colors.primaryDark,
    padding: spacing.md,
    gap: 6,
    alignItems: 'center',
  },
  contactLabel: { ...typography.subheading, color: theme.colors.primaryDark, fontWeight: '700' },
  contactName: { ...typography.subheading, color: theme.colors.text },
  contactPhone: {
    fontSize: 32,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: 1,
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
