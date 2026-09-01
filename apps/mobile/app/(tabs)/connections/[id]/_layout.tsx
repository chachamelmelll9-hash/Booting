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
 * 대화방은 이 스택의 첫 화면이라 기본 뒤로가기 화살표가 붙지 않는다. 그런데
 * 사용자는 대화 → 목록으로 돌아가려 한다 — 직접 넣어준다.
 * 상호 하트 시트에서 바로 들어온 경우까지 대비해 돌아갈 곳이 없으면
 * 인연 목록으로 보낸다 (탭 자체를 벗어나 홈으로 튀는 것보다 낫다).
 */
function BackToConnections() {
  const router = useRouter();
  return (
    <Pressable
      testID="chat-back"
      accessibilityRole="button"
      accessibilityLabel="인연 목록으로"
      hitSlop={8}
      onPress={() =>
        router.canGoBack() ? router.back() : router.replace('/(tabs)/connections')
      }
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
