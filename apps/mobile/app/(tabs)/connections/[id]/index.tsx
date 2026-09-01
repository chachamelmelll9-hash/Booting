import FontAwesome from '@expo/vector-icons/FontAwesome';
import {
  MessageBubble,
  useConnection,
  useEndConnection,
  useMessages,
  useSendMessage,
} from '@features/connections';
import { bootingKeys } from '@shared/api/booting';
import { theme } from '@shared/config/colors';
import { statusDescription } from '@shared/config/connectionStatus';
import { HIT_SIZE, radius, spacing, typography } from '@shared/config/tokens';
import {
  AppButton,
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

  const [draft, setDraft] = useState('');
  const [confirmEnd, setConfirmEnd] = useState(false);

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
          testID="chat-menu-end"
          accessibilityRole="button"
          accessibilityLabel="대화 나가기"
          onPress={() => setConfirmEnd(true)}
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
