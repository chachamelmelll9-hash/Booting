import { theme } from '@shared/config/colors';
import { radius, spacing, typography, zIndex } from '@shared/config/tokens';
import { type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface BottomSheetProps {
  visible: boolean;
  title?: string;
  onDismiss: () => void;
  /** true 면 배경 탭으로 닫히지 않는다 (작성 중 내용 유실 방지) */
  dismissGuard?: boolean;
  children: ReactNode;
  footer?: ReactNode;
  testID?: string;
}

export function BottomSheet({
  visible,
  title,
  onDismiss,
  dismissGuard = false,
  children,
  footer,
  testID,
}: BottomSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <Pressable
          style={styles.backdropTouchable}
          accessibilityLabel="닫기"
          onPress={dismissGuard ? undefined : onDismiss}
        />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.md) }]} testID={testID}>
          <View style={styles.handle} />
          {title ? <Text style={styles.title}>{title}</Text> : null}
          <View style={styles.body}>{children}</View>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(17,24,39,0.45)' },
  backdropTouchable: { ...StyleSheet.absoluteFillObject },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    zIndex: zIndex.modal,
    maxHeight: '88%',
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: theme.colors.border,
    marginBottom: spacing.sm,
  },
  title: { ...typography.heading, color: theme.colors.text, marginBottom: spacing.sm },
  body: { gap: spacing.sm },
  footer: { marginTop: spacing.md, gap: spacing.xs },
});
