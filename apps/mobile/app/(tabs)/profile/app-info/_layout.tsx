import { Stack } from 'expo-router';

const HEADER_OPTIONS = {
  headerStyle: { backgroundColor: '#F9FAFB' },
  headerTintColor: '#111827',
  headerShadowVisible: false,
} as const;

export default function AppInfoLayout() {
  return (
    <Stack screenOptions={HEADER_OPTIONS}>
      <Stack.Screen name="about" options={{ title: 'About App' }} />
      <Stack.Screen name="company" options={{ title: 'Company Profile' }} />
      <Stack.Screen name="agreement" options={{ title: 'User Agreement' }} />
    </Stack>
  );
}
