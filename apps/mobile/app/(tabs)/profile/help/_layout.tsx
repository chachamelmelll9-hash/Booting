import { Stack } from 'expo-router';

const HEADER_OPTIONS = {
  headerStyle: { backgroundColor: '#F9FAFB' },
  headerTintColor: '#111827',
  headerShadowVisible: false,
} as const;

export default function HelpLayout() {
  return (
    <Stack screenOptions={HEADER_OPTIONS}>
      <Stack.Screen name="index" options={{ title: 'Help Center' }} />
      <Stack.Screen name="notice" options={{ title: 'Announcements' }} />
      <Stack.Screen name="guide" options={{ title: 'Guides & Tutorials' }} />
      <Stack.Screen name="faq" options={{ title: 'FAQ' }} />
      <Stack.Screen name="policy" options={{ title: 'Terms & Privacy' }} />
    </Stack>
  );
}
