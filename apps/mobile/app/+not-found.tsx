import {
  STYLE_ALIGN,
  STYLE_COLORS,
  STYLE_FONT_WEIGHTS,
} from '@shared/config/styles';
import { Text, View } from '@shared/ui';
import { Link, Stack } from 'expo-router';
import { StyleSheet } from 'react-native';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: '페이지를 찾을 수 없습니다' }} />
      <View style={styles.container}>
        <Text style={styles.title}>없는 화면입니다</Text>

        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>처음 화면으로</Text>
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
