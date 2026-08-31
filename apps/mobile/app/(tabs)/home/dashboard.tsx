import React from 'react';
import { Text, View } from 'react-native';

import { screenStyles } from '@shared/config/styles';

export default function HomeDashboardScreen() {
  return (
    <View style={screenStyles.paddedContainer}>
      <Text style={screenStyles.title}>Home Dashboard</Text>
      <Text style={screenStyles.body}>
        RN implementation placeholder for device UI.
      </Text>
    </View>
  );
}
