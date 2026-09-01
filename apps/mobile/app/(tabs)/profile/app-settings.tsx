import { screenStyles } from '@shared/config/styles';
import React from 'react';
import { Text, View } from 'react-native';

export default function AppSettingsScreen() {
  return (
    <View style={screenStyles.paddedContainer}>
      <Text style={screenStyles.title}>App Settings</Text>
      <Text style={screenStyles.body}>
        RN placeholder for cache clear and version.
      </Text>
    </View>
  );
}
