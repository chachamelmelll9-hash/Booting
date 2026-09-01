import { screenStyles } from '@shared/config/styles';
import { Link } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';

export default function PasswordScreen() {
  return (
    <View style={screenStyles.paddedContainer}>
      <Text style={screenStyles.title}>Change Password</Text>
      <Text style={screenStyles.body}>
        Update your account password for security.
      </Text>

      <View style={{ marginTop: 24, gap: 12 }}>
        <Link href="/profile/account/personal-data" style={screenStyles.link}>
          ← Back to Personal Data
        </Link>
      </View>
    </View>
  );
}
