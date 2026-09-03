import { useAuth } from '@features/auth';
import { router,Stack } from 'expo-router';
import { useEffect } from 'react';

export default function AuthLayout() {
  const { isAuthenticated } = useAuth();

  // 로그인 화면에 있는데 세션이 생겼다 = 방금 로그인했다. 인사 화면으로 보낸다
  // (프로필이 이미 있으면 그 화면이 알아서 홈으로 넘긴다).
  // 홈으로 바로 보내면 login.tsx 의 이동과 서로 밀어내 인사가 스쳐 지나간다.
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/(parent-setup)/welcome');
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
