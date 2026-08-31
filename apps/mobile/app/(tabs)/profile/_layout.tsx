import { Stack } from 'expo-router';

const HEADER_OPTIONS = {
  headerStyle: { backgroundColor: '#F9FAFB' },
  headerTintColor: '#111827',
  headerShadowVisible: false,
} as const;

export default function ProfileLayout() {
  return (
    <Stack screenOptions={HEADER_OPTIONS}>
      <Stack.Screen name="index" options={{ title: 'Profile' }} />
      <Stack.Screen name="info" options={{ title: 'Profile Info' }} />
      <Stack.Screen
        name="notification-settings"
        options={{ title: 'Notification Settings' }}
      />
      <Stack.Screen name="app-settings" options={{ title: 'App Settings' }} />
      {/* Nested Stacks (WebView Entry + Internal) */}
      <Stack.Screen
        name="statistics"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="help"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="device"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="account"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="preferences"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="notifications"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="support"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="app-info"
        options={{ headerShown: false }}
      />
    </Stack>
  );
}
