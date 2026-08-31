import { Stack } from 'expo-router';

const HEADER_OPTIONS = {
  headerStyle: { backgroundColor: '#F9FAFB' },
  headerTintColor: '#111827',
  headerShadowVisible: false,
} as const;

export default function HomeLayout() {
  return (
    <Stack screenOptions={HEADER_OPTIONS}>
      <Stack.Screen name="index" options={{ title: 'Home' }} />
      <Stack.Screen name="dashboard" options={{ title: 'Dashboard' }} />
      <Stack.Screen name="schedule" options={{ title: 'Schedule' }} />
    </Stack>
  );
}
