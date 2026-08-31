import React from 'react';
import { Text, View } from 'react-native';
import { Link } from 'expo-router';

import { screenStyles } from '@shared/config/styles';

export default function PermissionsScreen() {
  return (
    <View style={screenStyles.paddedContainer}>
      <Text style={screenStyles.title}>System Permissions</Text>
      <Text style={screenStyles.body}>
        Manage app permissions for camera, notifications, location, etc.
      </Text>

      <View style={{ marginTop: 24, gap: 12 }}>
        <Link href="/profile/preferences/language" style={screenStyles.link}>
          ← Back to Language
        </Link>
        <Link href="/profile" style={screenStyles.link}>
          Back to Profile →
        </Link>
      </View>
    </View>
  );
}
