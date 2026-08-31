import React from 'react';
import { Text, View } from 'react-native';
import { Link } from 'expo-router';

import { screenStyles } from '@shared/config/styles';

export default function AboutScreen() {
  return (
    <View style={screenStyles.paddedContainer}>
      <Text style={screenStyles.title}>About App</Text>
      <Text style={screenStyles.body}>
        MyApp Service v1.0.0{'\n'}
        Intelligent pet care companion.
      </Text>

      <View style={{ marginTop: 24, gap: 12 }}>
        <Link href="/profile" style={screenStyles.link}>
          ← Back to Profile
        </Link>
        <Link href="/profile/help" style={screenStyles.link}>
          Help Center →
        </Link>
      </View>
    </View>
  );
}
