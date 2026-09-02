import FontAwesome from '@expo/vector-icons/FontAwesome';
import {
  MessageBubble,
  useConnection,
  useEndConnection,
  useMessages,
  useSendMessage,
} from '@features/connections';
import { ReportReasonPicker, useSafetyMutations } from '@features/safety';
import { bootingKeys } from '@shared/api/booting';
import { theme } from '@shared/config/colors';
import { statusDescription } from '@shared/config/connectionStatus';
import { CHAT_REPORT_REASONS } from '@shared/config/safetyRules';
import { HIT_SIZE, radius, spacing, typography } from '@shared/config/tokens';
import {
  AppButton,
  BottomSheet,
  ConnectionStatusBadge,
  DestructiveConfirmDialog,
  EmptyState,
  SafetyNotice,
  Screen,
  SkeletonList,
  useToast,
} from '@shared/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  BackHandler,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

/** ⋯ 메뉴 한 줄 */
function MenuRow({
  icon,
  label,
  description,
  destructive = false,
  testID,
  onPress,
}: {
  icon: keyof typeof FontAwesome.glyphMap;
  label: string;
  description: string;
  destructive?: boolean;
  testID: string;
  onPress: () => void;
}) {
  const tint = destructive ? theme.colors.error : theme.colors.text;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}
    >
      <FontAwesome name={icon} size={18} color={tint} style={styles.menuRowIcon} />
      <View style={styles.menuRowText}>
        <Text style={[styles.menuRowLabel, { color: tint }]}>{label}</Text>
        <Text style={styles.menuRowDescription}>{description}</Text>
      </View>
    </Pressable>
  );
}

/**
 * 채팅방.
 *
 * 대화하는 주체는 **자녀끼리**다. 부모님은 계정이 없다 — 화면 문구가 계속
 * 그 사실을 상기시켜야 자녀가 부모님인 척 대화하는 상황이 줄어든다.
 */
export default function ChatRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: connection, isLoading } = useConnection(id);
  const messagesQuery = useMessages(id);
  const sendMessage = useSendMessage(id ?? '');
  const endConnection = useEndConnection(id ?? '');
  const { report } = useSafetyMutations();

  const [draft, setDraft] = useState('');
  const [confirmEnd, setConfirmEnd] = useState(false);
  /**
   * ⋯ 메뉴와 신고 사유를 **한 시트 안에서** 단계로 넘긴다.
   *
   * 시트를 닫고 다른 시트를 여는 방식은 Modal 두 개가 같은 프레임에서
   * 교체되면서 두 번째가 안 뜨는 일이 있다. 단계 전환은 그 위험이 없다.
   */
  const [sheet, setSheet] = useState<'menu' | 'report' | null>(null);
  const [reportReason, setReportReason] = useState<string | null>(null);

  const messages = useMemo(
    () => messagesQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [messagesQuery.data]
  );

  /**
   * 하드웨어 뒤로가기 + 나갈 때 목록 갱신.
   *
   * 뒤로가기: 헤더 화살표만 고치면 절반만 고친 것이다 — 실제로 대부분
   * 하드웨어 뒤로가기나 스와이프로 나간다. 상호 하트 시트·알림에서 대화방으로
   * 바로 들어오면 이 스택에 대화방 하나뿐이라 기본 동작이 탭 네비게이터까지
   * 올라가 홈 탭으로 튄다. `navigate` 는 목록이 있으면 거기까지 pop 한다.
   *
   * 목록 갱신: 대화를 열면 서버가 상대 메시지를 읽음 처리하는데, 목록 캐시는
   * 그대로라 뒤로 나오면 안 읽은 개수 뱃지가 그대로 남아 있었다. 화면을 벗어날
   * 때 한 번만 무효화한다 — 5초 폴링마다 무효화하면 대화 중에 목록을 계속
   * 다시 불러오게 된다.
   */
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        router.navigate('/(tabs)/connections');
        return true;
      });
      return () => {
        subscription.remove();
        // ['connections'] 프리픽스라 목록과 탭 배지(connectionsUnread)가 함께 갱신된다.
        // 방을 열면 서버가 읽음·열람을 기록하므로, 나올 때 다시 물어야 목록
        // 하이라이트와 탭 배지가 같이 꺼진다.
        void queryClient.invalidateQueries({ queryKey: ['connections'] });
        void queryClient.invalidateQueries({ queryKey: bootingKeys.connection(id ?? '') });
      };
    }, [router, queryClient, id])
  );

  if (isLoading || !connection) {
    return (
      <Screen>
        <SkeletonList rows={5} />
      </Screen>
    );
  }

  const canWrite = !connection.readOnly && connection.status !== 'ended';

  const closeSheet = () => {
    setSheet(null);
    setReportReason(null);
  };

  /**
   * 대화방에서 안내하는 다음 한 걸음.
   *
   * 동선은 **부모님 의사 확인에서 끝난다** — 양측 부모님이 만나보고 싶다고
   * 하시면 매칭 성공이고, 그 뒤 일정 조율은 앱이 대신할 일이 아니라 자녀분들이
   * 대화로 정할 일이다. 여기서 만남 일정·확인·후기까지 이어 붙이면 이미 매칭된
   * 사람에게 계속 할 일이 남은 것처럼 보인다.
   */
  const nextAction = (() => {
    if (connection.status === 'ended' || connection.status === 'matched') return null;
    if (!connection.myParentIntent) {
      return { label: '부모님 의사 확인하기', href: `/(tabs)/connections/${id}/parent-intent` };
    }
    return null;
  })();

  return (
    <Screen
      padded={false}
      footer={
        canWrite ? (
          <View style={styles.composer}>
            <TextInput
              testID="message-input"
              value={draft}
              onChangeText={setDraft}
              placeholder="메시지를 입력하세요"
              placeholderTextColor={theme.colors.placeholder}
              style={styles.input}
              multiline
              maxLength={2000}
            />
            <Pressable
              testID="message-send"
              accessibilityRole="button"
              accessibilityLabel="메시지 보내기"
              disabled={!draft.trim() || sendMessage.isPending}
              onPress={() =>
                sendMessage.mutate(draft.trim(), {
                  onSuccess: () => setDraft(''),
                  onError: (error: Error) => toast.show({ message: error.message }),
                })
              }
              style={({ pressed }) => [
                styles.send,
                (!draft.trim() || sendMessage.isPending) && styles.sendDisabled,
                pressed && styles.pressed,
              ]}
            >
              <FontAwesome name="send" size={16} color="#FFFFFF" />
            </Pressable>
          </View>
        ) : (
          <Text style={styles.readOnly}>
            {connection.status === 'ended'
              ? '종료된 대화입니다. 메시지를 보낼 수 없습니다.'
              : '대화 기간이 지나 읽기 전용입니다.'}
          </Text>
        )
      }
    >
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.partner}>
            {connection.partner.nickname} 님 ({connection.partner.age}세) 자녀분
          </Text>
          <ConnectionStatusBadge status={connection.status} />
        </View>
        <Pressable
          testID="chat-menu"
          accessibilityRole="button"
          accessibilityLabel="대화방 메뉴"
          onPress={() => setSheet('menu')}
          hitSlop={8}
          style={styles.menu}
        >
          <FontAwesome name="ellipsis-h" size={18} color={theme.colors.textTertiary} />
        </Pressable>
      </View>

      <Text style={styles.statusHint}>{statusDescription(connection.status)}</Text>

      <View style={styles.banner}>
        <SafetyNotice variant="banner" />
      </View>

      {nextAction ? (
        <View style={styles.nextAction}>
          <AppButton
            label={nextAction.label}
            variant="secondary"
            onPress={() => router.push(nextAction.href as never)}
            testID="chat-next-action"
          />
        </View>
      ) : null}

      {messagesQuery.isLoading ? (
        <SkeletonList rows={4} />
      ) : !messages.length ? (
        <EmptyState
          icon="commenting-o"
          title="첫 인사를 건네보세요"
          description="부모님을 대신해 자녀분끼리 나누는 대화입니다."
          testID="chat-empty"
        />
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          inverted
          contentContainerStyle={styles.messages}
          onEndReached={() => {
            if (messagesQuery.hasNextPage && !messagesQuery.isFetchingNextPage) {
              void messagesQuery.fetchNextPage();
            }
          }}
          renderItem={({ item }) => <MessageBubble message={item} />}
        />
      )}

      <BottomSheet
        visible={sheet !== null}
        title={sheet === 'report' ? '무엇이 문제였나요?' : undefined}
        onDismiss={closeSheet}
        testID="chat-menu-sheet"
        footer={
          sheet === 'report' ? (
            <>
              <AppButton
                label="신고하기"
                variant="destructive"
                disabled={!reportReason}
                loading={report.isPending}
                testID="chat-report-submit"
                onPress={() =>
                  reportReason &&
                  report.mutate(
                    { targetProfileId: connection.partner.profileId, reason: reportReason },
                    {
                      onSuccess: () => {
                        closeSheet();
                        // 신고하면 서버가 차단까지 걸어 이 대화는 끝난다.
                        // 종료된 대화방에 그대로 서 있게 두지 않는다.
                        router.navigate('/(tabs)/connections');
                        toast.show({
                          message:
                            '신고가 접수되었습니다. 이 분은 대화와 추천에서 보이지 않습니다.',
                        });
                      },
                      onError: (error: Error) => toast.show({ message: error.message }),
                    }
                  )
                }
              />
              <AppButton label="취소" variant="ghost" onPress={closeSheet} />
            </>
          ) : null
        }
      >
        {sheet === 'report' ? (
          <>
            <Text style={styles.reportTarget}>
              {connection.partner.nickname} 님 자녀분을 신고합니다.
            </Text>
            <ReportReasonPicker
              reasons={CHAT_REPORT_REASONS}
              selected={reportReason}
              onSelect={setReportReason}
            />
            <Text style={styles.reportHint}>
              신고하면 이 대화가 종료되고 이 분은 추천에도 다시 뜨지 않습니다. 고른
              사유는 내 정보 &gt; 신고 내역에 그대로 남습니다.
            </Text>
          </>
        ) : (
          <>
            <MenuRow
              icon="sign-out"
              label="대화방 나가기"
              description="대화가 종료되고 되돌릴 수 없습니다."
              testID="chat-menu-end"
              onPress={() => {
                setSheet(null);
                setConfirmEnd(true);
              }}
            />
            <MenuRow
              icon="flag-o"
              label="대화 상대 신고하기"
              description="운영팀에 알리고, 이 분을 대화와 추천에서 즉시 숨깁니다."
              destructive
              testID="chat-menu-report"
              onPress={() => setSheet('report')}
            />
          </>
        )}
      </BottomSheet>

      <DestructiveConfirmDialog
        visible={confirmEnd}
        title="대화를 나가시겠습니까?"
        body="대화가 종료되고 상대방도 더 이상 메시지를 보낼 수 없습니다. 다시 되돌릴 수 없습니다."
        confirmLabel="나가기"
        busy={endConnection.isPending}
        onCancel={() => setConfirmEnd(false)}
        onConfirm={() =>
          endConnection.mutate(undefined, {
            onSuccess: () => {
              setConfirmEnd(false);
              router.back();
            },
          })
        }
        testID="confirm-end-connection"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  headerText: { flex: 1, gap: 4 },
  partner: { ...typography.subheading, color: theme.colors.text },
  menu: { width: HIT_SIZE, height: HIT_SIZE, alignItems: 'center', justifyContent: 'center' },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.lg,
  },
  menuRowIcon: { width: 22, marginTop: 2, textAlign: 'center' },
  menuRowText: { flex: 1, gap: 2 },
  menuRowLabel: { ...typography.body, fontWeight: '600' },
  menuRowDescription: { ...typography.caption, color: theme.colors.textTertiary },
  reportTarget: { ...typography.caption, color: theme.colors.textSecondary },
  reportHint: { ...typography.micro, color: theme.colors.textMuted },
  statusHint: {
    ...typography.caption,
    color: theme.colors.textTertiary,
    paddingHorizontal: spacing.md,
  },
  banner: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  nextAction: { paddingHorizontal: spacing.md, paddingBottom: spacing.xs },
  messages: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs },
  input: {
    flex: 1,
    minHeight: HIT_SIZE,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
    ...typography.body,
    color: theme.colors.text,
  },
  send: {
    width: HIT_SIZE,
    height: HIT_SIZE,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
  },
  sendDisabled: { opacity: 0.4 },
  readOnly: {
    ...typography.caption,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  pressed: { opacity: 0.85 },
});
