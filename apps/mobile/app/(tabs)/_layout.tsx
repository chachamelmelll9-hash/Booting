import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useHeartsUnreadCount } from '@features/hearts';
import { useParentProfile } from '@features/parent-profile';
import { theme } from '@shared/config/colors';
import { useClientOnlyValue } from '@shared/lib';
import { Tabs } from 'expo-router';
import React from 'react';

// Expo Router 는 탭 초기 화면을 파일 시스템 순서(알파벳)로 고른다 —
// 지정하지 않으면 connections 가 먼저 잡혀 앱이 '인연' 탭으로 열린다.
export const unstable_settings = {
  initialRouteName: 'home',
};

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={26} {...props} />;
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

  // 프로필을 공개하기 전에는 관심·인연 탭이 아무것도 못 한다 (서버가 403 을 준다).
  // 눌러봐야 빈 화면이 나오는 탭을 띄워두면 등록 동선에서 주의만 흩어진다.
  // '내 정보'는 남긴다 — 로그아웃과 등록 상태 확인 경로가 여기뿐이다.
  const { data: parentProfile } = useParentProfile();
  const published = parentProfile?.status === 'published';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.tabActive,
        tabBarInactiveTintColor: theme.colors.tabInactive,
        tabBarStyle: {
          backgroundColor: theme.colors.tabBarBg,
          borderTopColor: theme.colors.tabBarBorder,
          height: 60,
          paddingTop: 6,
        },
        // 아이콘만으로 충분한 4개 탭이라 라벨을 감춘다.
        // title 은 남겨둔다 — 화면 리더가 읽는 이름이자 헤더 제목이다.
        tabBarShowLabel: false,
        headerStyle: { backgroundColor: theme.colors.background },
        headerTintColor: theme.colors.text,
        headerShown: useClientOnlyValue(false, false),
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: '홈',
          tabBarAccessibilityLabel: '홈',
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="hearts"
        options={{
          title: '관심',
          href: published ? undefined : null,
          tabBarAccessibilityLabel: '관심',
          tabBarBadge: heartBadge,
          tabBarIcon: ({ color }) => <TabBarIcon name="heart" color={color} />,
        }}
      />
      <Tabs.Screen
        name="connections"
        options={{
          title: '인연',
          href: published ? undefined : null,
          tabBarAccessibilityLabel: '인연',
          tabBarIcon: ({ color }) => <TabBarIcon name="comments" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '내 정보',
          tabBarAccessibilityLabel: '내 정보',
          tabBarIcon: ({ color }) => <TabBarIcon name="user" color={color} />,
        }}
      />
      <Tabs.Screen name="notifications" options={{ href: null, title: '알림' }} />
    </Tabs>
  );
}
