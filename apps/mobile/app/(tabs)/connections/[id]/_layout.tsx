import { theme } from '@shared/config/colors';
import { Stack } from 'expo-router';

export default function ConnectionDetailLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.background },
        headerTintColor: theme.colors.text,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: '대화' }} />
      <Stack.Screen
        name="parent-intent"
        options={{ title: '부모님 의사 확인', presentation: 'modal' }}
      />
      <Stack.Screen name="meeting" options={{ title: '만남 일정' }} />
      <Stack.Screen
        name="meeting-solo"
        options={{ title: '자녀 미동행 확인', presentation: 'modal' }}
      />
      <Stack.Screen
        name="meeting-confirm"
        options={{ title: '만남 확인', presentation: 'modal' }}
      />
      <Stack.Screen name="feedback" options={{ title: '만남 후기', presentation: 'modal' }} />
    </Stack>
  );
}
