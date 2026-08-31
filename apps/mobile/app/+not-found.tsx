import { Link, Stack } from 'expo-router';
import { StyleSheet } from 'react-native';

import { Text, View } from '@shared/ui';
import {
  STYLE_ALIGN,
  STYLE_COLORS,
  STYLE_FONT_WEIGHTS,
} from '@shared/config/styles';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={styles.container}>
        <Text style={styles.title}>This screen doesn't exist.</Text>

        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Go to home screen!</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: STYLE_ALIGN.center,
    justifyContent: STYLE_ALIGN.center,
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: STYLE_FONT_WEIGHTS.bold,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    fontSize: 14,
    color: STYLE_COLORS.linkGreen,
  },
});
