import { Stack } from 'expo-router';

const HEADER_OPTIONS = {
  headerStyle: { backgroundColor: '#F9FAFB' },
  headerTintColor: '#111827',
  headerShadowVisible: false,
} as const;

export default function NotificationPrefsLayout() {
  return (
    <Stack screenOptions={HEADER_OPTIONS}>
      <Stack.Screen name="message-preferences" options={{ title: 'Message Preferences' }} />
    </Stack>
  );
}
