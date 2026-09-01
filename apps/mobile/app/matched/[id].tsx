import { useConnection } from '@features/connections';
import { theme } from '@shared/config/colors';
import { CONNECTION_STATUS } from '@shared/config/connectionStatus';
import { radius, spacing, typography } from '@shared/config/tokens';
import {
  AppButton,
  ParentProfileCard,
  Screen,
  SkeletonList,
} from '@shared/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

/**
 * 상호 하트 시트.
 *
 * **이 화면은 '매칭 성공'이 아니다.** 서로 관심을 보낸 것뿐이고, 문구는
 * `CONNECTION_STATUS.mutual_heart` 에서 그대로 가져온다 — 축하 문구를 여기에
 * 직접 쓰면 사용자는 만남이 성사된 줄 안다.
 * test-scenarios S14.2 가 이 화면 덤프에서 '매칭 성공' 부재를 검증한다.
 */
export default function MutualHeartScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: connection, isLoading } = useConnection(id);

  if (isLoading || !connection) {
    return (
      <Screen>
        <SkeletonList rows={1} shape="card" />
      </Screen>
    );
  }

  const presentation = CONNECTION_STATUS.mutual_heart;

  return (
    <Screen
      footer={
        <View style={styles.footer}>
          <AppButton
            label="대화 시작하기"
            testID="mutual-start-chat"
            // withAnchor: 대화방 아래에 인연 목록을 깔아 둔다. 없으면 대화방이
            // 스택의 유일한 화면이 되어 뒤로가기가 탭 네비게이터까지 올라가
            // 홈 탭으로 튄다 — 사용자가 기대하는 곳은 대화 목록이다.
            onPress={() =>
              router.replace(`/(tabs)/connections/${connection.id}`, { withAnchor: true })
            }
          />
          <AppButton label="나중에 하기" variant="ghost" onPress={() => router.back()} />
        </View>
      }
    >
      <View style={styles.hero}>
        {/* 문구는 config 단일 소스에서만 온다 */}
        <Text style={styles.title} testID="mutual-title">
          {presentation.label}
        </Text>
        <Text style={styles.body}>{presentation.description}</Text>
      </View>

      <ParentProfileCard profile={connection.partner} variant="preview" />

      <Text style={styles.note}>
        아직 부모님께는 알려드리기 전입니다. 자녀분끼리 먼저 이야기를 나눠보세요.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.xs,
  },
  title: { ...typography.display, color: theme.colors.primaryDark },
  body: { ...typography.body, color: theme.colors.textSecondary, textAlign: 'center' },
  note: {
    ...typography.caption,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
    backgroundColor: theme.colors.surfaceSecondary,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  footer: { gap: spacing.xxs },
});
