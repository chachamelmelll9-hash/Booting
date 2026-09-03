import { theme } from '@shared/config/colors';
import { Stack } from 'expo-router';

/**
 * 부모님 프로필 등록 플로우.
 *
 * 탭 밖의 Modal 그룹이다 — 등록 중에 탭바가 보이면 중간에 다른 탭으로 새고,
 * 반쯤 만들어진 프로필이 남는다. 5단계를 한 흐름으로 묶는다.
 */
export default function ParentSetupLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.background },
        headerTintColor: theme.colors.text,
        headerShadowVisible: false,
        presentation: 'modal',
      }}
    >
      {/* 로그인 직후 인사. 헤더를 숨긴다 — 부스터가 화면을 다 쓰고,
          '뒤로'로 로그인 화면에 돌아갈 자리도 아니다 */}
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ title: '부모님 프로필 등록' }} />
      <Stack.Screen name="verification" options={{ title: '자녀 인증' }} />
      {/* 동의는 프로필 뒤에 온다 — 동의 기록이 프로필에 붙기 때문이다.
          공개(submit) 는 여전히 동의 없이는 불가능하므로 PRD 제약은 그대로다. */}
      <Stack.Screen name="profile-edit" options={{ title: '프로필 작성' }} />
      <Stack.Screen name="consent" options={{ title: '부모님 동의' }} />
      <Stack.Screen name="preview" options={{ title: '미리보기' }} />
    </Stack>
  );
}
