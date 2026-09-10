import { theme } from '@shared/config/colors';
import { Stack } from 'expo-router';

/**
 * 대화방으로 **바로** 들어와도(상호 하트 시트 → 대화 시작하기, 알림 탭)
 * 그 아래에 인연 목록이 깔려 있어야 한다. 지정하지 않으면 스택에 대화방
 * 하나만 쌓여서, 뒤로가기가 목록이 아니라 직전에 있던 탭으로 튄다.
 */
export const unstable_settings = {
  initialRouteName: 'index',
};

export default function ConnectionsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.background },
        headerTintColor: theme.colors.text,
        headerShadowVisible: false,
      }}
    >
      {/*
        탭 첫 화면은 네이티브 헤더를 쓰지 않는다 — 돌아갈 곳이 없는데도
        'Navigate up' 버튼이 그려졌다. 화면이 `TabHeader` 로 로고와 제목을 직접 그린다.
      */}
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[id]" options={{ headerShown: false }} />
    </Stack>
  );
}
