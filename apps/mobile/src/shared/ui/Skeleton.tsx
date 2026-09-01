import { theme } from '@shared/config/colors';
import { radius, spacing } from '@shared/config/tokens';
import { useEffect } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  shape?: 'line' | 'block' | 'circle';
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 16, shape = 'line', style }: SkeletonProps) {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.9, { duration: 800 }), -1, true);
  }, [opacity]);

  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        styles.base,
        {
          width,
          height,
          borderRadius: shape === 'circle' ? height / 2 : shape === 'block' ? radius.lg : radius.sm,
        },
        animated,
        style,
      ]}
    />
  );
}

/** 리스트 로딩 자리표시자. 스피너 대신 실제 레이아웃을 흉내내 화면이 튀지 않게 한다 */
export function SkeletonList({ rows = 4, shape = 'row' }: { rows?: number; shape?: 'row' | 'card' }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: rows }).map((_, i) =>
        shape === 'card' ? (
          <View key={i} style={styles.card}>
            <Skeleton height={180} shape="block" />
            <Skeleton width="60%" height={20} style={styles.gap} />
            <Skeleton width="40%" height={14} style={styles.gapSmall} />
          </View>
        ) : (
          <View key={i} style={styles.row}>
            <Skeleton width={56} height={56} shape="circle" />
            <View style={styles.rowText}>
              <Skeleton width="55%" height={18} />
              <Skeleton width="80%" height={14} style={styles.gapSmall} />
            </View>
          </View>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { backgroundColor: theme.colors.surfaceSecondary },
  list: { paddingVertical: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
  rowText: { flex: 1, marginLeft: spacing.sm },
  card: { marginBottom: spacing.lg },
  gap: { marginTop: spacing.sm },
  gapSmall: { marginTop: spacing.xxs },
});
