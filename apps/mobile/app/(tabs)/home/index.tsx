import { AdPlaceholder, NativeAdCard, useNativeAd } from '@features/ads';
import { useAuthStore } from '@features/auth';
import { screenStyles } from '@shared/config/styles';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  const user = useAuthStore((s) => s.user);
  const { nativeAd, isLoading } = useNativeAd({
    screenName: 'home',
    placement: 'home_top',
  });

  return (
    <ScrollView style={screenStyles.paddedContainer}>
      {isLoading ? <AdPlaceholder /> : <NativeAdCard nativeAd={nativeAd} />}
      <View style={styles.header}>
        <Text style={screenStyles.title}>Welcome!</Text>
        {user && <Text style={styles.userEmail}>{user.email}</Text>}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Getting Started</Text>
        <Text style={styles.sectionText}>
          This is a template for building mobile apps with React Native, Expo,
          and NestJS.
        </Text>
        <Text style={styles.sectionText}>The template includes:</Text>
        <View style={styles.featureList}>
          <Text style={styles.featureItem}>
            ✓ Authentication (Login, Signup, Logout)
          </Text>
          <Text style={styles.featureItem}>✓ Tab-based navigation</Text>
          <Text style={styles.featureItem}>✓ WebView integration</Text>
          <Text style={styles.featureItem}>✓ Internationalization (i18n)</Text>
          <Text style={styles.featureItem}>✓ TypeScript configuration</Text>
          <Text style={styles.featureItem}>✓ Turborepo monorepo structure</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Stats</Text>
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>1</Text>
            <Text style={styles.statLabel}>Active User</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>100%</Text>
            <Text style={styles.statLabel}>Uptime</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Issues</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Next Steps</Text>
        <Text style={styles.sectionText}>
          Start building your app by customizing this dashboard and adding your
          own features.
        </Text>
        <Text style={styles.sectionText}>
          Check the documentation in the repository for more information.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 32,
  },
  userEmail: {
    fontSize: 14,
    color: '#374151',
    marginTop: 8,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 8,
  },
  featureList: {
    marginTop: 12,
    marginLeft: 8,
  },
  featureItem: {
    fontSize: 14,
    color: '#10B981',
    lineHeight: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#10B981',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#374151',
    textAlign: 'center',
  },
});
