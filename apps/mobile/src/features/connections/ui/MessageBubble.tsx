import type { Message } from '@shared/api/booting.types';
import { theme } from '@shared/config/colors';
import { radius, spacing, typography } from '@shared/config/tokens';
import { StyleSheet, Text, View } from 'react-native';

export function MessageBubble({ message }: { message: Message }) {
  const mine = message.mine;

  /**
   * 앱이 남긴 기록은 말풍선이 아니다.
   *
   * "…님의 자녀가 프로필을 공유했습니다" 를 보낸 사람 말풍선으로 찍으면 자녀가
   * 직접 한 말처럼 읽히고, 상대는 답을 해야 하는지 헷갈린다. 가운데 회색 한 줄로
   * 두면 대화 흐름을 끊지 않으면서 사실만 남는다.
   */
  if (message.kind === 'system') {
    return (
      <View style={styles.systemRow}>
        <Text style={styles.systemText}>{message.body}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.row, mine ? styles.rowMine : styles.rowTheirs]}>
      <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
        <Text style={[styles.text, mine && styles.textMine]}>{message.body}</Text>
      </View>
      <Text style={styles.time}>{formatTime(message.sentAt)}</Text>
    </View>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const meridiem = hours < 12 ? '오전' : '오후';
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${meridiem} ${displayHour}:${minutes}`;
}

const styles = StyleSheet.create({
  systemRow: {
    alignSelf: 'center',
    maxWidth: '90%',
    marginVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.pill,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  systemText: { ...typography.caption, color: theme.colors.textTertiary, textAlign: 'center' },
  row: { marginBottom: spacing.xs, maxWidth: '82%' },
  rowMine: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  rowTheirs: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.lg,
  },
  bubbleMine: { backgroundColor: theme.colors.primary, borderBottomRightRadius: radius.sm },
  bubbleTheirs: {
    backgroundColor: theme.colors.surface,
    borderBottomLeftRadius: radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  text: { ...typography.body, color: theme.colors.text },
  textMine: { color: '#FFFFFF' },
  time: { ...typography.micro, color: theme.colors.textMuted, marginTop: 2 },
});
