import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity,View } from 'react-native';
import {
  type NativeAd,
  NativeAdView,
  NativeAsset,
  NativeAssetType,
  NativeMediaView,
} from 'react-native-google-mobile-ads';

// App-wide light theme (userInterfaceStyle: "light")
const colors = {
  surface: '#FFFFFF',
  text: '#1E293B',
  textSecondary: '#64748B',
  info: '#3B82F6',
  warning: '#F59E0B',
  surfaceSecondary: '#F1F5F9',
};

interface NativeAdCardProps {
  nativeAd: NativeAd | null;
  onPress?: () => void;
}

export function NativeAdCard({ nativeAd, onPress }: NativeAdCardProps) {
  if (!nativeAd) {
    return null;
  }

  return (
    <NativeAdView nativeAd={nativeAd} style={styles.adViewContainer}>
      <View style={styles.cardWrapper}>
        <TouchableOpacity accessibilityRole="button"
          style={[styles.cardContainer, { backgroundColor: colors.surface }]}
          activeOpacity={0.7}
          onPress={onPress}
        >
          {/* Media */}
          <View style={styles.imageContainer}>
            <NativeMediaView style={styles.image} resizeMode="cover" />
            <View style={styles.adBadge}>
              <Text style={styles.adBadgeText}>AD</Text>
            </View>
          </View>

          {/* Content */}
          <View style={styles.contentContainer}>
            <View
              style={[
                styles.adChip,
                { backgroundColor: colors.info + '20', borderColor: colors.info },
              ]}
            >
              <Text style={[styles.adChipText, { color: colors.info }]}>Ad</Text>
            </View>

            <NativeAsset assetType={NativeAssetType.HEADLINE}>
              <Text
                style={[styles.titleText, { color: colors.text }]}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {nativeAd.headline ?? ''}
              </Text>
            </NativeAsset>

            {(nativeAd.advertiser || nativeAd.store) && (
              <NativeAsset
                assetType={
                  nativeAd.advertiser ? NativeAssetType.ADVERTISER : NativeAssetType.STORE
                }
              >
                <Text style={[styles.advertiserText, { color: colors.textSecondary }]}>
                  {nativeAd.advertiser || nativeAd.store}
                </Text>
              </NativeAsset>
            )}

            {nativeAd.starRating != null && nativeAd.starRating > 0 && (
              <View style={styles.ratingRow}>
                <Text style={[styles.ratingText, { color: colors.warning }]}>
                  {'★'.repeat(Math.floor(nativeAd.starRating))}
                  {'☆'.repeat(5 - Math.floor(nativeAd.starRating))}
                </Text>
                <Text style={[styles.ratingValue, { color: colors.textSecondary }]}>
                  {nativeAd.starRating.toFixed(1)}
                </Text>
              </View>
            )}
          </View>

          {/* Info button */}
          <TouchableOpacity accessibilityRole="button"
            style={[styles.infoButton, { backgroundColor: colors.surfaceSecondary }]}
            onPress={() => {
              Alert.alert(
                'Ad Info',
                'This ad is served via Google AdMob. Personalized ads may be shown based on your privacy settings.',
                [{ text: 'OK', style: 'default' }],
              );
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={{ color: colors.textSecondary, fontSize: 14 }}>i</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </View>
    </NativeAdView>
  );
}

const styles = StyleSheet.create({
  adViewContainer: {
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
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
    position: 'relative',
  },
  imageContainer: {
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 14,
  },
  image: {
    width: 100,
    height: 100,
  },
  adBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  adBadgeText: {
    color: 'white',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 4,
    paddingRight: 32,
  },
  adChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  adChipText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  titleText: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
    marginBottom: 6,
  },
  advertiserText: {
    fontSize: 13,
    lineHeight: 18,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
  },
  ratingValue: {
    fontSize: 12,
  },
  infoButton: {
    position: 'absolute',
    right: 12,
    top: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
