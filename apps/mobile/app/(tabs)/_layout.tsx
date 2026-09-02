import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useConnectionsUnread } from '@features/connections';
import { useHeartsUnreadCount } from '@features/hearts';
import { useParentProfile } from '@features/parent-profile';
import { theme } from '@shared/config/colors';
import { useClientOnlyValue } from '@shared/lib';
import { BootingMark } from '@shared/ui';
import { Tabs } from 'expo-router';
import React from 'react';

// Expo Router 는 탭 초기 화면을 파일 시스템 순서(알파벳)로 고른다 —
// 지정하지 않으면 connections 가 먼저 잡혀 앱이 '인연' 탭으로 열린다.
export const unstable_settings = {
  initialRouteName: 'home',
};

/**
 * 탭 아이콘은 모듈 스코프에서 만든다.
 * 렌더 안에서 정의하면 매 렌더마다 새 컴포넌트 타입이 되어 React 가 탭
 * 서브트리를 통째로 버리고 다시 만든다 (react/no-unstable-nested-components).
 */
function tabIcon(name: React.ComponentProps<typeof FontAwesome>['name']) {
  function TabBarIcon({ color }: { color: string }) {
    return <FontAwesome name={name} size={26} color={color} />;
  }
  return TabBarIcon;
}

/** 홈 탭만 브랜드 마크를 쓴다 — 추천이 오는 곳이 곧 부팅이다 */
function HomeIcon({ color }: { color: string }) {
  return <BootingMark color={color} />;
}

const HeartIcon = tabIcon('heart');
const ConnectionsIcon = tabIcon('comments');
const ProfileIcon = tabIcon('user');

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

  // 새 대화방(안 읽은 메시지 또는 아직 열지 않은 방)이 있으면 매칭 탭에 배지
  const { data: unseenRooms } = useConnectionsUnread();
  const connectionsBadge = unseenRooms?.count ? String(unseenRooms.count) : undefined;

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
        /**
         * 배지는 브랜드 민트로 칠한다.
         *
         * 기본 빨강은 이 앱에서 '위험·되돌릴 수 없음'(신고·차단·대화 나가기·탈퇴)
         * 전용이다. 새 관심·새 대화는 반가운 일인데 같은 색으로 알리면 경고처럼
         * 읽힌다. 목록 카드 하이라이트도 이미 민트라 같은 신호가 같은 색이 된다.
         *
         * primary 가 아니라 primaryDark 인 이유: 배지 숫자는 10sp 남짓이라
         * teal-500 위의 흰 글자는 대비가 모자란다.
         *
         * 흰 테두리를 두르는 이유: 활성 탭 아이콘 색(tabActive)이 이 배지 색과
         * 같아서, 테두리가 없으면 배지가 아이콘에 녹아 숫자만 떠 있는 것처럼 보인다.
         */
        tabBarBadgeStyle: {
          backgroundColor: theme.colors.primaryDark,
          color: theme.colors.tabBarBg,
          borderWidth: 2,
          borderColor: theme.colors.tabBarBg,
        },
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
          tabBarIcon: HomeIcon,
        }}
      />
      <Tabs.Screen
        name="hearts"
        options={{
          title: '관심',
          href: published ? undefined : null,
          tabBarAccessibilityLabel: '관심',
          tabBarBadge: heartBadge,
          tabBarIcon: HeartIcon,
        }}
      />
      <Tabs.Screen
        name="connections"
        options={{
          title: '매칭',
          href: published ? undefined : null,
          tabBarAccessibilityLabel: '매칭',
          tabBarBadge: connectionsBadge,
          tabBarIcon: ConnectionsIcon,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '내 정보',
          tabBarAccessibilityLabel: '내 정보',
          tabBarIcon: ProfileIcon,
        }}
      />
      <Tabs.Screen name="notifications" options={{ href: null, title: '알림' }} />
    </Tabs>
  );
}
