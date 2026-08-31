import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { usePathname } from 'expo-router';
import * as Updates from 'expo-updates';
import { PostHogProvider, usePostHog } from 'posthog-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

import { setPostHogClient } from './analyticsService';
import {
  initializeAttributionTracking,
  subscribeToAttributionLinks,
} from './attributionService';

const POSTHOG_API_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '';
const POSTHOG_HOST =
  process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

const POSTHOG_PROVIDER_OPTIONS = {
  host: POSTHOG_HOST,
  captureAppLifecycleEvents: true,
};

const POSTHOG_AUTOCAPTURE = {
  captureTouches: true,
  captureScreens: false,
};

interface AnalyticsProviderProps {
  children: React.ReactNode;
}

const getAnalyticsRuntimeProperties = () => ({
  app_version:
    Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? null,
  app_build: Application.nativeBuildVersion ?? null,
  expo_channel: Updates.channel ?? null,
  expo_runtime_version: Updates.runtimeVersion ?? null,
  expo_update_id: Updates.updateId ?? null,
  expo_is_embedded_launch: Updates.isEmbeddedLaunch,
  platform: Platform.OS,
});

function AnalyticsSetup() {
  const pathname = usePathname();
  const posthog = usePostHog();
  const runtimeProperties = useMemo(() => getAnalyticsRuntimeProperties(), []);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let unsubscribeAttributionLinks: (() => void) | null = null;
    let isMounted = true;

    if (!posthog) {
      return () => {
        isMounted = false;
      };
    }

    setIsReady(false);

    void (async () => {
      await posthog.ready();
      if (!isMounted) {
        return;
      }

      setPostHogClient(posthog);
      void posthog.register(runtimeProperties);

      try {
        await initializeAttributionTracking();
        if (isMounted) {
          unsubscribeAttributionLinks = subscribeToAttributionLinks();
        }
      } catch (error) {
        console.error('Attribution tracking initialization failed:', error);
      }

      if (isMounted) {
        setIsReady(true);
      }
    })();

    return () => {
      isMounted = false;
      unsubscribeAttributionLinks?.();
    };
  }, [posthog, runtimeProperties]);

  useEffect(() => {
    if (posthog && pathname && isReady) {
      void posthog.screen(pathname, runtimeProperties);
      void posthog.flush().catch((error) => {
        console.error('PostHog screen flush failed:', error);
      });
    }
  }, [posthog, pathname, runtimeProperties, isReady]);

  return null;
}

/**
 * Analytics provider that wraps the app with PostHog.
 * Automatically tracks screen views via expo-router pathname.
 *
 * Set EXPO_PUBLIC_POSTHOG_KEY in your .env to enable.
 * If the key is not set, children are rendered without analytics.
 */
export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  if (!POSTHOG_API_KEY) {
    return <>{children}</>;
  }

  return (
    <PostHogProvider
      apiKey={POSTHOG_API_KEY}
      options={POSTHOG_PROVIDER_OPTIONS}
      autocapture={POSTHOG_AUTOCAPTURE}
    >
      <AnalyticsSetup />
      {children}
    </PostHogProvider>
  );
}
