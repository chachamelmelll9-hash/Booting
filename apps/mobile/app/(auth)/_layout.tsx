import { useAuth } from '@features/auth';
import { router,Stack } from 'expo-router';
import { useEffect } from 'react';

export default function AuthLayout() {
  const { isAuthenticated } = useAuth();

  // 인증됐으면 홈으로 리다이렉트
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/(tabs)/home');
    }
  }, [isAuthenticated]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#F9FAFB' },
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="reset-password" />
    </Stack>
  );
}
