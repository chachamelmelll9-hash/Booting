import { theme } from '@shared/config/colors';
import { radius, spacing, typography } from '@shared/config/tokens';
import { Modal, StyleSheet, Text, View } from 'react-native';

import { AppButton } from './AppButton';

interface Props {
  visible: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
  testID?: string;
}

/**
 * 되돌리기 어려운 동작 전용 확인 다이얼로그.
 *
 * 공개 중단·차단·대화 나가기·탈퇴·동의 철회에만 쓴다. 하트나 넘기기처럼
 * 자주 하는 동작에는 절대 붙이지 않는다 — 확인이 흔해지면 아무도 읽지 않는다.
 * 본문에는 "무슨 일이 일어나는지"를 구체적으로 적는다.
 */
export function DestructiveConfirmDialog({
  visible,
  title,
  body,
  confirmLabel,
  cancelLabel = '취소',
  onConfirm,
  onCancel,
  busy = false,
  testID,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.dialog} testID={testID}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
          <View style={styles.actions}>
            <AppButton label={cancelLabel} onPress={onCancel} variant="secondary" />
            <AppButton
              label={confirmLabel}
              onPress={onConfirm}
              variant="destructive"
              loading={busy}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    backgroundColor: 'rgba(17,24,39,0.45)',
  },
  dialog: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  title: { ...typography.heading, color: theme.colors.text },
  body: { ...typography.body, color: theme.colors.textSecondary },
  actions: { marginTop: spacing.md, gap: spacing.xs },
});
