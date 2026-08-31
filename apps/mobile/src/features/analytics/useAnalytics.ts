import { usePostHog } from 'posthog-react-native';
import { useCallback } from 'react';

type AnalyticsProperties = Record<string, string | number | boolean | null>;

/**
 * Hook for tracking analytics events.
 *
 * Usage:
 *   const { track, identify, reset } = useAnalytics();
 *
 *   // Track a custom event
 *   track('button_clicked', { button: 'purchase' });
 *
 *   // Identify a user after login
 *   identify(user.id, { email: user.email, name: user.name });
 *
 *   // Reset on logout (clears user identity)
 *   reset();
 */
export function useAnalytics() {
  const posthog = usePostHog();

  const track = useCallback(
    (event: string, properties?: AnalyticsProperties) => {
      void posthog?.capture(event, properties);
    },
    [posthog],
  );

  const identify = useCallback(
    (userId: string, properties?: AnalyticsProperties) => {
      void posthog?.identify(userId, properties);
    },
    [posthog],
  );

  const reset = useCallback(() => {
    void posthog?.reset();
  }, [posthog]);

  const screen = useCallback(
    (name: string, properties?: AnalyticsProperties) => {
      void posthog?.screen(name, properties);
    },
    [posthog],
  );

  return { track, identify, reset, screen };
}
