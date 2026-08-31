import { Stack } from 'expo-router';

const HEADER_OPTIONS = {
  headerStyle: { backgroundColor: '#F9FAFB' },
  headerTintColor: '#111827',
  headerShadowVisible: false,
} as const;

export default function PreferencesLayout() {
  return (
    <Stack screenOptions={HEADER_OPTIONS}>
      <Stack.Screen name="language" options={{ title: 'Language Settings' }} />
      <Stack.Screen name="permissions" options={{ title: 'System Permissions' }} />
    </Stack>
  );
}
