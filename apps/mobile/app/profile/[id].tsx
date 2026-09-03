import { useHeartActions, usePublicProfile } from '@features/discovery';
import { theme } from '@shared/config/colors';
import { formatOccupation } from '@shared/config/profileOptions';
import { radius, spacing, typography } from '@shared/config/tokens';
import {
  AppButton,
  EmptyState,
  HeartActionBar,
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
  const { sendHeart, pass } = useHeartActions();
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
          <HeartActionBar
            heartDisabled={profile.heartSent}
            busy={sendHeart.isPending || pass.isPending}
            onHeart={() => setComposeOpen(true)}
            onPass={() =>
              pass.mutate(profile.profileId, { onSuccess: () => router.back() })
            }
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

      {profile.saju ? (
        <Section title="사주 정보">
          <Detail label="생년월일" value={profile.saju.birthDate} />
          <Detail
            label="태어난 시간"
            value={profile.saju.birthTimeUnknown ? '모름' : profile.saju.birthTime}
          />
        </Section>
      ) : null}
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
  badges: { marginTop: spacing.sm },
  section: { marginTop: spacing.lg, gap: spacing.xs },
  sectionTitle: { ...typography.subheading, color: theme.colors.text },
  paragraph: { ...typography.body, color: theme.colors.textSecondary },
  detailRow: { flexDirection: 'row', gap: spacing.sm },
  detailLabel: { ...typography.body, color: theme.colors.textTertiary, width: 92 },
  detailValue: { ...typography.body, color: theme.colors.textSecondary, flex: 1 },
  footer: { gap: spacing.xxs },
});
