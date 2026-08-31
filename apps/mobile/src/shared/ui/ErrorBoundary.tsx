import { useTranslation } from '@product-engineer-community-service/i18n';
import { AuthColors } from '@shared/config/colors';
import { reportError } from '@shared/lib/sentry';
import type { ErrorBoundaryProps } from 'expo-router';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

/**
 * User-friendly fallback UI for uncaught render errors.
 * Exported as `ErrorBoundary` from route layouts so expo-router uses it,
 * and reports the error to Sentry when configured.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const { t } = useTranslation('common');

  useEffect(() => {
    reportError(error, { boundary: 'root' });
  }, [error]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {t('error_boundary_title', '문제가 발생했습니다')}
      </Text>
      <Text style={styles.message}>
        {t(
          'error_boundary_message',
          '예상치 못한 오류가 발생했습니다. 다시 시도해주세요.'
        )}
      </Text>
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        onPress={() => retry()}
      >
        <Text style={styles.buttonText}>{t('retry', '다시 시도')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: AuthColors.background,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: AuthColors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: AuthColors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  button: {
    backgroundColor: AuthColors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  buttonPressed: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
