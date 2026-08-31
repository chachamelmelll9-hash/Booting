import { useAnalytics } from '@features/analytics';
import { useEffect, useRef, useState } from 'react';
import { NativeAd, NativeAdEventType } from 'react-native-google-mobile-ads';

import { getAdUnitId } from '../config/adConfig';

interface UseNativeAdOptions {
  /** Screen name for analytics (e.g. "home") */
  screenName?: string;
  /** Placement identifier for analytics (e.g. "list_top") */
  placement?: string;
}

export function useNativeAd(options: UseNativeAdOptions = {}) {
  const { screenName = 'unknown', placement = 'default' } = options;
  const [nativeAd, setNativeAd] = useState<NativeAd | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { track } = useAnalytics();
  const listenersCleanupRef = useRef<(() => void) | null>(null);

  const context = { ad_format: 'native', screen_name: screenName, placement } as const;

  const loadAd = async () => {
    try {
      setIsLoading(true);

      const adUnitId = getAdUnitId('nativeAd');
      track('ad_request', context);
      const ad = await NativeAd.createForAdRequest(adUnitId);
      listenersCleanupRef.current?.();

      const unsubImpression = ad.addAdEventListener(NativeAdEventType.IMPRESSION, () => {
        track('ad_impression', context);
      });
      const unsubClick = ad.addAdEventListener(NativeAdEventType.CLICKED, () => {
        track('ad_clicked', context);
      });
      const unsubOpened = ad.addAdEventListener(NativeAdEventType.OPENED, () => {
        track('ad_opened', context);
      });
      const unsubClosed = ad.addAdEventListener(NativeAdEventType.CLOSED, () => {
        track('ad_closed', context);
      });

      listenersCleanupRef.current = () => {
        unsubImpression.remove();
        unsubClick.remove();
        unsubOpened.remove();
        unsubClosed.remove();
      };

      track('ad_load_succeeded', context);
      setNativeAd(ad);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load native ad:', error);
      track('ad_load_failed', {
        ...context,
        error_message: error instanceof Error ? error.message : 'unknown',
      });
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadAd();

    return () => {
      listenersCleanupRef.current?.();
      listenersCleanupRef.current = null;
      setNativeAd((current) => {
        if (current) {
          current.destroy();
        }
        return null;
      });
    };
  }, []);

  return { nativeAd, isLoading };
}
