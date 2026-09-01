import FontAwesome from '@expo/vector-icons/FontAwesome';
import {
  MessageBubble,
  useConnection,
  useEndConnection,
  useMessages,
  useSendMessage,
} from '@features/connections';
import { meetingPhase, useMeeting } from '@features/meetings';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

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

  const { data: connection, isLoading } = useConnection(id);
  const { data: meeting } = useMeeting(id);
  const messagesQuery = useMessages(id);
  const sendMessage = useSendMessage(id ?? '');
  const endConnection = useEndConnection(id ?? '');

  const [draft, setDraft] = useState('');
  const [confirmEnd, setConfirmEnd] = useState(false);

  const messages = useMemo(
    () => messagesQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [messagesQuery.data]
  );

  if (isLoading || !connection) {
    return (
      <Screen>
        <SkeletonList rows={5} />
      </Screen>
    );
  }

  const phase = meetingPhase(meeting);
  const canWrite = !connection.readOnly && connection.status !== 'ended';

  const nextAction = (() => {
    if (connection.status === 'ended') return null;
    if (!connection.myParentIntent) {
      return { label: '부모님 의사 확인하기', href: `/(tabs)/connections/${id}/parent-intent` };
    }
    if (phase === 'none' && connection.status === 'parent_intent') {
      return { label: '만남 일정 제안하기', href: `/(tabs)/connections/${id}/meeting` };
    }
    if (phase === 'accept-required') {
      return { label: '제안된 일정 확인하기', href: `/(tabs)/connections/${id}/meeting` };
    }
    if (phase === 'confirmable') {
      return { label: '만남을 확인해주세요', href: `/(tabs)/connections/${id}/meeting-confirm` };
    }
    if (phase === 'completed' && !meeting?.myFeedback) {
      return { label: '만남 후기 남기기', href: `/(tabs)/connections/${id}/feedback` };
    }
    if (meeting) {
      return { label: '만남 일정 보기', href: `/(tabs)/connections/${id}/meeting` };
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
            {connection.partner.maskedName} 님 ({connection.partner.age}세) 자녀분
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
