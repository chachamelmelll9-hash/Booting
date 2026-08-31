import { Stack } from 'expo-router';

const HEADER_OPTIONS = {
  headerStyle: { backgroundColor: '#F9FAFB' },
  headerTintColor: '#111827',
  headerShadowVisible: false,
} as const;

export default function AccountLayout() {
  return (
    <Stack screenOptions={HEADER_OPTIONS}>
      <Stack.Screen name="personal-data" options={{ title: 'Personal Data' }} />
      <Stack.Screen name="phone" options={{ title: 'Phone Number' }} />
      <Stack.Screen name="password" options={{ title: 'Change Password' }} />
    </Stack>
  );
}
