import * as Sentry from '@sentry/react-native';

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';

/** Whether Sentry crash reporting is configured (EXPO_PUBLIC_SENTRY_DSN is set). */
export const isSentryEnabled = !!SENTRY_DSN;

/**
 * Initialize Sentry crash reporting.
 * Opt-in via EXPO_PUBLIC_SENTRY_DSN — no-op when the DSN is not set
 * (same pattern as AdMob/PostHog).
 */
export function initSentry(): void {
  if (!isSentryEnabled) {
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    sendDefaultPii: false,
    tracesSampleRate: __DEV__ ? 1.0 : 0.1,
  });
}

/** Report an error to Sentry when enabled; always logs to the console. */
export function reportError(error: unknown, context?: Record<string, unknown>): void {
  console.error(error);
  if (isSentryEnabled) {
    Sentry.captureException(error, context ? { extra: context } : undefined);
  }
}

export { Sentry };
