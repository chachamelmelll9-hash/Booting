import React from 'react';
import { Text, View } from 'react-native';
import { Link } from 'expo-router';

import { screenStyles } from '@shared/config/styles';

export default function PersonalDataScreen() {
  return (
    <View style={screenStyles.paddedContainer}>
      <Text style={screenStyles.title}>Personal Data</Text>
      <Text style={screenStyles.body}>
        Manage your personal information and data.
      </Text>

      <View style={{ marginTop: 24, gap: 12 }}>
        <Link href="/profile" style={screenStyles.link}>
          ← Back to Profile
        </Link>
        <Link href="/profile/account/phone" style={screenStyles.link}>
          Phone Number →
        </Link>
        <Link href="/profile/account/password" style={screenStyles.link}>
          Change Password →
        </Link>
      </View>
    </View>
  );
}
