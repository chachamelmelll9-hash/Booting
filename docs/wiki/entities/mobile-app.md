---
type: Entity
title: 모바일 앱 (apps/mobile)
description: Expo SDK 54 / React Native 0.81.5 / Expo Router v6 / React 19. Clean FSD — app/(라우트) → src/features/(13) → src/shared/(ui 31, config 9). 상태는 React Query + Zustand 스토어 3~4개.
tags: [entity, mobile, expo]
sources:
  - id: pkg
    resource: /apps/mobile/package.json
  - id: routes
    resource: /apps/mobile/app
  - id: arch
    resource: /docs/features/architecture.md
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-11T14:30:00+09:00
status: stable
---

# 모바일 앱

| 항목 | 값 |
|---|---|
| Expo | `~54.0.35`, **new architecture on**, Hermes |
| React Native / React | `0.81.5` / `19.1.0` |
| expo-router | `~6.0.24` (file-based) |
| 상태 | `@tanstack/react-query` ^5.90 (서버 상태), `zustand` ^5 + AsyncStorage persist (로컬) |
| 카카오 | `@react-native-kakao/core` ^2.4.4 + `share` + `social` + `user` |
| 사진 | `expo-image-picker` ~17 (1:1 자르기 → Storage 직접 업로드) |
| 애니메이션 | RN `Animated` 만 (부스터 인사 화면). reanimated 4.1.6 은 패치된 채 의존성에 있음 |
| 식별자 | `com.booting.app`, slug/scheme `booting-mobile`, 홈 표시명 `부팅` |
| 빌드 산출 | 09-07 첫 AAB 64.8MB, 4 ABI, JS 5.06MB. `versionCode` 1 |

## 라우트 (`app/`)

```
index.tsx                 진입 분기 (미인증 → (auth), 인증 → welcome 판정 → (tabs))
_layout.tsx               루트 — 인증 리다이렉트, navigationRef.isReady 가드, 딥링크
(auth)/                   login · signup · forgot/reset-password   [템플릿 재사용]
(parent-setup)/           welcome(부스터) → onboarding(1/5) → verification(2/5, 계정 확인)
                          → consent(4/5 동의 링크) → profile-edit(3/5 6섹션) → preview(5/5)
(tabs)/_layout.tsx        탭 4 — 홈(BootingMark 'B') · 관심 · 매칭 · 내 정보, 아이콘만, 배지 민트
                          initialRouteName home. 프로필 공개 전엔 관심·매칭 탭 href:null
(tabs)/home/              index(오늘의 추천 6장) · filters(추천 조건 시트)
(tabs)/hearts/            index(받은 관심 원석 그리드)
(tabs)/connections/       index(매칭 목록, 칩 전체/매칭, [부모님께 공유])
  [id]/                   index(대화방, headerLeft 뒤로가기) · meeting* · feedback  [API 전용 화면들]
(tabs)/notifications/     href:null — 앱 안 입구 없음
(tabs)/profile/           index(내 정보: 부모님 프로필 상태 · 카카오 계정 연결 · 신고 내역 · 언어 · 도움말 · 로그아웃/탈퇴)
                          parent(프로필 상태/공개 중단) · reports · account/* · app-info/* · help/* · preferences/* · support/*
profile/[id].tsx          상대 부모님 상세 (모달)
matched/[id].tsx          "서로 관심이 있어요" 시트
report/[id].tsx           신고 시트
```
`(parent)/` 그룹(부모님 앱 화면)은 **삭제**됐다 (`eac0e7c`).

## features (`src/features/`)

| feature | 역할 | 비고 |
|---|---|---|
| `auth` | 이메일/카카오 로그인, 토큰 저장, `KakaoLinkRow` | `kakaoAuth.ts` |
| `parent-profile` | 등록 플로우, `useProfileDraftStore`(Zustand, 6섹션 공유 draft), `pickImage`, `sendConsentLink`, `nextSetupStep` | |
| `discovery` | 피드·필터 `useDiscoveryFilterStore`, `useHeartActions` | |
| `daily-picks` | `useDailyPicksStore` + `DailyPicksGrid` | [daily-picks](../concepts/daily-picks.md) |
| `hearts` | 받은 관심, 답하기/넘기기, `useRevealedHearts` | |
| `connections` | 목록·대화방·`ParentShareButton`·`shareToParent.ts` | |
| `meetings` | 의사·일정 API 훅 (동선 밖) | |
| `safety` | 신고 사유·내역 | |
| `notifications` | 알림 목록 | |
| `settings`, `webview-entry`, `analytics` | 템플릿 | |
| `ads` | 템플릿 — **미사용** (전면 무료·광고 없음) | |

## shared

- `shared/ui/` 31개: `GemCard`·`ExpandedGemCard`·`GemCardGrid`·`Gem`, `CompatibilityBadge`, `ParentProfileCard`, `HeartMessageSheet`, `HeartActionBar`, `BottomSheet`, `Toast`, `EmptyState`, `Skeleton*`, `DestructiveConfirmDialog`, `FormSection`, `PhotoUploader`, `SafetyNotice`, `StepProgressBar`, `ConnectionStatusBadge`, `VerificationBadgeRow`, `RelationshipGoalChips`, `BootingLogo`, `BootingMark`, `TabHeader`, `Screen`, `ProfileDeck`(PanResponder 스와이프 덱 — 원석 카드 이전 유물), form/*
- `shared/config/` 9개: `colors.ts`, `tokens.ts`, `connectionStatus.ts`(**상태 문구 단일 소스**), `safetyRules.ts`, `relationshipGoals.ts`, `profileOptions.ts`, `saju.ts`(천간·지지 한글·`dayPillarLabel`), `styles.ts`
- `shared/api/booting.ts` + `booting.types.ts`(DTO 타입), `shared/query/queryClient.ts` — **4xx 는 재시도 안 함, 그 외 3회 1·2·4초** (지하철에서 끊긴 부모님이 대상이었다)
- `shared/lib/keyboard.ts` — 이메일 칸은 Android 에서 `visible-password` (ko-KR 로케일에서 한글 IME 가 조합되는 문제)

## 네이티브 설정

- `app.config.ts` `withKakaoKey` — `__KAKAO_NATIVE_APP_KEY__` 를 빌드 시 env 로 치환 (app.json 은 커밋, env 는 아님)
- `plugins/`: `withAndroidPathCheckOverride`, `withAndroidCmakeObjectPathMax`(Windows MAX_PATH), `withAndroidInstallReferrer`, `withKakaoMaven`, `withKakaoLinkScheme`(현재 미사용)
- 권한: 카메라·마이크 차단, `READ/WRITE_EXTERNAL_STORAGE` 는 유지(Android 12 이하 앨범)
- `android/`·`ios/` 는 gitignore — `expo prebuild --clean` 이 만든다. 브랜딩·네이티브 모듈이 바뀌면 재생성

## env (`.env.development` / `.env.production`)

`EXPO_PUBLIC_SERVER_URL`(에뮬레이터는 `http://10.0.2.2:3000/api`), `EXPO_PUBLIC_WEBVIEW_URL`, `EXPO_PUBLIC_SUPABASE_URL/KEY`, `EXPO_PUBLIC_KAKAO_NATIVE_KEY`, `EXPO_PUBLIC_KAKAO_LOGIN`, `EXPO_PUBLIC_ADMOB_*`(꺼짐). `.env.production` 은 로컬에만, 미완 ([open-questions](../open-questions.md)).

## 개발 전용 (`__DEV__`)

로그인 화면 `개발용 바로 시작`(등록 끝난 `demo` 계정) / `새 계정`(`?fresh=1`) · 동의 화면 "부모님이 동의하신 것으로 처리" · 매칭 카드 "개발: 내 카카오톡으로 보내보기" · 공유 콜백 폴백 — 전부 서버가 운영에서 403 ([결정](../decisions/2026-09-04-dev-only-bypasses.md)).

## 관련

[design-system](design-system.md) · [server](server.md) · 스펙 `docs/features/page-map.md`, `architecture.md`(초기 설계)
