import { theme } from '@shared/config/colors';
import { Stack } from 'expo-router';

// 다른 스택과 같은 팔레트를 쓴다 — 여기만 하드코딩된 회색이라 헤더 색이 달랐다
const HEADER_OPTIONS = {
  headerStyle: { backgroundColor: theme.colors.background },
  headerTintColor: theme.colors.text,
  headerShadowVisible: false,
} as const;

export default function NotificationsLayout() {
  return (
    <Stack screenOptions={HEADER_OPTIONS}>
      <Stack.Screen name="index" options={{ title: '알림' }} />
    </Stack>
  );
}
