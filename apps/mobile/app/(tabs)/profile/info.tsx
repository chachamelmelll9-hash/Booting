import React from 'react';
import { Text, View } from 'react-native';
import { Link } from 'expo-router';

import { screenStyles } from '@shared/config/styles';

export default function ProfileInfoScreen() {
  return (
    <View style={screenStyles.paddedContainer}>
      <Text style={screenStyles.title}>Profile Info</Text>
      <Text style={screenStyles.body}>
        View and edit your profile information.
      </Text>

      <View style={{ marginTop: 24, gap: 12 }}>
        <Link href="/profile" style={screenStyles.link}>
          ← Back to Profile
        </Link>
        <Link href="/profile/account/personal-data" style={screenStyles.link}>
          Personal Data →
        </Link>
      </View>
    </View>
  );
}
