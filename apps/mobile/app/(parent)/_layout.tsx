import { theme } from '@shared/config/colors';
import { Stack } from 'expo-router';

/**
 * 부모님 화면 스택.
 *
 * 탭이 없다. 부모님이 하실 일은 자녀가 보내주신 프로필을 보고 두 가지 중
 * 하나를 고르는 것뿐이라, 어디로 갈지 고민하게 만드는 요소를 두지 않는다.
 */
export default function ParentLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.background },
        headerTintColor: theme.colors.text,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="code" options={{ headerShown: false }} />
      <Stack.Screen name="home" options={{ headerShown: false }} />
      <Stack.Screen
        name="profile/[connectionId]"
        options={{ title: '자녀분이 보내신 프로필' }}
      />
    </Stack>
  );
}
