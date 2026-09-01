import { theme } from '@shared/config/colors';
import { radius, spacing, typography, zIndex } from '@shared/config/tokens';
import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ToastOptions {
  message: string;
  /** 실행 취소 가능한 동작에만. 없으면 단순 알림 */
  undo?: { label?: string; onPress: () => void };
  durationMs?: number;
}

interface ToastContextValue {
  show: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue>({ show: () => undefined });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastOptions | null>(null);
  const insets = useSafeAreaInsets();

  const show = useCallback((options: ToastOptions) => {
    setToast(options);
    const timeout = setTimeout(() => setToast(null), options.durationMs ?? 3200);
    return () => clearTimeout(timeout);
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <View
          style={[styles.container, { bottom: insets.bottom + spacing.xxl }]}
          accessibilityLiveRegion="polite"
          testID="toast"
        >
          <Text style={styles.message}>{toast.message}</Text>
          {toast.undo ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                toast.undo?.onPress();
                setToast(null);
              }}
              hitSlop={8}
            >
              <Text style={styles.undo}>{toast.undo.label ?? '실행 취소'}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    backgroundColor: theme.colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    zIndex: zIndex.toast,
  },
  message: { ...typography.caption, color: '#FFFFFF', flex: 1 },
  undo: { ...typography.bodyStrong, color: theme.colors.primaryLight },
});
