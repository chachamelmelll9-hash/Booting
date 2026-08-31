import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, useColorScheme,View } from 'react-native';

export function AdPlaceholder() {
  const isDark = useColorScheme() === 'dark';
  const shimmer = useRef(new Animated.Value(0)).current;

  const colors = {
    surface: isDark ? '#1E293B' : '#FFFFFF',
    skeleton: isDark ? '#334155' : '#E2E8F0',
  };

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [shimmer]);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.6] });

  return (
    <View style={styles.cardWrapper}>
      <View style={[styles.cardContainer, { backgroundColor: colors.surface }]}>
        <Animated.View
          style={[styles.imagePlaceholder, { backgroundColor: colors.skeleton, opacity }]}
        />
        <View style={styles.contentContainer}>
          <Animated.View
            style={[styles.chipPlaceholder, { backgroundColor: colors.skeleton, opacity }]}
          />
          <Animated.View
            style={[styles.titlePlaceholder, { backgroundColor: colors.skeleton, opacity }]}
          />
          <Animated.View
            style={[styles.subtitlePlaceholder, { backgroundColor: colors.skeleton, opacity }]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    marginVertical: 6,
  },
  cardContainer: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 12,
    height: 124,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  imagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 12,
    marginRight: 14,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 4,
  },
  chipPlaceholder: {
    height: 22,
    width: 48,
    borderRadius: 12,
    marginBottom: 8,
  },
  titlePlaceholder: {
    height: 20,
    borderRadius: 4,
    width: '80%',
    marginBottom: 6,
  },
  subtitlePlaceholder: {
    height: 16,
    borderRadius: 4,
    width: '60%',
  },
});
