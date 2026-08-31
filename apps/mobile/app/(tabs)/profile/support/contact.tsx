import React from 'react';
import { Text, View } from 'react-native';
import { Link } from 'expo-router';

import { screenStyles } from '@shared/config/styles';

export default function ContactScreen() {
  return (
    <View style={screenStyles.paddedContainer}>
      <Text style={screenStyles.title}>Contact Us</Text>
      <Text style={screenStyles.body}>
        Get in touch with our support team for assistance.
      </Text>

      <View style={{ marginTop: 24, gap: 12 }}>
        <Link href="/profile" style={screenStyles.link}>
          ← Back to Profile
        </Link>
        <Link href="/profile/support/feedback" style={screenStyles.link}>
          Send Feedback →
        </Link>
      </View>
    </View>
  );
}
