import { theme } from '@shared/config/colors';
import { Stack } from 'expo-router';

export default function HeartsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.background },
        headerTintColor: theme.colors.text,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: '받은 관심' }} />
    </Stack>
  );
}
