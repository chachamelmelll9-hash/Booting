import { theme } from '@shared/config/colors';
import { spacing } from '@shared/config/tokens';
import { type ReactNode } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  /** 하단에 고정될 CTA 영역 */
  footer?: ReactNode;
  padded?: boolean;
  style?: ViewStyle;
  contentTestID?: string;
}

/**
 * 화면 공통 컨테이너.
 *
 * 하단 CTA 가 있는 화면이 많아서(등록 플로우 5개, 만남 3개) 세이프 에어리어와
 * 스크롤/고정 푸터 조합을 매번 다시 짜지 않도록 여기로 모았다.
 */
export function Screen({
  children,
  scroll = false,
  footer,
  padded = true,
  style,
  contentTestID,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const body = (
    <View
      testID={contentTestID}
      style={[padded && styles.padded, !scroll && styles.flex, style]}
    >
      {children}
    </View>
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {body}
        </ScrollView>
      ) : (
        body
      )}
      {footer ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          {footer}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  flex: { flex: 1 },
  padded: { paddingHorizontal: spacing.md },
  scrollContent: { paddingBottom: spacing.xl },
  footer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    backgroundColor: theme.colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
});
