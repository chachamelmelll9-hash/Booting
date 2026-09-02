import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useSavedProfiles, useSavedSeenStore } from '@features/hearts';
import { theme } from '@shared/config/colors';
import { HIT_SIZE, radius, typography } from '@shared/config/tokens';
import { Stack, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

/**
 * 보관함 진입 — 받은 관심 헤더 우상단.
 *
 * 찜한 카드가 어디로 갔는지 같은 화면에서 보여야 한다. 찜해놓고 어디에 쌓이는지
 * 모르면 그냥 사라진 것과 같다.
 *
 * 배지는 **담긴 개수가 아니라 보고 나서 새로 담긴 개수**다. 개수를 그대로
 * 띄우면 보관함을 확인해도 숫자가 그대로라 알림이 안 꺼지는 것처럼 보인다.
 */
function SavedEntry() {
  const router = useRouter();
  const { data: saved } = useSavedProfiles();
  const lastSeenAt = useSavedSeenStore((s) => s.lastSeenAt);

  const count = (saved ?? []).filter(
    (item) => !lastSeenAt || item.savedAt > lastSeenAt
  ).length;

  return (
    <Pressable
      testID="saved-entry"
      accessibilityRole="button"
      accessibilityLabel={count ? `보관함, 새로 담긴 ${count}명` : '보관함'}
      hitSlop={8}
      onPress={() => router.push('/(tabs)/hearts/saved')}
      style={({ pressed }) => [styles.entry, pressed && styles.pressed]}
    >
      <FontAwesome name="archive" size={19} color={theme.colors.textSecondary} />
      {count > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

// 렌더 밖에서 만든다 — 매 렌더마다 새 컴포넌트가 되면 헤더가 통째로 다시 마운트된다
const heartsOptions = { title: '받은 관심', headerRight: () => <SavedEntry /> };

export default function HeartsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.background },
        headerTintColor: theme.colors.text,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={heartsOptions} />
      <Stack.Screen name="saved" options={{ title: '보관함' }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  entry: {
    width: HIT_SIZE,
    height: HIT_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 4,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    // 탭 배지와 같은 규칙 — 브랜드 민트 + 배경색 테두리로 아이콘에서 떼어낸다
    backgroundColor: theme.colors.primaryDark,
    borderWidth: 2,
    borderColor: theme.colors.background,
  },
  badgeText: { ...typography.micro, color: '#FFFFFF', fontWeight: '700' },
  pressed: { opacity: 0.6 },
});
