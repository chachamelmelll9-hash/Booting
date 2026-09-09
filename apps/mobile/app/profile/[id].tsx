import { useHeartActions, usePublicProfile } from '@features/discovery';
import { theme } from '@shared/config/colors';
import { formatOccupation } from '@shared/config/profileOptions';
import { dayPillarLabel } from '@shared/config/saju';
import { radius, spacing, typography } from '@shared/config/tokens';
import {
  AppButton,
  EmptyState,
  HeartMessageSheet,
  RelationshipGoalChips,
  Screen,
  SkeletonList,
  useToast,
  VerificationBadgeRow,
} from '@shared/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';

const MARITAL_LABEL: Record<string, string> = { bereaved: '사별', divorced: '이혼' };

/**
 * 상대 부모님 상세.
 *
 * 여기 있는 값은 전부 서버가 공개용으로 가공한 것이다 — 실명·생년월일·연락처·
 * 주소는 응답 자체에 없다. 자녀 수·동거 가족은 이 화면에서만 보이며 필터로는 쓰이지 않는다.
 */
export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();

  const { data: profile, isLoading, isError, error, refetch } = usePublicProfile(id);
  const { sendHeart } = useHeartActions();
  const [composeOpen, setComposeOpen] = useState(false);

  const sendHeartTo = (message?: string) => {
    if (!profile) return;
    sendHeart.mutate(
      { targetProfileId: profile.profileId, message },
      {
        onSuccess: (result) => {
          setComposeOpen(false);
          if (result.mutual && result.connectionId) {
            router.replace(`/matched/${result.connectionId}`);
          } else {
            toast.show({
              message: message ? '인사말과 함께 관심을 보냈습니다' : '관심을 보냈습니다',
            });
            router.back();
          }
        },
        onError: (error: Error) => toast.show({ message: error.message }),
      }
    );
  };

  if (isLoading) {
    return (
      <Screen>
        <SkeletonList rows={1} shape="card" />
      </Screen>
    );
  }

  if (isError || !profile) {
    /**
     * 못 불러온 이유를 구분한다.
     *
     * 서버가 403/404 를 주면 정말 볼 수 없는 상대다(공개 중단·차단). 그 밖의
     * 실패는 네트워크나 서버 문제인데, 그때까지 "공개가 중단되었습니다"라고
     * 말하면 멀쩡한 상대를 잘못 설명하고 사용자는 다시 시도할 생각을 못 한다.
     */
    const status = (error as { status?: number } | null)?.status;
    const gone = status === 403 || status === 404;
    return (
      <Screen>
        <EmptyState
          icon="exclamation-circle"
          title={gone ? '프로필을 볼 수 없습니다' : '프로필을 불러오지 못했습니다'}
          description={
            gone
              ? '공개가 중단되었거나 이용할 수 없는 상대입니다.'
              : '네트워크 상태를 확인하고 다시 시도해주세요.'
          }
          cta={{ label: '다시 시도', onPress: () => void refetch() }}
        />
      </Screen>
    );
  }

  return (
    <Screen
      scroll
      footer={
        <View style={styles.footer}>
          {/*
            넘기기가 없다.

            추천은 하루 여섯 장이고 그 카드들은 24시간 뒤 알아서 사라진다.
            어차피 내일이면 없어질 카드를 되돌릴 수 없는 '넘기기'로 지우게
            하면, 사용자는 이득 없이 위험만 진다 (PRD: 넘기기는 취소 불가).
            받은 관심 화면의 넘기기는 상대가 기다리고 있어 성격이 다르므로 그대로 둔다.
          */}
          <AppButton
            label={profile.heartSent ? '관심을 보냈습니다' : '관심 보내기'}
            disabled={profile.heartSent}
            loading={sendHeart.isPending}
            testID="profile-heart"
            onPress={() => setComposeOpen(true)}
          />
          <HeartMessageSheet
            visible={composeOpen}
            toName={profile.nickname}
            busy={sendHeart.isPending}
            onSend={(message) => sendHeartTo(message)}
            onDismiss={() => setComposeOpen(false)}
          />
          <AppButton
            label="신고하기"
            variant="ghost"
            testID="profile-report"
            onPress={() => router.push(`/report/${profile.profileId}`)}
          />
        </View>
      }
    >
      {profile.photoUrls.length ? (
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.gallery}>
          {profile.photoUrls.map((url) => (
            <Image key={url} source={{ uri: url }} style={styles.photo} />
          ))}
        </ScrollView>
      ) : null}

      <Text style={styles.name}>
        {profile.nickname} · {profile.age}세
      </Text>
      <Text style={styles.meta}>
        {profile.region}
        {profile.distanceKm !== null ? ` · ${profile.distanceKm}km` : ''}
        {` · ${MARITAL_LABEL[profile.maritalStatus] ?? ''}`}
      </Text>

      {/*
        일주와 궁합 점수, 딱 두 값만 맨 위에 둔다.
        풀이·근거·기둥 나열은 두지 않는다 — 이 화면에서 정하는 건 "관심을
        보낼까" 하나이고, 설명이 길어질수록 그 판단이 아니라 해석을 읽게 된다.
      */}
      {profile.dayPillar || profile.compatibility ? (
        <View style={styles.sajuRow}>
          {profile.dayPillar ? (
            <Text style={styles.dayPillar}>{dayPillarLabel(profile.dayPillar)}</Text>
          ) : null}
          {profile.dayPillar && profile.compatibility ? (
            <Text style={styles.sajuSeparator}>·</Text>
          ) : null}
          {profile.compatibility ? (
            <Text style={styles.score} testID="saju-compatibility">
              궁합 {profile.compatibility.score}점
            </Text>
          ) : null}
        </View>
      ) : null}

      <View style={styles.badges}>
        <VerificationBadgeRow badges={profile.badges} />
      </View>

      {profile.goals.length ? (
        <Section title="관계 목적">
          <RelationshipGoalChips goals={profile.goals} />
        </Section>
      ) : null}

      {profile.introByChild ? (
        <Section title="자녀분이 소개하는 부모님">
          <Text style={styles.paragraph}>{profile.introByChild}</Text>
        </Section>
      ) : null}

      {profile.desiredPartner ? (
        <Section title="이런 분을 만나고 싶어요">
          <Text style={styles.paragraph}>{profile.desiredPartner}</Text>
        </Section>
      ) : null}

      {profile.parentMessage ? (
        <Section title="부모님이 전하는 말">
          <Text style={styles.paragraph}>{profile.parentMessage}</Text>
        </Section>
      ) : null}

      <Section title="생활">
        <Detail label="키" value={profile.heightCm ? `${profile.heightCm}cm` : null} />
        <Detail label="종교" value={profile.religion} />
        {/* 경제 활동은 별도 줄로 두지 않는다 — 직업 문구에 (은퇴)로 합쳐 넣는다 */}
        <Detail
          label="직업"
          value={formatOccupation(
            profile.occupation ?? profile.retiredOccupation,
            profile.economicallyActive
          )}
        />
        <Detail label="음주" value={profile.drinking} />
        <Detail label="흡연" value={profile.smoking} />
        <Detail label="취미" value={profile.hobbies.length ? profile.hobbies.join(', ') : null} />
      </Section>

      {/* 자녀 수·동거 가족은 여기서만 보인다 — 필터 항목이 아니다 (PRD) */}
      <Section title="가족">
        <Detail label="자녀 수" value={profile.childrenCount} />
        <Detail label="동거 가족" value={profile.livingWith} />
      </Section>

      {/*
        원본 생년월일·출생시각은 이 화면에 없다.
        사주는 맨 위 `을사일주 · 궁합 74점` 한 줄이 전부이고, 정확한 생년월일은
        PRD 7 이 비공개로 못박은 값이다 — 사주 때문에 그 원칙이 뚫리면 안 된다.
      */}
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  gallery: { marginTop: spacing.sm, marginHorizontal: -spacing.md },
  photo: { width: 320, height: 320, borderRadius: radius.lg, marginRight: spacing.xs, marginLeft: spacing.md },
  name: { ...typography.title, color: theme.colors.text, marginTop: spacing.md },
  meta: { ...typography.body, color: theme.colors.textTertiary, marginTop: 2 },
  sajuRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  // 일주와 점수는 한 덩어리로 읽혀야 해서 같은 민트를 쓴다
  dayPillar: { ...typography.subheading, color: theme.colors.primaryDark },
  sajuSeparator: { ...typography.subheading, color: theme.colors.primary },
  score: { ...typography.subheading, color: theme.colors.primaryDark },
  badges: { marginTop: spacing.sm },
  section: { marginTop: spacing.lg, gap: spacing.xs },
  sectionTitle: { ...typography.subheading, color: theme.colors.text },
  paragraph: { ...typography.body, color: theme.colors.textSecondary },
  detailRow: { flexDirection: 'row', gap: spacing.sm },
  detailLabel: { ...typography.body, color: theme.colors.textTertiary, width: 92 },
  detailValue: { ...typography.body, color: theme.colors.textSecondary, flex: 1 },
  footer: { gap: spacing.xxs },
});
