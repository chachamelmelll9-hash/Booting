import { theme } from '@shared/config/colors';
import { Stack } from 'expo-router';

const HEADER_OPTIONS = {
  headerStyle: { backgroundColor: theme.colors.background },
  headerTintColor: theme.colors.text,
  headerShadowVisible: false,
} as const;

export default function HomeLayout() {
  return (
    <Stack screenOptions={HEADER_OPTIONS}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="filters" options={{ title: '추천 조건', presentation: 'modal' }} />
    </Stack>
  );
}
