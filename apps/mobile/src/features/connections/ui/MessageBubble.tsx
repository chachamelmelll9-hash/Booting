import type { Message } from '@shared/api/booting.types';
import { theme } from '@shared/config/colors';
import { radius, spacing, typography } from '@shared/config/tokens';
import { StyleSheet, Text, View } from 'react-native';

export function MessageBubble({ message }: { message: Message }) {
  const mine = message.mine;

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
