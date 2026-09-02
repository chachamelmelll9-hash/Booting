# Pages

## Overview

- Source Features: parent-profile-consent, profile-discovery, heart-conversation, first-meeting-match
- Total Pages: 41 (Mobile: 37, WebView: 4)
- New Pages: 20 | Reused: 21 (보일러플레이트 그대로 또는 내용만 교체)
- Tabs: 4 (+ 탭바에서 숨긴 알림 라우트 1)

## Tab Structure

| # | Tab | Icon Hint | Root Screen | Primary Feature |
|---|-----|-----------|-------------|-----------------|
| 1 | 홈 | 하트가 들어간 집/카드 아이콘 | 추천 카드 스택 | 조건 기반 추천 & 탐색 |
| 2 | 관심 | 하트 (배지 표시) | 받은 하트 목록 | 하트 & 대화 연결 |
| 3 | 매칭 | 두 사람 연결 아이콘 (배지 표시) | 진행 중·매칭된 인연 목록 | 하트 & 대화 연결 + 첫 만남 & 매칭 |

> **용어**: 화면에 보이는 **탭 이름은 '매칭'** 이고, 도메인 용어는 **'인연'**(`connections`)이다.
> 문서에서 '인연 목록'은 매칭 탭의 목록 화면(`app/(tabs)/connections/index.tsx`)을 가리킨다.
> 사용자에게 보이는 문구는 `shared/config/connectionStatus.ts` 와 각 화면의 `title` 이 정본이다.
| 4 | 내 정보 | 사람 아이콘 | 마이페이지 | 부모님 프로필 등록 & 동의 (+ 공통) |

**메시지를 별도 탭으로 두지 않았다.** PRD 13.5(인연 관리)와 13.6(메시지)은 대상이 같고,
사용자가 이 앱에서 가장 자주 하는 판단은 "이 인연은 지금 어느 단계이고 내가 뭘 해야 하나"다.
상태 목록과 대화를 서로 다른 탭에 두면 그 판단이 두 탭에 쪼개진다. `인연` 탭의 각 행이
상태 배지 + 마지막 메시지를 함께 보여주고, 탭하면 상태에 따라 채팅방 또는 만남 화면으로 간다.

**알림은 화면을 차지하지 않는다.** 탭 5개는 주 동선(추천 → 관심 → 인연)을 흐리게 만들고,
홈 헤더의 종 아이콘도 걷어냈다 — 알림으로 오는 일(새 관심·새 대화)은 **관심·매칭 탭 배지**가
같은 자리에서 알려 준다. 같은 사실을 두 곳에서 빨갛게 알리면 어느 쪽을 눌러야 하는지가
매번 질문이 된다. `(tabs)/notifications` 라우트는 `href: null` 로 남겨 두지만 **앱 안에서
들어가는 입구는 없다** (푸시 딥링크가 붙으면 그때 목적지가 된다).

## Navigation Map

```
app/
  |-- index.tsx                       (진입 라우팅: 미인증 → (auth), 인증 → (tabs))
  |-- _layout.tsx
  |
  (auth)                              [재사용]
  |-- login.tsx
  |-- signup.tsx
  |-- forgot-password.tsx
  |-- reset-password.tsx
  |
  (parent-setup)                      [Modal 그룹 — 부모님 등록 플로우]
  |-- _layout.tsx                     (stack, presentation: modal)
  |-- onboarding.tsx                  (서비스 원칙 3장 + 혼인 상태 확인)
  |-- verification.tsx                (본인인증 + 가족관계 인증)
  |-- consent.tsx                     (부모님 동의 — 문자 / 대면)
  |-- profile-edit.tsx                (6섹션 프로필 폼)
  |-- preview.tsx                     (공개 미리보기 + 부모님 승인 요청)
  |
  (tabs)
  |-- _layout.tsx
  |-- home/
  |     |-- index.tsx                 (추천 카드 스택 / 등록 전 빈 상태)
  |     |-- filters.tsx               (BottomSheet: 추천 조건)
  |-- hearts/
  |     |-- index.tsx                 (받은 하트 목록)
  |-- connections/
  |     |-- index.tsx                 (상태별 인연 목록)
  |     |-- [id]/
  |           |-- index.tsx           (채팅방 — 자녀 간 1:1)
  |           |-- parent-intent.tsx   (BottomSheet: 부모님 의사 확인)
  |           |-- meeting.tsx         (만남 일정 제안·수락·상세)
  |           |-- meeting-solo.tsx    (BottomSheet: 자녀 미동행 확인)
  |           |-- meeting-confirm.tsx (BottomSheet: '부모님끼리 만났어요')
  |           |-- feedback.tsx        (BottomSheet: 만남 이후 비공개 응답)
  |-- profile/                        [대부분 재사용]
  |     |-- index.tsx                 (마이페이지 — 항목 추가)
  |     |-- parent.tsx                (부모님 프로필 상태 / 공개 중단)
  |     |-- parent-edit.tsx           (부모님 프로필 수정)
  |     |-- reports.tsx               (신고 내역)
  |-- hearts/
  |     |-- index.tsx                 (받은 관심 덱 — 넘기기 / 찜해놓기 / 관심)
  |     |-- saved.tsx                 (보관함 — 찜한 프로필)
  |     |-- app-settings.tsx / notification-settings.tsx / info.tsx      [재사용]
  |     |-- account/ · app-info/ · help/ · notifications/ · preferences/ · support/  [재사용]
  |-- notifications/
        |-- index.tsx                 [재사용, 탭바에서 숨김(href: null)]

  (modals)                            [탭 어디서나 열리는 공유 화면]
  |-- profile/[id].tsx                (상대 부모님 상세 프로필)
  |-- matched/[id].tsx                ("서로 관심이 있어요" 전체화면 시트)
  |-- report/[id].tsx                 (신고 사유 선택)
```

## Page Definitions

### Tab: 홈

#### 1. 추천 피드
- **Route**: `app/(tabs)/home/index.tsx`
- **Type**: Tab
- **Purpose**: 조건에 맞는 상대 부모님 프로필을 카드로 넘겨보며 하트/넘기기를 판단한다
- **Source Feature**: 조건 기반 추천 & 탐색 (+ 등록 전 빈 상태는 부모님 프로필 등록 & 동의)
- **Data Source**: Server API
- **Navigation**:
  - From: Tab bar (앱 시작 기본 탭)
  - To: `filters`(조건), `/profile/[id]`(상세), `/report/[id]`(신고), `notifications`(헤더 종), `(parent-setup)/onboarding`(등록 전 CTA)
  - Back: N/A (tab root)
- **Reuse**: Existing `app/(tabs)/home/index.tsx` — 내용 전면 교체. 보일러플레이트의 `dashboard.tsx`, `schedule.tsx`는 삭제
- **Note**: 부모님 프로필이 `published`가 아니면 카드 대신 빈 상태 카드를 렌더한다 (추천 조회 자체를 하지 않는다)

#### 2. 추천 조건
- **Route**: `app/(tabs)/home/filters.tsx`
- **Type**: BottomSheet
- **Purpose**: 추천 거리·연령·혼인상태 등 조건을 조정한다
- **Source Feature**: 조건 기반 추천 & 탐색
- **Data Source**: Server API (저장) + Local State (편집 중)
- **Navigation**: From 추천 피드 헤더 필터 아이콘 / To 없음(적용 후 닫힘) / Back 추천 피드
- **Reuse**: New

### Tab: 관심

#### 3. 받은 하트
- **Route**: `app/(tabs)/hearts/index.tsx`
- **Type**: Tab
- **Purpose**: 우리 부모님께 관심을 보낸 분을 확인하고 하트를 되돌려줄지 정한다
- **Source Feature**: 하트 & 대화 연결
- **Data Source**: Server API
- **Navigation**:
  - From: Tab bar (읽지 않은 개수 배지)
  - To: `/profile/[id]`(상세), `/matched/[id]`(상호 하트 성립 시), `/report/[id]`
  - Back: N/A (tab root)
- **Reuse**: New

### Tab: 매칭

#### 4. 매칭 목록
- **Route**: `app/(tabs)/connections/index.tsx`
- **Type**: Tab
- **Purpose**: 진행 중인 인연이 각각 어느 단계인지 한 화면에서 보고 다음 행동으로 들어간다
- **Source Feature**: 하트 & 대화 연결 + 첫 만남 & 최종 매칭 확정
- **Data Source**: Server API (Realtime 구독으로 상태·마지막 메시지 갱신)
- **Navigation**:
  - From: Tab bar (읽지 않은 메시지 배지)
  - To: `[id]/index`(채팅), `[id]/meeting`(만남 예정·확인 대기 상태에서 바로)
  - Back: N/A (tab root)
- **Reuse**: New
- **Note**: 필터 칩은 **전체 / 매칭** 둘뿐이다. 상태 7개를 칩 7개로 늘어놓지 않는다 — 진행 중인 인연은 어차피 '전체'에 다 있고, 따로 찾고 싶은 건 만나기로 된 분뿐이다. 각 행의 **상태 배지**는 PRD 10.3 문구를 그대로 쓴다 (`shared/config/connectionStatus.ts` 가 단일 소스)

#### 5. 채팅방
- **Route**: `app/(tabs)/connections/[id]/index.tsx`
- **Type**: Stack
- **Purpose**: 자녀끼리 대화하며 부모님께 소개할지 판단한다
- **Source Feature**: 하트 & 대화 연결
- **Data Source**: Server API + Realtime
- **Navigation**:
  - From: 인연 목록, 상호 하트 시트의 `대화 시작하기`
  - To: `/profile/[id]`(상단 요약 바), `parent-intent`, `meeting`, `/report/[id]`
  - Back: 인연 목록
- **Reuse**: New

#### 6. 부모님 의사 확인
- **Route**: `app/(tabs)/connections/[id]/parent-intent.tsx`
- **Type**: BottomSheet
- **Purpose**: 부모님께 여쭤본 만남 의사를 3지선다로 기록한다
- **Source Feature**: 첫 만남 & 최종 매칭 확정
- **Data Source**: Server API
- **Navigation**: From 채팅방 상단 액션 / To 양측 동의 시 `meeting` / Back 채팅방
- **Reuse**: New

#### 7. 만남 일정
- **Route**: `app/(tabs)/connections/[id]/meeting.tsx`
- **Type**: Stack
- **Purpose**: 첫 만남의 일시·장소·동행 여부를 제안하고 수락한다
- **Source Feature**: 첫 만남 & 최종 매칭 확정
- **Data Source**: Server API
- **Navigation**: From 채팅방 / 인연 목록 / To `meeting-solo`(미동행 선택 시), `meeting-confirm`(만남 시각 이후) / Back 채팅방
- **Reuse**: New

#### 8. 자녀 미동행 확인
- **Route**: `app/(tabs)/connections/[id]/meeting-solo.tsx`
- **Type**: BottomSheet
- **Purpose**: 미동행 사유를 받고 안전수칙 3항을 다시 확인시킨다
- **Source Feature**: 첫 만남 & 최종 매칭 확정
- **Data Source**: Server API
- **Navigation**: From 만남 일정의 동행 여부 토글 / To 없음 / Back 만남 일정
- **Reuse**: New
- **Note**: 체크 3개 + 사유 입력 전까지 진행 버튼 비활성

#### 9. 만남 확인
- **Route**: `app/(tabs)/connections/[id]/meeting-confirm.tsx`
- **Type**: BottomSheet
- **Purpose**: '부모님끼리 만났어요'를 기록하고 상대의 확인을 기다린다
- **Source Feature**: 첫 만남 & 최종 매칭 확정
- **Data Source**: Server API
- **Navigation**: From 만남 일정 / 인연 목록 / To `feedback`(내 확인 직후) / Back 만남 일정
- **Reuse**: New
- **Note**: 최종 매칭 전이 여부는 서버 응답으로만 판단한다. 클라이언트가 '매칭 성공'을 선언하지 않는다

#### 10. 만남 이후 응답
- **Route**: `app/(tabs)/connections/[id]/feedback.tsx`
- **Type**: BottomSheet
- **Purpose**: 만남 이후 의향을 비공개로 남긴다
- **Source Feature**: 첫 만남 & 최종 매칭 확정
- **Data Source**: Server API
- **Navigation**: From 만남 확인 직후 / To 없음 / Back 인연 목록
- **Reuse**: New
- **Note**: "상대방에게 공개되지 않아요" 고지를 화면에 명시. 조회 API를 작성자 본인 외에는 만들지 않는다

### Tab: 내 정보

#### 11. 마이페이지
- **Route**: `app/(tabs)/profile/index.tsx`
- **Type**: Tab
- **Purpose**: 부모님 프로필 상태와 계정·안전 설정으로 가는 허브
- **Source Feature**: 부모님 프로필 등록 & 동의 (+ 공통)
- **Data Source**: Server API
- **Navigation**: From Tab bar / To `parent`, `reports`, 기존 설정 화면들 / Back N/A
- **Reuse**: Existing `app/(tabs)/profile/index.tsx` — 상단에 부모님 프로필 카드와 `신고 내역` 항목 추가

#### 12. 부모님 프로필 상태
- **Route**: `app/(tabs)/profile/parent.tsx`
- **Type**: Stack
- **Purpose**: 검수·공개 상태와 인증 배지를 보고 공개를 중단하거나 재개한다
- **Source Feature**: 부모님 프로필 등록 & 동의
- **Data Source**: Server API
- **Navigation**: From 마이페이지 / To `parent-edit`, `(parent-setup)/preview` / Back 마이페이지
- **Reuse**: New

#### 13. 부모님 프로필 수정
- **Route**: `app/(tabs)/profile/parent-edit.tsx`
- **Type**: Stack
- **Purpose**: 등록된 프로필의 각 섹션을 수정한다
- **Source Feature**: 부모님 프로필 등록 & 동의
- **Data Source**: Server API
- **Navigation**: From 부모님 프로필 상태 / To `(parent-setup)/preview`(재승인이 필요한 변경 시) / Back 부모님 프로필 상태
- **Reuse**: New — 폼 컴포넌트는 `(parent-setup)/profile-edit`와 공유

> **14. 차단한 사용자 — 화면 없음.** `내 정보`의 차단 목록 항목과 `blocked.tsx`를
> 걷어냈다. 차단 API(`/blocks`)는 서버에 그대로 있고 discovery 제외 집합이 계속
> 쓰지만, 앱에서 차단 목록을 열어 해제하는 경로는 없다.

#### 15. 신고 내역
- **Route**: `app/(tabs)/profile/reports.tsx`
- **Type**: Stack
- **Purpose**: 내가 접수한 신고와 처리 상태를 확인한다
- **Source Feature**: 조건 기반 추천 & 탐색 / 하트 & 대화 연결
- **Data Source**: Server API
- **Navigation**: From 마이페이지 / To 없음 / Back 마이페이지
- **Reuse**: New

#### 16-27. 기존 설정 화면 (재사용, 변경 없음)
`app-settings.tsx`, `notification-settings.tsx`, `info.tsx`,
`account/password.tsx`, `account/personal-data.tsx`, `account/phone.tsx`,
`app-info/about.tsx`, `app-info/agreement.tsx`, `app-info/company.tsx`,
`help/index.tsx`, `help/faq.tsx`, `help/guide.tsx`, `help/notice.tsx`, `help/policy.tsx`,
`notifications/message-preferences.tsx`, `preferences/language.tsx`, `preferences/permissions.tsx`,
`support/contact.tsx`, `support/feedback.tsx`
- **Reuse**: Existing — 문구만 서비스에 맞게 교체
- **Note**: `account/personal-data.tsx`에 **회원 탈퇴**와 **부모님 동의 철회 요청** 항목을 추가한다 (PRD 13.8)

### 숨김 라우트

#### 28. 알림
- **Route**: `app/(tabs)/notifications/index.tsx`
- **Type**: Stack (탭바에서 `href: null`로 숨김)
- **Purpose**: PRD 16장 알림 13종 이력
- **Source Feature**: 하트 & 대화 연결 / 첫 만남 & 최종 매칭 확정
- **Data Source**: Server API
- **Navigation**: From (앱 안 진입점 없음 — 푸시 딥링크용) / To 알림 종류별 대상 화면 / Back 홈
- **Reuse**: Existing — 알림 타입 목록만 교체
- **Note**: 상호 하트 알림 문구에 '매칭 성공'을 쓰지 않는다 (PRD 16장)

### Modals

#### 29. 상대 부모님 상세 프로필
- **Route**: `app/profile/[id].tsx`
- **Type**: Modal
- **Purpose**: 사진·소개글·생활정보·가족정보를 전부 확인하고 하트/넘기기를 결정한다
- **Source Feature**: 조건 기반 추천 & 탐색
- **Triggered From**: 추천 피드, 받은 하트, 채팅방 상단 요약 바
- **Note**: 자녀 수·동거 가족은 **이 화면에서만** 노출한다

#### 30. 상호 하트 시트
- **Route**: `app/matched/[id].tsx`
- **Type**: Modal (전체 화면)
- **Purpose**: "서로 관심이 있어요"를 알리고 대화로 넘긴다
- **Source Feature**: 하트 & 대화 연결
- **Triggered From**: 추천 피드·받은 하트에서 하트 전송 결과가 상호 하트일 때
- **Note**: 이 화면과 관련 알림에 '매칭', '매칭 성공' 문구를 쓰지 않는다

#### 31. 신고
- **Route**: `app/report/[id].tsx`
- **Type**: BottomSheet
- **Purpose**: 신고 사유를 선택하고 접수한다
- **Source Feature**: 조건 기반 추천 & 탐색 / 하트 & 대화 연결
- **Triggered From**: 추천 카드 ⋯, 상세 ⋯, 채팅방 ⋯

### 부모님 등록 플로우 (Modal 그룹)

#### 32. 등록 안내
- **Route**: `app/(parent-setup)/onboarding.tsx` · **Type**: Modal(Stack)
- **Purpose**: 서비스 원칙 3장 안내 후 혼인 상태로 가입 자격을 확인한다
- **Source Feature**: 부모님 프로필 등록 & 동의
- **Triggered From**: 홈 빈 상태 CTA, 마이페이지 `부모님 등록하기`

#### 33. 인증 센터
- **Route**: `app/(parent-setup)/verification.tsx` · **Type**: Modal(Stack)
- **Purpose**: 자녀 본인인증 + 가족관계 인증을 체크리스트로 진행한다
- **Source Feature**: 부모님 프로필 등록 & 동의
- **Note**: 가족관계증명서 원문은 비공개 버킷에만 올린다. 화면 어디에도 재노출하지 않는다

#### 34. 부모님 동의
- **Route**: `app/(parent-setup)/consent.tsx` · **Type**: Modal(Stack)
- **Purpose**: 문자 동의 또는 자녀 단말 대면 동의를 받는다
- **Source Feature**: 부모님 프로필 등록 & 동의

#### 35. 프로필 작성
- **Route**: `app/(parent-setup)/profile-edit.tsx` · **Type**: Modal(Stack)
- **Purpose**: 6개 섹션 단계형 폼으로 프로필을 작성한다 (자동 임시저장)
- **Source Feature**: 부모님 프로필 등록 & 동의

#### 36. 공개 미리보기 · 부모님 승인 요청
- **Route**: `app/(parent-setup)/preview.tsx` · **Type**: Modal(Stack)
- **Purpose**: 실제 공개될 화면을 그대로 보여주고 부모님의 최종 승인을 받는다
- **Source Feature**: 부모님 프로필 등록 & 동의
- **Note**: 이 단계를 거치지 않고 `published`로 가는 경로를 만들지 않는다

### Auth Screens

기존 보일러플레이트 재사용 — `login.tsx`, `signup.tsx`, `forgot-password.tsx`, `reset-password.tsx`.
변경 사항:
- 카카오 버튼은 `EXPO_PUBLIC_KAKAO_NATIVE_KEY`가 비어 있어 숨겨진 상태를 유지한다 (`kakao_login=false`)
- 회원가입 완료 직후 `(parent-setup)/onboarding`으로 보낸다

## WebView Pages

#### 37. 개인정보 처리방침
- **Route**: `/privacy` · **Purpose**: 수집 항목·보관기간·파기 방식 고지 (PRD 15장) · **Source Feature**: 공통/법적 고지

#### 38. 이용약관
- **Route**: `/terms` · **Purpose**: 가입 자격, 금지행위, 제재 기준 (PRD 14장) · **Source Feature**: 공통/법적 고지

#### 39. 고객지원
- **Route**: `/support` · **Purpose**: 문의 접수·FAQ · **Source Feature**: 공통

#### 40. 안전 가이드
- **Route**: `/safety` · **Purpose**: 첫 만남 안전수칙, 금전 요구·사기 대응 안내 (PRD 14장) · **Source Feature**: 첫 만남 & 최종 매칭 확정
- **Note**: 앱 내 배너·시트에서 "자세히 보기"로 연결한다

## Cross-Feature Navigation

| From (Feature) | From Screen | To (Feature) | To Screen | Trigger |
|----------------|-------------|--------------|-----------|---------|
| 추천 & 탐색 | 추천 피드(빈 상태) | 프로필 등록 & 동의 | `(parent-setup)/onboarding` | `부모님 등록하기` |
| 추천 & 탐색 | 추천 피드 / 상세 | 하트 & 대화 연결 | `/matched/[id]` | 하트 전송 결과가 상호 하트 |
| 하트 & 대화 연결 | 상호 하트 시트 | 하트 & 대화 연결 | `connections/[id]` | `대화 시작하기` |
| 하트 & 대화 연결 | 채팅방 | 추천 & 탐색 | `/profile/[id]` | 상단 요약 바 탭 |
| 하트 & 대화 연결 | 채팅방 | 첫 만남 & 최종 매칭 | `[id]/parent-intent` | `부모님 의사 확인` |
| 첫 만남 & 최종 매칭 | 만남 일정 | 첫 만남 & 최종 매칭 | `[id]/meeting-solo` | 동행 여부를 '동행하지 않음'으로 변경 |
| 첫 만남 & 최종 매칭 | 만남 확인 | 첫 만남 & 최종 매칭 | `[id]/feedback` | 내 확인 저장 직후 |
| 프로필 등록 & 동의 | 부모님 프로필 상태 | 추천 & 탐색 | 추천 피드 | 공개 전환 완료 |
| 전 기능 | 카드 ⋯ / 상세 ⋯ / 채팅방 ⋯ | 공통 | `/report/[id]` | 신고하기 |

## Navigation Flow Diagram

```
[(auth) login/signup]
        |
        v
[app/index] --프로필 없음--> [(parent-setup) onboarding → verification → consent
        |                     → profile-edit → preview] --승인·검수--> [공개]
        |                                                                 |
        v                                                                 v
[Tab 홈: 추천 피드] --필터--> [filters]              <---------------------+
        |    |
        |    +--상세--> [/profile/[id]] --하트--> +
        |                                          |
        +--하트--> (상호 하트?) --예--> [/matched/[id]] --대화 시작--> [connections/[id] 채팅방]
                        |                                                      |
[Tab 관심: 받은 하트] ---+                                                      |
                                                                               v
[Tab 매칭: 목록] <--상태 갱신-- [parent-intent] --양측 동의--> matched (동선 끝)
        |                                                                |
        +--만남 예정--> [meeting] --동행 안 함--> [meeting-solo]           |
                            |                                            |
                            +--만남 시각 이후--> [meeting-confirm] --양측 확인--> [매칭 성공]
                                                       |
                                                       v
                                                  [feedback (비공개)]

[Tab 내 정보] --> [parent 상태] --> [parent-edit] / [reports] / 기존 설정
```

## Server Endpoints Required

| Method | Endpoint | Used By | Source Feature | Description |
|--------|----------|---------|----------------|-------------|
| GET | /api/me/verification | 인증 센터 | 프로필 등록 & 동의 | 본인·가족관계 인증 상태 |
| POST | /api/me/verification/phone | 인증 센터 | 프로필 등록 & 동의 | 휴대폰 본인인증 결과 기록 |
| POST | /api/me/verification/family | 인증 센터 | 프로필 등록 & 동의 | 가족관계증명서 제출 (MVP 자동 승인) |
| GET | /api/parent-profile | 홈, 마이페이지, 상태 | 프로필 등록 & 동의 | 내 부모님 프로필 + 상태 |
| POST | /api/parent-profile | 프로필 작성 | 프로필 등록 & 동의 | 생성 (draft) |
| PATCH | /api/parent-profile | 프로필 작성·수정 | 프로필 등록 & 동의 | 섹션 저장 / 임시저장 |
| POST | /api/parent-profile/photos | 프로필 작성 | 프로필 등록 & 동의 | 사진 등록 (최소 3장 / 최대 5장). 파일 자체는 클라이언트가 Storage 에 직접 올리고 경로만 보낸다 |
| DELETE | /api/parent-profile/photos/:id | 프로필 작성 | 프로필 등록 & 동의 | 사진 삭제 |
| POST | /api/parent-profile/consent | 부모님 동의 | 프로필 등록 & 동의 | 문자 발송 / 대면 동의 기록 |
| POST | /api/parent-profile/consent/revoke | 부모님 프로필 상태 | 프로필 등록 & 동의 | 동의 철회 → 즉시 비공개 |
| POST | /api/parent-profile/submit | 공개 미리보기 | 프로필 등록 & 동의 | 부모님 승인 → 검수 대기 |
| POST | /api/parent-profile/visibility | 부모님 프로필 상태 | 프로필 등록 & 동의 | 공개 중단 / 재개 |
| GET | /api/discovery | 추천 피드 | 추천 & 탐색 | 조건·반경 기반 추천 후보 |
| GET | /api/discovery/filters | 추천 조건 | 추천 & 탐색 | 저장된 조건 조회 |
| PUT | /api/discovery/filters | 추천 조건 | 추천 & 탐색 | 조건 저장 |
| GET | /api/profiles/:id | 상세 프로필 | 추천 & 탐색 | 공개 프로필 상세 |
| POST | /api/hearts | 추천 피드, 받은 하트 | 하트 & 대화 연결 | 하트 전송 (상호 여부 응답) |
| GET | /api/hearts/received | 받은 하트 | 하트 & 대화 연결 | 받은 하트 목록 |
| POST | /api/passes | 추천 피드 | 추천 & 탐색 | 넘김 기록 |
| POST | /api/blocks | 신고 화면 | 추천 & 탐색 | 차단 |
| GET | /api/blocks | (앱 화면 없음) | 추천 & 탐색 | 차단 목록 |
| DELETE | /api/blocks/:id | (앱 화면 없음) | 추천 & 탐색 | 차단 해제 |
| POST | /api/reports | 신고 화면, 채팅방 ⋯ 메뉴 | 추천 & 탐색 | 신고 접수 |
| GET | /api/reports | 신고 내역 | 추천 & 탐색 | 내 신고 이력 |
| GET | /api/connections | 인연 목록 | 하트 & 대화 연결 | 상태별 인연 목록 |
| GET | /api/connections/unread-count | 매칭 탭 배지 | 하트 & 대화 연결 | 아직 확인하지 않은 대화방 수 |
| POST | /api/connections/:id/parent-share | 매칭 목록 | 하트 & 대화 연결 | 부모님께 공유 표시 + 대화방에 기록 한 줄 |
| POST | /api/saved | 받은 관심 | 추천 & 탐색 | 찜(보류) |
| GET | /api/saved | 보관함 | 추천 & 탐색 | 찜 목록 |
| DELETE | /api/saved/:profileId | 보관함 | 추천 & 탐색 | 찜 풀기 |
| GET | /api/connections/:id/messages | 채팅방 | 하트 & 대화 연결 | 메시지 페이지네이션 |
| POST | /api/connections/:id/messages | 채팅방 | 하트 & 대화 연결 | 메시지 전송 |
| POST | /api/connections/:id/end | 채팅방 | 하트 & 대화 연결 | 대화 종료 |
| POST | /api/connections/:id/parent-intent | 부모님 의사 확인 | 첫 만남 & 최종 매칭 | 의사 기록 |
| GET | /api/connections/:id/meeting | 만남 일정 | 첫 만남 & 최종 매칭 | 일정 조회 |
| POST | /api/connections/:id/meeting | 만남 일정 | 첫 만남 & 최종 매칭 | 일정 제안 |
| POST | /api/connections/:id/meeting/accept | 만남 일정 | 첫 만남 & 최종 매칭 | 일정 수락 |
| POST | /api/connections/:id/meeting/confirm | 만남 확인 | 첫 만남 & 최종 매칭 | '부모님끼리 만났어요' (서버가 최종 매칭 판정) |
| POST | /api/connections/:id/meeting/feedback | 만남 이후 응답 | 첫 만남 & 최종 매칭 | 비공개 응답 저장 |
| GET | /api/notifications | 알림 | 공통 | 알림 이력 |
| GET | /api/health | — | 공통 | readiness (기존) |

## Decision Log

| Question | Choice | Reason |
|----------|--------|--------|
| 탭 개수·구성 | 4개 (홈·관심·매칭·내 정보) | 메시지를 매칭 탭에 합쳐 "지금 어느 단계인가" 판단을 한 화면에 모았다 |
| 메시지 전용 탭 | 두지 않음 | PRD 13.5·13.6의 대상이 동일 — 목록 행이 상태 배지 + 마지막 메시지를 함께 보여준다 |
| 알림 위치 | 화면 없음 — 관심·매칭 탭 배지로 대체 | 탭 5개는 주 동선을 흐리고, 홈 헤더 종은 탭 배지와 같은 사실을 두 번 알렸다. 라우트는 `href: null`로 유지(푸시 딥링크용) |
| 앱 시작 기본 탭 | 홈 (추천 피드) | 최고 빈도 기능. 프로필 미등록 시 같은 화면에서 등록 CTA로 유도 |
| 탭 간 상태 유지 | 유지 (스크롤·필터·탭 위치) | 탐색↔인연 왕복이 잦다. 단 추천 카드 스택은 매 진입 재조회(중복 노출 방지) |
| 부모님 등록 플로우 | 탭 밖 Modal 그룹 `(parent-setup)` | 6단계 선형 플로우라 탭 안에 두면 중간 이탈 시 상태가 꼬인다 |
| 상세·상호 하트·신고 | 탭 밖 공유 Modal | 여러 탭에서 같은 화면으로 진입한다 — 탭마다 복제하지 않는다 |
| 만남 하위 화면 깊이 | `connections/[id]/*` 최대 3단계 | 그 이상 깊어지면 뒤로가기 목적지가 모호해진다 |
| 자녀 수·동거 가족 노출 위치 | 상세 프로필 한 곳 | PRD 8.2 — 필터·카드에 넣지 않는다 |
| 보일러플레이트 처리 | `home/dashboard.tsx`·`home/schedule.tsx` 삭제, 설정 화면군은 재사용 | 템플릿 잔재를 남기면 검수·리뷰에서 서비스와 무관한 화면이 노출된다 |
| UX 리뷰 | self (agent spawning disabled by session policy) | 세션 정책상 서브에이전트를 띄우지 않아 `mobile-ux-ui-design` 체크리스트로 셀프 리뷰했다 — 결과: 탭 5→4 축소, 알림 탭 제거, 스택 깊이 3단계 제한 |
