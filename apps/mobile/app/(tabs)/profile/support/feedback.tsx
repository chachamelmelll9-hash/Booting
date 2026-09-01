import { screenStyles } from '@shared/config/styles';
import { Link } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';

export default function FeedbackScreen() {
  return (
    <View style={screenStyles.paddedContainer}>
      <Text style={screenStyles.title}>Feedback</Text>
      <Text style={screenStyles.body}>
        Share your thoughts and suggestions to help us improve.
      </Text>

      <View style={{ marginTop: 24, gap: 12 }}>
        <Link href="/profile/support/contact" style={screenStyles.link}>
          ← Back to Contact
        </Link>
        <Link href="/profile" style={screenStyles.link}>
          Back to Profile →
        </Link>
      </View>
    </View>
  );
}
