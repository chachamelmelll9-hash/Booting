import { useAnalytics } from '@features/analytics';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';

import { getAdUnitId } from '../config/adConfig';

interface BannerAdViewProps {
  /** Placement identifier for analytics (e.g. "home_bottom", "list_top") */
  placement?: string;
}

export function BannerAdView({ placement = 'default' }: BannerAdViewProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { track } = useAnalytics();
  const unitId = getAdUnitId('banner');

  if (isCollapsed) {
    return null;
  }

  return (
    <View style={styles.container}>
      <BannerAd
        unitId={unitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        onAdLoaded={(dimensions) => {
          track('ad_load_succeeded', {
            ad_format: 'banner',
            placement,
            ad_width: dimensions.width,
            ad_height: dimensions.height,
          });
        }}
        onAdFailedToLoad={(error) => {
          track('ad_load_failed', {
            ad_format: 'banner',
            placement,
            error_message: error.message,
          });
          setIsCollapsed(true);
        }}
        onAdOpened={() => {
          track('ad_opened', { ad_format: 'banner', placement });
        }}
        onAdClosed={() => {
          track('ad_closed', { ad_format: 'banner', placement });
        }}
        onPaid={(event) => {
          track('ad_impression', {
            ad_format: 'banner',
            placement,
            revenue_value: event.value,
            revenue_currency: event.currency,
            revenue_precision: String(event.precision),
          });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 12,
  },
});
