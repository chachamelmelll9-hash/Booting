import { Stack } from 'expo-router';

const HEADER_OPTIONS = {
  headerStyle: { backgroundColor: '#F9FAFB' },
  headerTintColor: '#111827',
  headerShadowVisible: false,
} as const;

export default function SupportLayout() {
  return (
    <Stack screenOptions={HEADER_OPTIONS}>
      <Stack.Screen name="contact" options={{ title: 'Contact Us' }} />
      <Stack.Screen name="feedback" options={{ title: 'Feedback' }} />
    </Stack>
  );
}
