import { theme } from '@shared/config/colors';
import { Stack } from 'expo-router';

/**
 * 받은 관심 스택.
 *
 * 보관함(찜)을 걷어냈다. 받은 관심 카드는 2주 뒤 자동으로 사라지므로,
 * "지금 결정하기 어려운 분"을 따로 담아 둘 자리가 필요 없다 — 결정하지 않으면
 * 그대로 두면 되고, 그게 곧 보류다. 담아 두는 자리를 만들면 사용자는 거기까지
 * 관리해야 하고, 정작 그 목록은 다시 열어 보지 않는다.
 */
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
