import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';

import { useHeartsUnreadCount } from '@features/hearts';
import { theme } from '@shared/config/colors';
import { useClientOnlyValue } from '@shared/lib';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={26} style={{ marginBottom: -3 }} {...props} />;
}

/**
 * 탭 4개: 홈 / 관심 / 인연 / 내 정보.
 *
 * 알림은 탭이 아니다 (`href: null`). 5번째 탭으로 올리면 탭바가 좁아지고,
 * 알림은 목적지가 아니라 경유지라 홈 헤더에서 들어가는 편이 맞다.
 * 라우트는 남겨 두어 알림 딥링크가 그대로 동작한다.
 */
export default function TabLayout() {
  const { data: hearts } = useHeartsUnreadCount();
  const heartBadge = hearts?.count ? String(hearts.count) : undefined;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.tabActive,
        tabBarInactiveTintColor: theme.colors.tabInactive,
        tabBarStyle: {
          backgroundColor: theme.colors.tabBarBg,
          borderTopColor: theme.colors.tabBarBorder,
        },
        tabBarLabelStyle: { fontSize: 12 },
        headerStyle: { backgroundColor: theme.colors.background },
        headerTintColor: theme.colors.text,
        headerShown: useClientOnlyValue(false, false),
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: '홈',
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="hearts"
        options={{
          title: '관심',
          tabBarBadge: heartBadge,
          tabBarIcon: ({ color }) => <TabBarIcon name="heart" color={color} />,
        }}
      />
      <Tabs.Screen
        name="connections"
        options={{
          title: '인연',
          tabBarIcon: ({ color }) => <TabBarIcon name="comments" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '내 정보',
          tabBarIcon: ({ color }) => <TabBarIcon name="user" color={color} />,
        }}
      />
      <Tabs.Screen name="notifications" options={{ href: null, title: '알림' }} />
    </Tabs>
  );
}
