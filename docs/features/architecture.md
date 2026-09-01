# Architecture: 부팅(Booting) — 초기 파이프라인

## Overview

- Feature Specs: `docs/features/{parent-profile-consent,profile-discovery,heart-conversation,first-meeting-match}.md`
- Page Map: `docs/features/page-map.md`
- Wireframes: `docs/features/wireframe-*.md`
- Data Model: `docs/features/data-model.md`

```
Pages: 41개 (New 20, Reused 21)
Shared Components (from wireframes): 12개
Server Endpoints Required: 37개
DB Tables: 21개

Existing Structure:
- Mobile features: ads, analytics, auth, settings, webview-entry
- Mobile shared:   api(server.ts), config(colors,styles), lib(supabase,sentry), query, ui(form/*, Themed, ErrorBoundary)
- Server modules:  app, auth, supabase
- Shared packages: i18n, supabase, webview-bridge
```

### 설계 원칙 (이 프로젝트에 고유한 것)

1. **feature 간 직접 import 금지.** `discovery`가 `connections`를 부르지 않는다. 둘이 공유하는 것은 전부 `shared/`로 내린다.
2. **PRD 문구는 코드 한 곳에서만 정의한다.** 상태 문구(PRD 10.3)와 안전수칙은 `shared/config/`의 상수 파일에 두고 화면에서 하드코딩하지 않는다. 문구가 흩어지면 "상호 하트 단계에 '매칭 성공' 금지" 같은 제약을 지킬 수 없다.
3. **미리보기와 실제 노출은 같은 컴포넌트.** `ParentProfileCard`를 두 벌 만들면 부모님이 승인한 화면과 공개되는 화면이 어긋난다.
4. **최종 매칭 전이는 서버만 판정한다.** 모바일에 `matched`로 바꾸는 코드를 두지 않는다.
5. **소유권 스코프 쿼리.** 모든 서버 조회는 `userId`를 where 절에 넣는다 (IDOR 방지). RLS는 2차 방어선이지 유일한 방어선이 아니다.

---

## Mobile Architecture (Clean FSD)

### File Tree

```
apps/mobile/
  app/
    _layout.tsx                              [기존]
    index.tsx                                [수정] 인증/프로필 상태로 라우팅
    +not-found.tsx                           [기존]
    (auth)/
      _layout.tsx  login.tsx  signup.tsx
      forgot-password.tsx  reset-password.tsx  [기존 — 회원가입 후 이동만 수정]
    (parent-setup)/
      _layout.tsx                            [신규] presentation: modal, 스텝 헤더
      onboarding.tsx                         [신규]
      verification.tsx                       [신규]
      consent.tsx                            [신규]
      profile-edit.tsx                       [신규]
      preview.tsx                            [신규]
    (tabs)/
      _layout.tsx                            [수정] 탭 4개 + notifications href:null
      home/
        _layout.tsx                          [수정]
        index.tsx                            [수정] 추천 피드로 교체
        filters.tsx                          [신규]
        dashboard.tsx  schedule.tsx          [삭제] 템플릿 잔재
      hearts/
        _layout.tsx  index.tsx               [신규]
      connections/
        _layout.tsx  index.tsx               [신규]
        [id]/
          _layout.tsx  index.tsx             [신규] 채팅방
          parent-intent.tsx                  [신규]
          meeting.tsx                        [신규]
          meeting-solo.tsx                   [신규]
          meeting-confirm.tsx                [신규]
          feedback.tsx                       [신규]
      notifications/
        _layout.tsx  index.tsx               [수정] 알림 타입 교체, 탭바에서 숨김
      profile/
        _layout.tsx  index.tsx               [수정] 부모님 카드 + 안전 섹션 추가
        parent.tsx                           [신규]
        parent-edit.tsx                      [신규]
        blocked.tsx                          [신규]
        reports.tsx                          [신규]
        account/personal-data.tsx            [수정] 탈퇴 + 동의 철회 추가
        (그 외 설정 화면 18개)                 [기존]
    profile/[id].tsx                         [신규] 상대 부모님 상세 Modal
    matched/[id].tsx                         [신규] 상호 하트 시트
    report/[id].tsx                          [신규] 신고 시트

  src/
    features/
      auth/                                  [기존]
      settings/                              [기존]
      webview-entry/                         [기존]
      analytics/                             [기존]
      ads/                                   [기존 — 미사용. 전면 무료·광고 없음(TODO-10)]

      parent-profile/                        [신규]
        ui/
          OnboardingSlides.tsx
          MaritalStatusStep.tsx
          VerificationCenter.tsx
          FamilyDocUploader.tsx
          ConsentSmsForm.tsx
          ConsentInPersonForm.tsx
          ProfileEditFlow.tsx
          sections/BasicInfoSection.tsx
          sections/PhotosSection.tsx
          sections/FamilySection.tsx
          sections/LifestyleSection.tsx
          sections/GoalsSection.tsx
          sections/IntroSection.tsx
          ProfilePreview.tsx
          ProfileStatusPanel.tsx
          ProfileEditMenu.tsx
          styles.ts
        model/
          useParentProfile.ts
          useProfileDraftStore.ts            — 등록 플로우 전용 Zustand (섹션 간 공유 + 임시저장)
          useVerification.ts
          useConsent.ts
        api/
          parentProfile.api.ts
          parentProfile.queries.ts
        lib/
          profileValidation.ts               — 만 50세, 관계 목적 2개, 사진 3~5장,
                                               가족·생활 7항목 필수
          maritalStatus.ts                   — 사별/이혼/별거 판정과 차단 사유
        index.ts

      discovery/                             [신규]
        ui/
          DiscoveryDeck.tsx
          DiscoveryCard.tsx
          DiscoveryEmpty.tsx
          FilterSheet.tsx
          ProfileDetail.tsx
          styles.ts
        model/
          useDiscovery.ts
          useDiscoveryFilterStore.ts         — 필터는 홈·시트가 공유
        api/
          discovery.api.ts
          discovery.queries.ts
        lib/
          distance.ts                        — 반경 라벨/기본값(30km)
        index.ts

      hearts/                                [신규]
        ui/
          ReceivedHeartList.tsx
          ReceivedHeartCard.tsx              — 미읽음(카드) / 읽음(컴팩트) 두 변형
          MutualHeartSheet.tsx
        model/
          useHearts.ts
        api/
          hearts.api.ts
          hearts.queries.ts
        index.ts

      connections/                           [신규]
        ui/
          ConnectionList.tsx
          ConnectionRow.tsx                  — 상태별 행 변형 렌더
          StatusFilterChips.tsx
          ChatRoom.tsx
          MessageBubble.tsx
          MessageComposer.tsx
          PartnerSummaryBar.tsx
          SafetyBanner.tsx
          styles.ts
        model/
          useConnections.ts
          useChat.ts                         — Realtime 구독 + 낙관적 전송
        api/
          connections.api.ts
          connections.queries.ts
        index.ts

      meetings/                              [신규]
        ui/
          ParentIntentSheet.tsx
          MeetingForm.tsx
          MeetingDetail.tsx
          SoloAttendanceSheet.tsx
          MeetingConfirmSheet.tsx
          MeetingFeedbackSheet.tsx
        model/
          useMeeting.ts
        api/
          meetings.api.ts
          meetings.queries.ts
        lib/
          meetingSchedule.ts                 — D-day, 확인 가능 시점 판정
        index.ts

      safety/                                [신규] 신고·차단 (discovery·connections 양쪽에서 쓰임)
        ui/
          ReportSheet.tsx
          BlockedList.tsx
          ReportHistoryList.tsx
        model/
          useSafety.ts
        api/
          safety.api.ts
          safety.queries.ts
        index.ts

      notifications/                         [신규] 기존 라우트의 로직 분리
        ui/
          NotificationList.tsx
          NotificationRow.tsx
        model/
          useNotifications.ts
        api/
          notifications.api.ts
          notifications.queries.ts
        index.ts

    shared/
      api/server.ts                          [기존]
      query/{keys,queryClient}.ts            [기존 — keys 확장]
      lib/{supabase,sentry,...}.ts           [기존]
      lib/realtime.ts                        [신규] Supabase Realtime 구독 헬퍼
      lib/maskName.ts                        [신규] "김철수" → "김OO"
      lib/formatRegion.ts                    [신규] 시·군·구 표기
      config/colors.ts                       [기존 — 액센트/위험/상태색 추가]
      config/styles.ts                       [기존]
      config/spacing.ts                      [신규] 4/8/16/24/32/48/64
      config/typography.ts                   [신규] 크기·굵기 스케일
      config/radius.ts                       [신규] 0/4/8/12/999 — 전부 16 금지
      config/zIndex.ts                       [신규] base/card/sticky/overlay/modal/toast
      config/motion.ts                       [신규] spring damping 18 프리셋
      config/connectionStatus.ts             [신규] **PRD 10.3 상태 문구 단일 소스**
      config/safetyRules.ts                  [신규] 안전수칙 문구 단일 소스
      config/relationshipGoals.ts            [신규] 관계 목적 7종 + 선택 규칙
      ui/form/*                              [기존]
      ui/Themed.tsx  ErrorBoundary.tsx       [기존]
      ui/ParentProfileCard.tsx               [신규]
      ui/VerificationBadgeRow.tsx            [신규]
      ui/RelationshipGoalChips.tsx           [신규]
      ui/ConnectionStatusBadge.tsx           [신규]
      ui/HeartActionBar.tsx                  [신규]
      ui/EmptyState.tsx                      [신규]
      ui/SkeletonList.tsx                    [신규]
      ui/Skeleton.tsx                        [신규]
      ui/DestructiveConfirmDialog.tsx        [신규]
      ui/FormSection.tsx                     [신규]
      ui/PhotoUploader.tsx                   [신규]
      ui/SafetyNotice.tsx                    [신규]
      ui/StepProgressBar.tsx                 [신규]
      ui/BottomSheet.tsx                     [신규] 드래그 핸들 + 스와이프 해제 래퍼
      ui/Toast.tsx                           [신규] 실행 취소 지원
```

### Feature Modules

#### parent-profile/
- **Responsibility**: 자녀 인증 → 부모님 동의 → 프로필 작성 → 승인 → 검수 → 공개/중단까지의 전 과정
- **Components**: 등록 플로우 5화면 + 프로필 상태/수정 2화면 + 섹션 폼 6개
- **State**: `useProfileDraftStore` (Zustand) — 6개 섹션이 한 draft를 공유하고 섹션 이동마다 서버에 임시저장. 그 외는 React Query 캐시
- **API Calls**: `/api/me/verification*`, `/api/parent-profile*` (11개)

#### discovery/
- **Responsibility**: 조건·반경 기반 추천, 카드 스택, 상세 프로필, 하트/넘기기
- **Components**: 카드 덱, 카드, 필터 시트, 상세
- **State**: `useDiscoveryFilterStore` (Zustand) — 홈 헤더 칩과 필터 시트가 같은 값을 본다. 카드 스택은 React Query 무한 쿼리
- **API Calls**: `/api/discovery`, `/api/discovery/filters`, `/api/profiles/:id`, `/api/hearts`, `/api/passes`

#### hearts/
- **Responsibility**: 받은 하트 목록, 하트 되보내기, 상호 하트 시트
- **State**: 없음 (React Query만). 전역 공유 상태가 없다
- **API Calls**: `/api/hearts/received`, `/api/hearts`

#### connections/
- **Responsibility**: 상태별 인연 목록, 자녀 간 1:1 채팅
- **State**: 없음. Realtime 구독 결과를 React Query 캐시에 머지
- **API Calls**: `/api/connections`, `/api/connections/:id/messages`, `/api/connections/:id/end`

#### meetings/
- **Responsibility**: 부모님 의사 확인 → 일정 → 미동행 확인 → 만남 확인 → 비공개 응답
- **State**: 없음
- **API Calls**: `/api/connections/:id/parent-intent`, `/api/connections/:id/meeting*`

#### safety/
- **Responsibility**: 신고·차단 — 여러 feature에서 쓰이지만 **feature 간 import를 피하려고 독립 모듈**로 뺀다
- **State**: 없음
- **API Calls**: `/api/reports`, `/api/blocks`

#### notifications/
- **Responsibility**: 알림 목록 + 딥링크 라우팅
- **State**: 없음
- **API Calls**: `/api/notifications`

### New Shared Components

| Component | Props | Used By |
|-----------|-------|---------|
| `ParentProfileCard` | `profile`, `variant: 'deck' \| 'list' \| 'preview'`, `onPress` | 추천 피드, 미리보기, 마이페이지, 프로필 상태 |
| `VerificationBadgeRow` | `badges: {child, family, consent, review}` | 추천 카드, 상세, 받은 하트, 프로필 상태 |
| `RelationshipGoalChips` | `goals`, `mode: 'display' \| 'select'`, `max = 2`, `onChange` | 카드, 상세, 필터, 프로필 작성 |
| `ConnectionStatusBadge` | `status: ConnectionStatus` | 인연 목록, 채팅방, 만남, 알림 |
| `HeartActionBar` | `onHeart`, `onPass`, `onDetail?`, `layout: 'deck' \| 'row' \| 'detail'` | 추천 피드, 상세, 받은 하트 |
| `EmptyState` | `icon`, `title`, `description`, `cta?` | 전 리스트 화면 |
| `SkeletonList` / `Skeleton` | `rows`, `shape` | 전 리스트 화면 |
| `DestructiveConfirmDialog` | `title`, `body`, `confirmLabel`, `onConfirm` | 공개 중단, 차단, 대화 나가기, 탈퇴, 철회 |
| `FormSection` | `label`, `required`, `helper`, `error`, `children` | 프로필 작성/수정, 만남 일정, 동의 |
| `PhotoUploader` | `photos`, `max = 5`, `onAdd`, `onRemove`, `onSetPrimary` | 프로필 작성, 수정 |
| `SafetyNotice` | `variant: 'banner' \| 'list' \| 'checklist'` | 채팅방, 만남 일정, 미동행 확인 |
| `StepProgressBar` | `current`, `total`, `label` | 등록 플로우 5화면 |
| `BottomSheet` | `snapPoints`, `onDismiss`, `dismissGuard?` | 필터, 신고, 의사 확인, 미동행, 만남 확인, 피드백 |
| `Toast` | `message`, `undo?` | 전역 |

### Route-to-Feature Mapping

| Route File | Feature | Component |
|------------|---------|-----------|
| `app/(tabs)/home/index.tsx` | discovery (+ parent-profile 빈 상태) | `DiscoveryDeck` |
| `app/(tabs)/home/filters.tsx` | discovery | `FilterSheet` |
| `app/profile/[id].tsx` | discovery | `ProfileDetail` |
| `app/(tabs)/hearts/index.tsx` | hearts | `ReceivedHeartList` |
| `app/matched/[id].tsx` | hearts | `MutualHeartSheet` |
| `app/(tabs)/connections/index.tsx` | connections | `ConnectionList` |
| `app/(tabs)/connections/[id]/index.tsx` | connections | `ChatRoom` |
| `app/(tabs)/connections/[id]/parent-intent.tsx` | meetings | `ParentIntentSheet` |
| `app/(tabs)/connections/[id]/meeting.tsx` | meetings | `MeetingForm` / `MeetingDetail` |
| `app/(tabs)/connections/[id]/meeting-solo.tsx` | meetings | `SoloAttendanceSheet` |
| `app/(tabs)/connections/[id]/meeting-confirm.tsx` | meetings | `MeetingConfirmSheet` |
| `app/(tabs)/connections/[id]/feedback.tsx` | meetings | `MeetingFeedbackSheet` |
| `app/(parent-setup)/onboarding.tsx` | parent-profile | `OnboardingSlides` + `MaritalStatusStep` |
| `app/(parent-setup)/verification.tsx` | parent-profile | `VerificationCenter` |
| `app/(parent-setup)/consent.tsx` | parent-profile | `ConsentSmsForm` / `ConsentInPersonForm` |
| `app/(parent-setup)/profile-edit.tsx` | parent-profile | `ProfileEditFlow` |
| `app/(parent-setup)/preview.tsx` | parent-profile | `ProfilePreview` |
| `app/(tabs)/profile/parent.tsx` | parent-profile | `ProfileStatusPanel` |
| `app/(tabs)/profile/parent-edit.tsx` | parent-profile | `ProfileEditMenu` |
| `app/(tabs)/profile/blocked.tsx` | safety | `BlockedList` |
| `app/(tabs)/profile/reports.tsx` | safety | `ReportHistoryList` |
| `app/report/[id].tsx` | safety | `ReportSheet` |
| `app/(tabs)/notifications/index.tsx` | notifications | `NotificationList` |

---

## Server Architecture (Clean Architecture)

### File Tree

```
apps/server/src/
  main.ts                                   [기존] setGlobalPrefix('api')
  app/                                      [기존]
  auth/                                     [기존] JWT 가드, user 데코레이터
  supabase/                                 [기존] SupabaseService (service-role 클라이언트)

  common/                                   [신규]
    guards/verified-child.guard.ts          — 인증 미완료 자녀의 쓰기 차단
    guards/published-profile.guard.ts       — 프로필 미공개 시 추천/하트 차단
    filters/http-exception.filter.ts
    interceptors/logging.interceptor.ts
    dto/pagination.dto.ts

  verification/                             [신규]
    verification.controller.ts  .service.ts  .module.ts
    dto/{submit-phone,submit-family}.dto.ts

  parent-profile/                           [신규]
    parent-profile.controller.ts  .service.ts  .module.ts
    photos.service.ts                       — Storage 업로드/삭제
    consent.service.ts                      — SMS 발송·대면 동의·철회
    review.service.ts                       — 검수 상태 전이
    dto/{create,update,consent,submit,visibility}.dto.ts

  discovery/                                [신규]
    discovery.controller.ts  .service.ts  .module.ts
    discovery.repository.ts                 — 추천 쿼리(반경·조건·제외 집합)
    dto/{filter,discovery-item}.dto.ts

  hearts/                                   [신규]
    hearts.controller.ts  .service.ts  .module.ts
    dto/{send-heart,pass}.dto.ts

  connections/                              [신규]
    connections.controller.ts  .service.ts  .module.ts
    messages.service.ts
    dto/{connection,message,send-message}.dto.ts

  meetings/                                 [신규]
    meetings.controller.ts  .service.ts  .module.ts
    match.service.ts                        — **최종 매칭 판정 단일 지점**
    dto/{parent-intent,propose-meeting,confirm,feedback}.dto.ts

  safety/                                   [신규]
    safety.controller.ts  .service.ts  .module.ts
    dto/{report,block}.dto.ts

  notifications/                            [신규]
    notifications.controller.ts  .service.ts  .module.ts
    notifications.publisher.ts              — 다른 모듈이 호출하는 발행 API
    dto/notification.dto.ts

  maintenance/                              [신규] 스케줄 작업
    maintenance.service.ts                  — 미활동 60일 자동 비공개(TODO-11),
                                              채팅방 90일 read-only(TODO-12),
                                              만남 확인 3일 재알림
    maintenance.module.ts
```

### Modules

#### verification/
- **Responsibility**: 자녀 본인인증·가족관계 인증 상태 관리. MVP는 가족관계 자동 승인이되 상태 기계는 실심사 교체 가능하게 유지
- **Endpoints**: `GET /me/verification`, `POST /me/verification/phone`, `POST /me/verification/family`
- **Dependencies**: SupabaseService, Storage(비공개 버킷)

#### parent-profile/
- **Responsibility**: 프로필 CRUD·사진·동의·제출·공개 상태
- **Endpoints**: 11개 (아래 API Contracts 참조)
- **Dependencies**: verification(가드), SupabaseService, Storage, notifications

#### discovery/
- **Responsibility**: 추천 후보 산출과 필터 저장. 제외 집합·정렬을 서버에서만 결정한다
- **Endpoints**: `GET /discovery`, `GET/PUT /discovery/filters`, `GET /profiles/:id`
- **Dependencies**: SupabaseService, safety(차단 목록)

#### hearts/
- **Responsibility**: 하트·넘김 기록, **상호 하트 판정과 Connection 생성**
- **Endpoints**: `POST /hearts`, `GET /hearts/received`, `POST /passes`
- **Dependencies**: connections(생성), notifications

#### connections/
- **Responsibility**: 인연 목록, 메시지 송수신, 대화 종료
- **Endpoints**: `GET /connections`, `GET/POST /connections/:id/messages`, `POST /connections/:id/end`
- **Dependencies**: SupabaseService, notifications

#### meetings/
- **Responsibility**: 부모님 의사 → 일정 → 확인 → 비공개 응답. `match.service.ts`가 **최종 매칭 전이의 유일한 지점**
- **Endpoints**: 7개
- **Dependencies**: connections(상태 전이), notifications

#### safety/
- **Responsibility**: 신고·차단. 차단은 양방향 제외 집합으로 discovery가 소비한다
- **Endpoints**: `POST/GET /reports`, `POST/GET/DELETE /blocks`

#### maintenance/
- **Responsibility**: 시간 기반 규칙 3종. `@nestjs/schedule` 크론
- **Note**: 서버가 여러 인스턴스로 뜨면 중복 실행되므로 advisory lock으로 단일 실행을 보장한다

### API Contracts

| Method | Endpoint | Request | Response | Auth |
|--------|----------|---------|----------|------|
| GET | /api/me/verification | — | `VerificationStatusDto` | Y |
| POST | /api/me/verification/phone | `{ phone, token }` | `VerificationStatusDto` | Y |
| POST | /api/me/verification/family | `{ storagePath }` | `VerificationStatusDto` | Y |
| GET | /api/parent-profile | — | `ParentProfileDto \| null` | Y |
| POST | /api/parent-profile | `CreateParentProfileDto` | `ParentProfileDto` | Y |
| PATCH | /api/parent-profile | `UpdateParentProfileDto` (부분) | `ParentProfileDto` | Y |
| POST | /api/parent-profile/photos | multipart `file`, `isPrimary` | `ParentPhotoDto` | Y |
| DELETE | /api/parent-profile/photos/:id | — | `204` | Y |
| POST | /api/parent-profile/consent | `{ method, parentName, phone? }` | `ConsentDto` | Y |
| POST | /api/parent-profile/consent/revoke | — | `ParentProfileDto` (status=hidden) | Y |
| POST | /api/parent-profile/submit | — | `ParentProfileDto` (status=review) | Y |
| POST | /api/parent-profile/visibility | `{ visible: boolean }` | `ParentProfileDto` | Y |
| GET | /api/discovery | `?cursor&limit` | `{ items: DiscoveryItemDto[], nextCursor }` | Y |
| GET | /api/discovery/filters | — | `DiscoveryFilterDto` | Y |
| PUT | /api/discovery/filters | `DiscoveryFilterDto` | `DiscoveryFilterDto` | Y |
| GET | /api/profiles/:id | — | `PublicProfileDto` | Y |
| POST | /api/hearts | `{ targetProfileId }` | `{ mutual: boolean, connectionId? }` | Y |
| GET | /api/hearts/received | `?cursor` | `{ items: ReceivedHeartDto[], nextCursor }` | Y |
| POST | /api/passes | `{ targetProfileId }` | `204` | Y |
| POST | /api/blocks | `{ targetUserId }` | `BlockDto` | Y |
| GET | /api/blocks | — | `BlockDto[]` | Y |
| DELETE | /api/blocks/:id | — | `204` | Y |
| POST | /api/reports | `CreateReportDto` | `ReportDto` | Y |
| GET | /api/reports | — | `ReportDto[]` | Y |
| GET | /api/connections | `?status` | `ConnectionDto[]` | Y |
| GET | /api/connections/:id/messages | `?cursor&limit` | `{ items: MessageDto[], nextCursor }` | Y |
| POST | /api/connections/:id/messages | `{ body }` | `MessageDto` | Y |
| POST | /api/connections/:id/end | — | `ConnectionDto` (status=ended) | Y |
| POST | /api/connections/:id/parent-intent | `{ intent }` | `ConnectionDto` | Y |
| GET | /api/connections/:id/meeting | — | `MeetingDto \| null` | Y |
| POST | /api/connections/:id/meeting | `ProposeMeetingDto` | `MeetingDto` | Y |
| POST | /api/connections/:id/meeting/accept | — | `MeetingDto` | Y |
| POST | /api/connections/:id/meeting/confirm | — | `{ meeting, connectionStatus }` | Y |
| POST | /api/connections/:id/meeting/feedback | `{ response }` | `204` | Y |
| GET | /api/notifications | `?cursor` | `{ items: NotificationDto[], nextCursor }` | Y |
| GET | /api | — | `{ status: 'ok' }` | N |
| GET | /api/health | — | `{ status, supabase }` | N |

### DTOs (핵심만)

#### DiscoveryItemDto
```typescript
{
  profileId: string;
  maskedName: string;        // "김OO" — 서버가 마스킹해서 내려준다. 원본 성명을 보내지 않는다
  age: number;               // 생년월일이 아니라 나이만
  region: string;            // "서울 송파구" — 시·군·구까지
  maritalStatus: 'bereaved' | 'divorced';
  goals: RelationshipGoal[]; // 최대 2
  primaryPhotoUrl: string;   // 서명 URL
  introExcerpt: string;      // 소개글 앞부분
  badges: { child: boolean; family: boolean; consent: boolean; review: boolean };
}
```

#### PublicProfileDto
```typescript
DiscoveryItemDto & {
  photoUrls: string[];          // 최대 5
  maritalSince: string | null;
  introByChild: string;
  desiredPartner: string;
  parentMessage: string;
  religion, occupation, retiredOccupation, economicallyActive, drinking, smoking, hobbies;
  childrenCount: string;        // 상세에서만
  livingWith: string;           // 상세에서만
  saju: SajuDto | null;         // is_public=true 일 때만 포함
}
```
> `PublicProfileDto`에 실제 성명·생년월일·연락처·정확한 주소·가족관계증명서 경로가 **들어가지 않는다.** 서버 DTO 매핑에서 제외하고, 이 규칙을 e2e로 검증한다.

#### ConfirmMeetingResponse
```typescript
{
  meeting: MeetingDto;
  connectionStatus: 'meeting_confirm_pending' | 'matched';  // 서버가 판정한 값
}
```

---

## Database Schema

### New Tables

| Table | Key Columns | RLS |
|-------|-------------|-----|
| `child_verifications` | user_id, phone_verified_at, family_doc_status, family_doc_path, family_verified_at | 본인만 select/update. `family_doc_path`는 뷰에서 제외 |
| `parent_profiles` | user_id(unique), display_name, gender, birth_date, region_code, marital_status, marital_since, children_count, living_with, religion, occupation, retired_occupation, economically_active, drinking, smoking, hobbies[], motto, intro_by_child, desired_partner, parent_message, status, published_at, last_active_at | 소유자는 전체 접근. 타인은 `status='published'`인 행만 select |
| `parent_photos` | parent_profile_id, storage_path, is_primary, sort_order | 소유자 CRUD. 타인은 공개 프로필의 사진만 select |
| `parent_consents` | parent_profile_id, method, parent_name, consented_at, revoked_at | 소유자만 |
| `saju_infos` | parent_profile_id(unique), birth_date, calendar_type, birth_time, birth_time_unknown, is_public | 소유자 전체. 타인은 `is_public=true`이고 프로필이 published일 때만 |
| `relationship_goals` | parent_profile_id, goal | 프로필 가시성 상속 |
| `profile_reviews` | parent_profile_id, status, reject_reason, reviewed_at | 소유자 select만. insert/update는 service-role |
| `discovery_filters` | user_id(unique), target_gender, age_min, age_max, region_code, radius_km, marital_filter, goals[], religion, drinking, smoking, economically_active | 본인만 |
| `hearts` | sender_user_id, target_parent_profile_id | unique(sender, target). 본인이 보낸 것 + 내 프로필이 받은 것만 select |
| `passes` | user_id, target_parent_profile_id | 본인만 |
| `blocks` | user_id, blocked_user_id | 본인만 |
| `reports` | reporter_user_id, target_user_id, target_parent_profile_id, reason, detail, status | 신고자 본인만 select |
| `connections` | user_a_id, user_b_id, parent_profile_a_id, parent_profile_b_id, status, ended_reason | 참여자 2인만 |
| `conversations` | connection_id(unique), opened_at, read_only_at | 참여자 2인만 |
| `messages` | conversation_id, sender_user_id, body, sent_at, read_at | 참여자 2인만. insert는 본인 발신만 |
| `parent_intents` | connection_id, user_id, intent, responded_at | unique(connection, user). 참여자 2인 select |
| `meetings` | connection_id, proposed_by_user_id, meet_at, place, child_accompanied, solo_reason, safety_ack_at, status | 참여자 2인만 |
| `meeting_confirmations` | meeting_id, user_id, confirmed_at, reminded_at | unique(meeting, user). 참여자 2인 select, insert는 본인만 |
| `meeting_feedbacks` | meeting_id, user_id, response | unique(meeting, user). **작성자 본인만 select** |
| `notifications` | user_id, type, connection_id, payload, read_at | 본인만 |
| `regions` | code(PK), sido, sigungu, lat, lng | 전체 읽기 가능 (참조 데이터) |

### Migration 스케치

```sql
-- 열거형: 문구가 아니라 코드값으로 저장한다 (표시 문구는 클라이언트 config 단일 소스)
create type marital_status  as enum ('bereaved','divorced');
create type profile_status  as enum ('draft','consent_pending','review','published','hidden','rejected');
-- '가벼운 만남'(casual)은 사용자 결정으로 제외 (2026-09-01, 마이그레이션 20260901120000)
create type relationship_goal as enum ('remarriage','serious','travel_hobby','same_sex_friend','meal_walk','undecided');
create type connection_status as enum ('mutual_heart','chatting','parent_intent','meeting_scheduled','meeting_confirm_pending','matched','ended');
create type parent_intent_kind as enum ('willing','thinking','declined');
create type meeting_feedback_kind as enum ('continue','friends','thinking','no_more');

create table parent_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,  -- TODO-07: 1인 1프로필
  display_name text not null,
  gender text not null check (gender in ('male','female')),
  birth_date date not null,
  region_code text not null references regions(code),
  marital_status marital_status not null,
  status profile_status not null default 'draft',
  last_active_at timestamptz not null default now(),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- 만 50세 이상 (TODO-02)
  constraint parent_min_age check (birth_date <= (current_date - interval '50 years'))
);

-- 관계 목적: 최대 2개 + 'undecided' 단독 (PRD 6장) — 트리거로 강제한다
create table relationship_goals (
  id uuid primary key default gen_random_uuid(),
  parent_profile_id uuid not null references parent_profiles(id) on delete cascade,
  goal relationship_goal not null,
  unique (parent_profile_id, goal)
);

-- 하트 중복 차단
create table hearts (
  id uuid primary key default gen_random_uuid(),
  sender_user_id uuid not null references auth.users(id) on delete cascade,
  target_parent_profile_id uuid not null references parent_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (sender_user_id, target_parent_profile_id)
);

-- 만남 확인: 참여자당 1건. 2건이 모이면 서버가 connections.status='matched' 로 전이
create table meeting_confirmations (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references meetings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  confirmed_at timestamptz not null default now(),
  reminded_at timestamptz,
  unique (meeting_id, user_id)
);

-- 사후 응답: 작성자 본인만 읽는다 (PRD 12.3)
alter table meeting_feedbacks enable row level security;
create policy meeting_feedback_own on meeting_feedbacks
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 공개 프로필만 타인에게 노출
alter table parent_profiles enable row level security;
create policy parent_profile_owner on parent_profiles
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy parent_profile_public_read on parent_profiles
  for select using (status = 'published');

-- 추천 제외 인덱스
create index hearts_target_idx  on hearts (target_parent_profile_id);
create index passes_user_idx    on passes (user_id, target_parent_profile_id);
create index blocks_user_idx    on blocks (user_id, blocked_user_id);
create index profiles_discovery_idx on parent_profiles (status, region_code, gender, birth_date);
create index messages_conv_idx  on messages (conversation_id, sent_at desc);
```

> 마이그레이션은 MCP `apply_migration`으로 적용하되 **동일 SQL을 `supabase/migrations/{timestamp}_{name}.sql`에 반드시 기록**한다 (CLAUDE.md 마이그레이션 단일 정책).

---

## Implementation Order

1. [ ] **DB**: enum + 21개 테이블 + RLS + 인덱스 + `regions` 시드 (시·군·구 코드·좌표)
2. [ ] **Server 공통**: `common/` 가드·필터, `notifications.publisher`
3. [ ] **Server**: verification → parent-profile (인증이 프로필의 전제)
4. [ ] **Server**: discovery → hearts → connections → meetings (의존 순서)
5. [ ] **Server**: safety, notifications, maintenance
6. [ ] **Mobile shared**: 디자인 토큰(`config/*`) → `shared/ui` 14개 컴포넌트
7. [ ] **Mobile**: parent-profile feature + `(parent-setup)` 라우트 (다른 기능의 전제 데이터)
8. [ ] **Mobile**: discovery + `home` 탭
9. [ ] **Mobile**: hearts + `hearts` 탭
10. [ ] **Mobile**: connections + meetings + `connections` 탭
11. [ ] **Mobile**: safety, notifications, `profile` 탭 수정
12. [ ] **WebView**: `/privacy`, `/terms`, `/support`, `/safety`
13. [ ] **정리**: `home/dashboard.tsx`·`home/schedule.tsx` 삭제, `ads` feature 미사용 확인
14. [ ] **통합 검증**: e2e + ADB 스모크

## Decision Log

| Area | Question | Choice |
|------|----------|--------|
| Mobile | 신고·차단을 어디에 둘까 | 독립 `safety` feature — discovery와 connections 양쪽이 쓰므로 한쪽에 넣으면 feature 간 import가 생긴다 |
| Mobile | Zustand 스토어 개수 | 2개만 (`useProfileDraftStore`, `useDiscoveryFilterStore`). 나머지는 React Query 캐시로 충분 |
| Mobile | 상태 문구 위치 | `shared/config/connectionStatus.ts` 단일 소스. 화면 하드코딩 금지 — '매칭 성공' 오용을 코드 구조로 막는다 |
| Mobile | 디자인 토큰 | `config/{spacing,typography,radius,zIndex,motion}.ts` 신설. 기존 `colors.ts`·`styles.ts`는 확장만 |
| Mobile | 등록 플로우 위치 | 탭 밖 `(parent-setup)` Modal 그룹 + 전용 draft 스토어 |
| Mobile | ads feature | 남기되 사용하지 않는다 (TODO-10 전면 무료·광고 없음). 삭제는 템플릿 diff를 키우므로 미사용 확인만 |
| Server | 마스킹 위치 | **서버**. `DiscoveryItemDto`/`PublicProfileDto`에 실명을 아예 담지 않는다. 클라이언트 마스킹은 우회 가능 |
| Server | 최종 매칭 판정 | `meetings/match.service.ts` 한 곳. 모바일에 `matched` 쓰기 경로 없음 |
| Server | 상호 하트 판정 | `hearts.service`가 역방향 하트를 확인하고 Connection을 생성. 클라이언트는 결과만 받는다 |
| Server | 추천 제외 집합 | 서버에서만 계산 (blocks 양방향 ∪ passes ∪ 내가 보낸 hearts ∪ 비공개 ∪ 본인) |
| Server | 시간 기반 규칙 | `maintenance` 모듈 + `@nestjs/schedule`. 다중 인스턴스 대비 advisory lock |
| Server | IDOR 방어 | RLS만 믿지 않고 모든 서비스 쿼리에 `userId` 조건을 넣는다 |
| DB | 표시 문구 저장 | 저장하지 않는다. enum 코드값만 저장하고 문구는 클라이언트 config에서 온다 |
| DB | 부모님 계정 | 만들지 않는다. `parent_profiles` + `parent_consents`로만 존재 |
| 전체 | 컴포넌트 아키텍처 리뷰 | self (agent spawning disabled by session policy) — 와이어프레임의 공유 컴포넌트 12개가 전부 `shared/ui`에 배치됐는지 대조 확인, 누락 2개(`BottomSheet`, `Toast`) 추가 |
