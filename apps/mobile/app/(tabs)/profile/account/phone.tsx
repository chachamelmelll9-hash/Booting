import React from 'react';
import { Text, View } from 'react-native';
import { Link } from 'expo-router';

import { screenStyles } from '@shared/config/styles';

export default function PhoneScreen() {
  return (
    <View style={screenStyles.paddedContainer}>
      <Text style={screenStyles.title}>Phone Number</Text>
      <Text style={screenStyles.body}>
        Add or update your phone number for account recovery.
      </Text>

      <View style={{ marginTop: 24, gap: 12 }}>
        <Link href="/profile/account/personal-data" style={screenStyles.link}>
          ← Back to Personal Data
        </Link>
      </View>
    </View>
  );
}
