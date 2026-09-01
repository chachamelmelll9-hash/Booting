import { screenStyles } from '@shared/config/styles';
import { Link } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';

export default function MessagePreferencesScreen() {
  return (
    <View style={screenStyles.paddedContainer}>
      <Text style={screenStyles.title}>Message Preferences</Text>
      <Text style={screenStyles.body}>
        Configure how and when you receive notifications.
      </Text>

      <View style={{ marginTop: 24, gap: 12 }}>
        <Link href="/profile" style={screenStyles.link}>
          ← Back to Profile
        </Link>
        <Link href="/profile/notification-settings" style={screenStyles.link}>
          Notification Settings →
        </Link>
      </View>
    </View>
  );
}
