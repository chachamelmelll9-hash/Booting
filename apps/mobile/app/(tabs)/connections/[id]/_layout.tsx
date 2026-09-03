import FontAwesome from '@expo/vector-icons/FontAwesome';
import { theme } from '@shared/config/colors';
import { HIT_SIZE } from '@shared/config/tokens';
import { Stack, useRouter } from 'expo-router';
import { Pressable } from 'react-native';

/** 일정·의사확인 화면으로 바로 들어와도 그 아래에 대화방이 깔려 있어야 한다 */
export const unstable_settings = {
  initialRouteName: 'index',
};

/**
 * 대화방 뒤로가기.
 *
 * 대화방은 이 스택의 첫 화면이라 기본 뒤로가기 화살표가 붙지 않는다. 직접 넣는다.
 *
 * `back()` 이 아니라 `navigate()` 인 이유: 상호 하트 시트나 알림에서 대화방으로
 * 바로 들어오면 이 스택에 대화방 하나뿐이라 `back()` 이 탭 네비게이터까지 올라가
 * 홈 탭으로 튄다. `navigate` 는 목록이 스택에 있으면 거기까지 pop 하고, 없으면
 * 목록을 띄운다 — 어느 경로로 들어왔든 결과가 같다.
 */
function BackToConnections() {
  const router = useRouter();
  return (
    <Pressable
      testID="chat-back"
      accessibilityRole="button"
      accessibilityLabel="매칭 목록으로"
      hitSlop={8}
      onPress={() => router.navigate('/(tabs)/connections')}
      style={({ pressed }) => [
        { width: HIT_SIZE, height: HIT_SIZE, alignItems: 'center', justifyContent: 'center' },
        pressed && { opacity: 0.6 },
      ]}
    >
      <FontAwesome name="angle-left" size={28} color={theme.colors.text} />
    </Pressable>
  );
}

// 렌더 밖에서 만든다 — 매 렌더마다 새 컴포넌트가 되면 헤더가 통째로 다시 마운트된다
const chatOptions = { title: '대화', headerLeft: () => <BackToConnections /> };

export default function ConnectionDetailLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.background },
        headerTintColor: theme.colors.text,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={chatOptions} />
      {/* parent-intent 는 없앴다 — 부모님 의사는 부모님이 자기 화면에서 직접 정한다 */}
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
