# Test Scenarios: 부팅(Booting) — 초기 파이프라인

## Overview

- Feature Specs: `docs/features/{parent-profile-consent,profile-discovery,heart-conversation,first-meeting-match}.md`
- Page Map: `docs/features/page-map.md`
- Wireframes: `docs/features/wireframe-*.md`
- Architecture: `docs/features/architecture.md`
- Package: `com.booting.app`

> **문구 규칙**: 아래 모든 Then 절의 텍스트는 feature spec의 State Matrix 문구를 **그대로** 옮긴 것이다.
> 구현이 문구를 바꾸면 테스트가 깨져야 한다 — 특히 상태 문구(PRD 10.3)와 '매칭 성공' 금지 규칙.

## Journey → Scenario 매핑

| # | Journey Step | Scenarios | IDs | Components |
|---|-------------|-----------|-----|------------|
| 1 | 발견 — 등록 전 빈 상태 | 3 | S1.1 ~ S1.3 | Mobile, Server |
| 2 | 가입 자격 확인 (혼인 상태) | 2 | S2.1 ~ S2.2 | Mobile |
| 3 | 자녀 인증 + 가족관계 인증 | 4 | S3.1 ~ S3.4 | Mobile, Server, DB |
| 4 | 부모님 동의 | 4 | S4.1 ~ S4.4 | Mobile, Server, DB |
| 5 | 프로필 작성 | 5 | S5.1 ~ S5.5 | Mobile, Server, DB |
| 6 | 부모님 승인 → 검수 → 공개 | 3 | S6.1 ~ S6.3 | Mobile, Server, DB |
| 7 | 공개 중단 / 동의 철회 | 2 | S7.1 ~ S7.2 | Mobile, Server, DB |
| 8 | 추천 피드 | 3 | S8.1 ~ S8.3 | Mobile, Server |
| 9 | 추천 조건 | 3 | S9.1 ~ S9.3 | Mobile, Server |
| 10 | 상세 프로필 | 3 | S10.1 ~ S10.3 | Mobile, Server |
| 11 | 하트 / 넘기기 | 4 | S11.1 ~ S11.4 | Mobile, Server, DB |
| 12 | 신고 / 차단 | 3 | S12.1 ~ S12.3 | Mobile, Server, DB |
| 13 | 받은 하트 | 3 | S13.1 ~ S13.3 | Mobile, Server |
| 14 | 상호 하트 = 대화 연결 | 3 | S14.1 ~ S14.3 | Mobile, Server, DB |
| 15 | 자녀 간 메시지 | 4 | S15.1 ~ S15.4 | Mobile, Server |
| 16 | 인연 목록 (상태 추적) | 3 | S16.1 ~ S16.3 | Mobile, Server |
| 17 | 부모님 의사 확인 | 3 | S17.1 ~ S17.3 | Mobile, Server, DB |
| 18 | 만남 일정 (+ 미동행) | 5 | S18.1 ~ S18.5 | Mobile, Server, DB |
| 19 | 만남 확인 (양측) | 4 | S19.1 ~ S19.4 | Mobile, Server, DB |
| 20 | 만남 이후 비공개 응답 | 3 | S20.1 ~ S20.3 | Mobile, Server, DB |
| SEC | 개인정보 노출 방어 | 4 | SEC.1 ~ SEC.4 | Server, DB |
| E2E | 전체 관통 | 1 | E2E-01 | Mobile, Server, DB |
| | **합계** | **71** | | |

---

## Verification Checklist

### 1) Server E2E Checklist (`apps/server-e2e`)

**API 계약 / 응답**
- [ ] `GET /api` 200, `GET /api/health` 가 `{status:'ok', supabase:'ok'}` 반환
- [ ] 인증 없는 모든 보호 엔드포인트가 401
- [ ] `GET /api/discovery` 가 커서 페이지네이션 계약(`items`, `nextCursor`)을 지킨다
- [ ] `POST /api/hearts` 가 `{ mutual, connectionId? }` 를 반환하고 상호일 때만 `connectionId` 가 있다
- [ ] `POST /api/connections/:id/meeting/confirm` 이 `connectionStatus` 를 서버 판정값으로 반환한다

**상태 전이 / 예외**
- [ ] 프로필 status 전이: `draft → consent_pending → review → published`. 중간 단계를 건너뛴 요청은 409
- [ ] `POST /api/parent-profile/submit` 은 부모님 동의(`parent_consents.revoked_at IS NULL`)가 없으면 409
- [ ] 동의 철회 시 프로필이 즉시 `hidden` 이 되고 추천 결과에서 사라진다
- [ ] 만 50세 미만 생년월일은 422, 관계 목적 3개는 422, `undecided` + 다른 목적 동시 선택은 422
- [ ] 사진 6장째 업로드는 422, 10MB 초과는 413
- [ ] 중복 하트는 409, 자기 부모님 프로필에 하트는 422
- [ ] 상호 하트가 아닌 connection 에 메시지 전송은 403
- [ ] 양측 `parent_intents.intent='willing'` 이 아니면 `POST .../meeting` 은 409
- [ ] 만남 예정 시각 이전 `confirm` 은 409
- [ ] 한쪽만 confirm 이면 `connectionStatus='meeting_confirm_pending'`, 양쪽이면 `'matched'`
- [ ] 차단된 사용자 사이에서는 메시지 전송·프로필 조회가 403

**IDOR / 권한**
- [ ] 타인의 `connectionId` 로 메시지 목록 조회 시 403 (RLS 우회 아닌 서비스 레벨 차단)
- [ ] 타인의 `meetingId` 로 confirm 시 403
- [ ] 타인의 `meeting_feedbacks` 조회 경로가 **존재하지 않는다** (라우트 부재 확인)

**DB 정합성**
- [ ] `hearts` 에 `unique(sender_user_id, target_parent_profile_id)` 제약이 존재
- [ ] `meeting_confirmations` 에 `unique(meeting_id, user_id)` 제약이 존재
- [ ] `parent_profiles.user_id` 가 unique (자녀 1인 1프로필, TODO-07)

### 2) Mobile ADB Checklist (`apps/mobile-e2e/adb-tests`)

- [ ] **Step 1: 발견 — 등록 전 빈 상태**
  - [ ] S1.1: 빈 상태 카드와 등록 CTA 표시
  - [ ] S1.2: Empty — 3단계 안내 노출
  - [ ] S1.3: Error — 조회 실패 시 재시도
- [ ] **Step 2: 가입 자격 확인**
  - [ ] S2.1: 사별/이혼 선택 시 다음 단계 진입
  - [ ] S2.2: 별거 선택 시 진행 차단 안내
- [ ] **Step 3: 인증**
  - [ ] S3.1: 본인인증 완료 후 가족관계 단계 활성화
  - [ ] S3.2: 가족관계 제출 → 인증 완료 배지
  - [ ] S3.3: Error — 파일 크기 초과
  - [ ] S3.4: DB — `child_verifications` 기록
- [ ] **Step 4: 부모님 동의**
  - [ ] S4.1: 문자 발송 후 대기 상태
  - [ ] S4.2: 대면 동의 완료
  - [ ] S4.3: Error — 잘못된 번호
  - [ ] S4.4: DB — `parent_consents` 기록
- [ ] **Step 5: 프로필 작성**
  - [ ] S5.1: 6섹션 작성 완료 → 미리보기 진입
  - [ ] S5.2: 관계 목적 3번째 선택 차단
  - [ ] S5.3: `아직 잘 모르겠어요` 배타 선택
  - [ ] S5.4: 사진 최소 3장 · 최대 5장 / 대표 지정
  - [ ] S5.5: 임시저장 후 재진입 시 복원
- [ ] **Step 6: 승인 → 검수 → 공개**
  - [ ] S6.1: 미리보기에서 승인 → 검수 중 상태
  - [ ] S6.2: 검수 완료 후 공개 중 + 인증 배지 4종
  - [ ] S6.3: Error — 반려 사유 표시 + 재제출
- [ ] **Step 7: 공개 중단 / 철회**
  - [ ] S7.1: 공개 중단 확인 다이얼로그 → 비공개 전환
  - [ ] S7.2: 동의 철회 → 즉시 비공개
- [ ] **Step 8: 추천 피드**
  - [ ] S8.1: 카드 렌더 + 9개 항목 표시
  - [ ] S8.2: Empty — 추천 소진
  - [ ] S8.3: Error — 조회 실패
- [ ] **Step 9: 추천 조건**
  - [ ] S9.1: 반경 변경 후 적용
  - [ ] S9.2: 결과 0건 시 시트 유지 + `전국으로 넓히기`
  - [ ] S9.3: 미적용 상태로 닫기 시 확인
- [ ] **Step 10: 상세 프로필**
  - [ ] S10.1: 자녀 소개글이 최상단 콘텐츠
  - [ ] S10.2: 자녀 수·동거 가족이 상세에만 표시
  - [ ] S10.3: 비공개 전환된 프로필 진입 시 안내
- [ ] **Step 11: 하트 / 넘기기**
  - [ ] S11.1: 하트 전송 → 토스트 + 다음 카드
  - [ ] S11.2: 넘기기 → 재추천 제외
  - [ ] S11.3: Error — 중복 하트
  - [ ] S11.4: 버튼으로도 하트/넘기기 가능 (스와이프 전용 아님)
- [ ] **Step 12: 신고 / 차단**
  - [ ] S12.1: 신고 접수 → 목록에서 제거
  - [ ] S12.2: 차단 → 추천 제외
  - [ ] S12.3: 차단 해제
- [ ] **Step 13: 받은 하트**
  - [ ] S13.1: 미읽음/읽음 구성 차이
  - [ ] S13.2: Empty — 받은 관심 없음
  - [ ] S13.3: 인라인 하트로 상호 하트 진입
- [ ] **Step 14: 상호 하트 = 대화 연결**
  - [ ] S14.1: "서로 관심이 있어요" 시트 표시
  - [ ] S14.2: **'매칭 성공' 문구 부재 검증**
  - [ ] S14.3: 대화 시작 → 채팅방 진입
- [ ] **Step 15: 메시지**
  - [ ] S15.1: 메시지 전송/수신
  - [ ] S15.2: Empty — 첫 문장 칩
  - [ ] S15.3: Error — 전송 실패 후 재시도
  - [ ] S15.4: 안전 배너 1회 노출 후 접힘
- [ ] **Step 16: 인연 목록**
  - [ ] S16.1: 상태별 행 구성 차이
  - [ ] S16.2: 상태 필터 칩 동작
  - [ ] S16.3: Empty — 단계별 빈 상태
- [ ] **Step 17: 부모님 의사 확인**
  - [ ] S17.1: 동의 선택 → 대기 상태
  - [ ] S17.2: 거절 선택 → 확인 후 인연 종료
  - [ ] S17.3: 양측 동의 → 만남 일정 활성화
- [ ] **Step 18: 만남 일정**
  - [ ] S18.1: 일정 제안 → 상대 수락 → 만남 예정
  - [ ] S18.2: Error — 지난 날짜 / 장소 미입력
  - [ ] S18.3: 미동행 선택 → 사유 + 체크 3개 강제
  - [ ] S18.4: 체크 미완료 시 진행 버튼 비활성
  - [ ] S18.5: 일정 카드에 '자녀 미동행' 표기
- [ ] **Step 19: 만남 확인**
  - [ ] S19.1: 만남 시각 이전 버튼 비활성 + 사유 문구
  - [ ] S19.2: 한쪽 확인 → "상대방의 만남 확인을 기다리고 있어요"
  - [ ] S19.3: 양쪽 확인 → "최종 매칭 성공"
  - [ ] S19.4: DB — `meeting_confirmations` 2건, `connections.status='matched'`
- [ ] **Step 20: 사후 응답**
  - [ ] S20.1: 4지선다 저장
  - [ ] S20.2: 건너뛰기
  - [ ] S20.3: 비공개 고지 표시 + 상대 화면에 미노출
- [ ] **E2E: 전체 관통 테스트**
  - [ ] E2E-01: 등록 → 공개 → 하트 → 대화 → 만남 → 최종 매칭

### 3) Post-deploy ADB Smoke Checklist

- [ ] 앱 실행 후 스플래시를 지나 첫 화면 렌더 (검은 화면 아님 — `uiautomator dump` 에 텍스트 존재)
- [ ] 로그인 화면 진입 및 데모 계정 로그인 성공
- [ ] 홈 탭: 추천 피드 또는 등록 빈 상태 중 하나가 렌더
- [ ] 관심 탭 진입 → 목록 또는 빈 상태 렌더
- [ ] 인연 탭 진입 → 목록 또는 빈 상태 렌더
- [ ] 내 정보 탭 진입 → 부모님 카드 + 안전 섹션 렌더
- [ ] 내 정보 → 개인정보 처리방침(WebView) 진입 및 본문 렌더
- [ ] 내 정보 → 안전 가이드(WebView) 진입 및 본문 렌더
- [ ] logcat 에 `FATAL EXCEPTION` / `AndroidRuntime` 없음
- [ ] logcat 에 `UnableToResolve` 없음 (Metro 엔트리 해석 실패 회귀 감시)
- [ ] 화면 텍스트 어디에도 `매칭 성공` 이 상호 하트 단계에서 등장하지 않음

---

## Scenarios

### Step 1: 발견 — 등록 전 빈 상태

> Depends: 로그인 완료
> 관련 화면: 홈(추천 피드) `app/(tabs)/home/index.tsx`
> 관련 와이어프레임: `wireframe-home.md` → Empty State — 부모님 프로필 미등록

#### S1.1: Happy Path — 등록 CTA 노출

```gherkin
Scenario: 부모님을 등록하지 않은 자녀가 홈에 들어간다
  Given 로그인한 자녀에게 등록된 부모님 프로필이 없다
  When 사용자가 앱을 실행하고 홈 탭에 머문다
  Then 화면에서 다음을 확인한다:
    - "아직 등록된 부모님이 없어요" 텍스트 표시
    - "부모님 등록하기" 버튼 표시
    - 추천 카드가 표시되지 않음
  [검증: uiautomator dump → 텍스트 매칭]
```
**검증:** 이 상태에서 `GET /api/discovery` 가 **호출되지 않는다** (logcat 네트워크 로그 또는 서버 e2e 로 확인)

#### S1.2: Empty State — 3단계 안내

```gherkin
Scenario: 등록 전 사용자에게 전체 절차를 미리 알린다
  Given S1.1 화면 상태이다
  When 사용자가 화면을 아래로 스크롤한다
  Then 화면에서 다음을 확인한다:
    - "이렇게 진행돼요" 텍스트 표시
    - "자녀 본인인증과 가족관계 인증" 텍스트 표시
    - "부모님께 동의를 받아요" 텍스트 표시
    - "프로필을 등록하고 공개해요" 텍스트 표시
```

#### S1.3: Error State — 상태 조회 실패

```gherkin
Scenario: 프로필 상태 조회가 실패한다
  Given 서버가 /api/parent-profile 에 500 을 반환한다
  When 사용자가 홈 탭에 진입한다
  Then 화면에서 다음을 확인한다:
    - "정보를 불러오지 못했어요. 다시 시도해주세요." 텍스트 표시
    - "다시 시도" 버튼 표시
  [검증: 실패 시 스크린샷]
```

---

### Step 2: 가입 자격 확인 (혼인 상태)

> Depends: Step 1
> 관련 화면: `app/(parent-setup)/onboarding.tsx`
> 관련 와이어프레임: `wireframe-modals.md` → 5. 등록 안내

#### S2.1: Happy Path — 사별/이혼 선택

```gherkin
Scenario: 자격이 되는 자녀가 다음 단계로 넘어간다
  Given 사용자가 등록 안내 3장을 모두 넘겼다
  When 사용자가 "사별" 을 선택하고 "다음" 을 탭한다
  Then 화면에서 다음을 확인한다:
    - "본인 확인이 필요해요" 텍스트 표시
    - "휴대폰 본인인증" 텍스트 표시
```

#### S2.2: Error State — 별거 선택 시 차단

```gherkin
Scenario: 별거 상태는 등록할 수 없다
  Given 사용자가 혼인 상태 선택 화면에 있다
  When 사용자가 "별거 또는 그 외" 를 선택하고 "다음" 을 탭한다
  Then 화면에서 다음을 확인한다:
    - "법적으로 혼인 관계가 유지 중인 경우에는 등록할 수 없어요." 텍스트 표시
    - "돌아가기" 버튼 표시
    - 인증 화면으로 넘어가지 않음
```

---

### Step 3: 자녀 인증 + 가족관계 인증

> Depends: Step 2
> 관련 화면: `app/(parent-setup)/verification.tsx`

#### S3.1: Happy Path — 본인인증 완료

```gherkin
Scenario: 휴대폰 본인인증을 마치면 다음 항목이 열린다
  Given 사용자가 인증 센터 화면에 있다
  When 사용자가 "인증하기" 를 탭하고 본인인증을 완료한다
  Then 화면에서 다음을 확인한다:
    - "휴대폰 본인인증" 항목에 "완료" 표시
    - "가족관계 인증" 항목이 활성화됨
    - "가족관계증명서 올리기" 영역 표시
```

#### S3.2: Happy Path — 가족관계 제출

```gherkin
Scenario: 증명서를 올리면 인증이 완료된다 (MVP 자동 승인)
  Given 본인인증이 완료된 상태이다
  When 사용자가 증명서 이미지를 선택하고 "제출하기" 를 탭한다
  Then 화면에서 다음을 확인한다:
    - "가족관계 인증 완료" 텍스트 표시
    - 다음 단계 "부모님께 동의를 받아주세요" 로 이동
```

#### S3.3: Error State — 파일 크기 초과

```gherkin
Scenario: 10MB 를 넘는 이미지는 거부된다
  Given 사용자가 가족관계 인증 단계에 있다
  When 사용자가 12MB 이미지를 선택한다
  Then 화면에서 다음을 확인한다:
    - "이미지는 10MB 이하만 가능합니다" 텍스트가 업로드 영역 바로 아래 표시
    - 제출 버튼이 비활성 상태
```

#### S3.4: DB 확인 — 인증 기록과 원문 비노출

```gherkin
Scenario: 인증 결과가 저장되고 원문 경로는 노출되지 않는다
  Given S3.2 가 완료된 상태이다
  When Supabase 에서 child_verifications 테이블을 조회한다
  Then 다음 데이터가 존재한다:
    | Column             | Expected      |
    | phone_verified_at  | NOT NULL      |
    | family_doc_status  | approved      |
    | family_verified_at | NOT NULL      |
  And GET /api/me/verification 응답에 family_doc_path 가 포함되지 않는다
  [검증: Supabase MCP + 서버 e2e]
```

---

### Step 4: 부모님 동의

> Depends: Step 3
> 관련 화면: `app/(parent-setup)/consent.tsx`

#### S4.1: Happy Path — 문자 동의 요청

```gherkin
Scenario: 부모님 휴대폰으로 동의 문자를 보낸다
  Given 사용자가 부모님 동의 화면에 있다
  When 사용자가 부모님 성함 "김철수" 와 번호 "010-1234-5678" 을 입력하고
       "동의 문자 보내기" 를 탭한다
  Then 화면에서 다음을 확인한다:
    - "부모님의 동의를 기다리고 있어요" 텍스트 표시
    - "다시 보내기" 버튼이 3분 타이머와 함께 비활성 상태로 표시
```

#### S4.2: Happy Path — 대면 동의 (TODO-04)

```gherkin
Scenario: 휴대폰이 없는 부모님과 대면으로 동의한다
  Given 사용자가 부모님 동의 화면에 있다
  When 사용자가 "부모님과 함께 이 화면에서 동의" 를 탭하고
       성함 "김철수" 입력 후 "위 내용을 확인하고 동의합니다" 를 체크하고
       "동의 완료" 를 탭한다
  Then 화면에서 다음을 확인한다:
    - "실명은 공개되지 않고 별명으로 표시됩니다" 문구가 동의 본문에 있었음
    - 프로필 작성 단계로 이동
```

#### S4.3: Error State — 잘못된 번호

```gherkin
Scenario: 유효하지 않은 번호로는 보낼 수 없다
  Given 사용자가 문자 동의 폼에 있다
  When 사용자가 번호에 "010-1234" 를 입력하고 발송을 시도한다
  Then 화면에서 다음을 확인한다:
    - "문자를 보내지 못했어요. 번호를 다시 확인해주세요." 텍스트가 필드 아래 표시
```

#### S4.4: DB 확인 — 동의 기록

```gherkin
Scenario: 동의 방식과 시각이 기록된다
  Given S4.2 가 완료된 상태이다
  When Supabase 에서 parent_consents 테이블을 조회한다
  Then 다음 데이터가 존재한다:
    | Column       | Expected   |
    | method       | in_person  |
    | parent_name  | 김철수      |
    | consented_at | NOT NULL   |
    | revoked_at   | NULL       |
```

---

### Step 5: 프로필 작성

> Depends: Step 4
> 관련 화면: `app/(parent-setup)/profile-edit.tsx`

#### S5.1: Happy Path — 6섹션 작성 완료

```gherkin
Scenario: 모든 섹션을 채우고 미리보기로 넘어간다
  Given 사용자가 프로필 작성 1/6 섹션에 있다
  When 사용자가 기본정보·사진·혼인가족·종교생활·관계목적·소개글을 차례로 입력한다
  Then 화면에서 다음을 확인한다:
    - 각 섹션 이동 시 "임시저장됨" 표시
    - 마지막 섹션에서 "미리보기로 이동" 버튼 표시
```

#### S5.2: Error State — 관계 목적 3개 선택 차단

```gherkin
Scenario: 관계 목적은 최대 2개다
  Given 사용자가 관계 목적 섹션에서 2개를 선택했다
  When 사용자가 세 번째 항목을 탭한다
  Then 화면에서 다음을 확인한다:
    - 세 번째 항목이 선택되지 않음 (비활성 상태)
    - "관계 목적은 최대 2개까지 선택할 수 있어요" 안내 표시
```

#### S5.3: Error State — '아직 잘 모르겠어요' 배타 선택

```gherkin
Scenario: '아직 잘 모르겠어요'는 단독으로만 고를 수 있다
  Given 사용자가 "재혼 고려" 를 선택한 상태이다
  When 사용자가 "아직 잘 모르겠어요" 를 탭한다
  Then 화면에서 다음을 확인한다:
    - "'아직 잘 모르겠어요'는 다른 항목과 함께 선택할 수 없어요" 안내 표시
    - 두 항목이 동시에 선택되지 않음
```

#### S5.4: Happy Path — 사진 최소 3장 · 최대 5장 / 대표 지정

```gherkin
Scenario: 사진은 최소 3장 최대 5장, 대표는 1장이다
  Given 사진을 2장만 올린 상태이다
  Then "사진을 최소 3장 등록해주세요 (현재 2장)" 안내가 보이고 저장이 막힌다
  # 서버도 같은 조건으로 막는다 — GET /api/parent-profile 의 missing 에 photos 가 남는다
  Given 사용자가 사진 섹션에 있다
  When 사용자가 사진 5장을 올리고 두 번째 사진을 대표로 지정한 뒤 6번째를 시도한다
  Then 화면에서 다음을 확인한다:
    - 두 번째 사진에 "대표" 배지 표시
    - "사진은 최대 5장까지 올릴 수 있어요" 안내 표시
```

#### S5.5: Happy Path — 임시저장 복원

```gherkin
Scenario: 나갔다 들어와도 작성 내용이 남는다
  Given 사용자가 3/6 섹션까지 입력했다
  When 사용자가 뒤로가기로 플로우를 나갔다가 다시 "부모님 등록하기" 로 진입한다
  Then 화면에서 다음을 확인한다:
    - 이전에 입력한 성함·생년월일·지역 값이 그대로 표시
    - 진행 위치가 3/6 섹션으로 복원
```

---

### Step 6: 부모님 승인 → 검수 → 공개

> Depends: Step 5
> 관련 화면: `app/(parent-setup)/preview.tsx`, `app/(tabs)/profile/parent.tsx`

#### S6.1: Happy Path — 승인 후 검수 대기

```gherkin
Scenario: 부모님 승인을 받으면 검수로 넘어간다
  Given 사용자가 미리보기 화면에 있다
  When 사용자가 "부모님이 승인하셨어요" 를 탭한다
  Then 화면에서 다음을 확인한다:
    - "검수 중" 상태 배지 표시
    - "운영팀이 프로필을 확인하고 있어요" 텍스트 표시
    - 화면이 부모님 프로필 상태로 이동
```

#### S6.2: Happy Path — 공개 전환

```gherkin
Scenario: 검수를 통과하면 공개된다
  Given 프로필이 검수를 통과했다
  When 사용자가 부모님 프로필 상태 화면을 연다
  Then 화면에서 다음을 확인한다:
    - "공개 중" 상태 배지 표시
    - "자녀 본인인증", "가족관계 인증", "부모님 등록 동의", "프로필 검수" 4개 항목이 모두 "완료"
```

#### S6.3: Error State — 반려

```gherkin
Scenario: 반려되면 사유와 재제출 경로를 준다
  Given 프로필이 "사진에 얼굴이 보이지 않습니다" 사유로 반려되었다
  When 사용자가 부모님 프로필 상태 화면을 연다
  Then 화면에서 다음을 확인한다:
    - "반려됨" 상태 배지 표시
    - "사진에 얼굴이 보이지 않습니다." 텍스트 표시
    - "수정하고 다시 제출" 버튼 표시
```

---

### Step 7: 공개 중단 / 동의 철회

> Depends: Step 6
> 관련 화면: `app/(tabs)/profile/parent.tsx`

#### S7.1: Happy Path — 공개 중단

```gherkin
Scenario: 자녀가 프로필 공개를 중단한다
  Given 프로필이 "공개 중" 상태이다
  When 사용자가 "프로필 공개 중단" 을 탭하고 확인 다이얼로그에서 "공개 중단" 을 탭한다
  Then 화면에서 다음을 확인한다:
    - 확인 다이얼로그에 "받은 하트와 대화는 그대로 유지됩니다" 문구가 있었음
    - "프로필을 비공개로 전환했어요" 토스트 표시
    - 상태 배지가 "비공개" 로 변경
```

#### S7.2: Happy Path — 동의 철회 시 즉시 비공개

```gherkin
Scenario: 부모님이 동의를 철회하면 즉시 비공개가 된다
  Given 프로필이 "공개 중" 상태이다
  When 사용자가 동의 섹션에서 "철회 요청" 을 탭하고 확인한다
  Then 화면에서 상태 배지가 "비공개" 로 변경되고
  And 다른 사용자의 추천 피드에서 해당 프로필이 즉시 사라진다
  [검증: 상대 계정으로 GET /api/discovery 재조회]
```

---

### Step 8: 추천 피드

> Depends: Step 6 (공개 상태)
> 관련 화면: `app/(tabs)/home/index.tsx`
> 관련 와이어프레임: `wireframe-home.md` → 1. 추천 피드

#### S8.1: Happy Path — 카드 렌더

```gherkin
Scenario: 조건에 맞는 프로필이 카드로 나온다
  Given 사용자의 부모님 프로필이 공개 중이고 조건에 맞는 상대가 3명 있다
  When 사용자가 홈 탭에 진입한다
  Then 화면에서 다음을 확인한다:
    - 별명(예: "텃밭지기") 과 나이 표시
    - "서울 송파구" 형태의 시·군·구 지역 표시
    - 관계 목적 칩이 2개 이하로 표시
    - 인증 배지 표시
    - "하트", "자세히", "넘기기" 버튼 표시
  And 화면에 실제 성명 전체("김철수")가 표시되지 않는다
```

#### S8.2: Empty State — 추천 소진

```gherkin
Scenario: 볼 카드를 다 넘겼다
  Given 추천 후보를 모두 소비했다
  When 사용자가 마지막 카드를 넘긴다
  Then 화면에서 다음을 확인한다:
    - "오늘 추천을 모두 확인했어요" 텍스트 표시
    - "조건 변경하기" 버튼 표시
    - 반경이 전국이 아니면 "전국으로 넓히기" 버튼 표시
```

#### S8.3: Error State — 조회 실패

```gherkin
Scenario: 추천 조회가 실패한다
  Given 서버가 /api/discovery 에 500 을 반환한다
  When 사용자가 홈 탭에 진입한다
  Then 화면에서 다음을 확인한다:
    - "추천을 불러오지 못했어요. 다시 시도해주세요." 텍스트 표시
    - "다시 시도" 버튼 표시
```

---

### Step 9: 추천 조건

> Depends: Step 8
> 관련 화면: `app/(tabs)/home/filters.tsx`

#### S9.1: Happy Path — 반경 변경

```gherkin
Scenario: 추천 거리를 바꾸면 결과가 갱신된다
  Given 사용자가 홈에서 필터 아이콘을 탭해 조건 시트를 열었다
  When 사용자가 "50km" 를 선택하고 "적용하기" 를 탭한다
  Then 화면에서 다음을 확인한다:
    - 시트가 닫힘
    - 상단 조건 칩에 "50km" 표시
    - 추천 카드가 다시 로드됨
```

#### S9.2: Empty State — 조건 결과 0건

```gherkin
Scenario: 너무 좁힌 조건은 시트 안에서 알려준다
  Given 사용자가 조건 시트에서 결과가 0건이 되는 조건을 골랐다
  When 사용자가 "적용하기" 를 탭한다
  Then 화면에서 다음을 확인한다:
    - 시트가 닫히지 않음
    - "이 조건에 맞는 분이 없어요. 거리를 넓혀볼까요?" 텍스트 표시
    - "전국으로 넓히기" 버튼 표시
```

#### S9.3: Happy Path — 미적용 상태로 닫기

```gherkin
Scenario: 변경 후 적용하지 않고 닫으려 하면 확인한다
  Given 사용자가 조건을 변경했지만 적용하지 않았다
  When 사용자가 시트를 아래로 스와이프해 닫으려 한다
  Then 화면에서 "변경한 조건을 적용하지 않고 닫을까요?" 확인이 표시된다
```

---

### Step 10: 상세 프로필

> Depends: Step 8
> 관련 화면: `app/profile/[id].tsx`

#### S10.1: Happy Path — 자녀 소개글이 최상단

```gherkin
Scenario: 상세에서 가장 먼저 읽히는 것은 자녀의 소개글이다
  Given 사용자가 추천 카드에서 "자세히" 를 탭했다
  When 상세 화면이 열린다
  Then 화면에서 다음을 확인한다:
    - "딸이 소개하는 우리 아버지" 또는 "아들이 소개하는 우리 어머니" 형태의 제목 표시
    - 소개글 전문이 말줄임 없이 표시
    - 인증 배지 4종 표시
```

#### S10.2: Happy Path — 가족정보는 상세에만

```gherkin
Scenario: 자녀 수와 동거 가족은 상세에서만 보인다
  Given 사용자가 상세 화면에 있다
  When 사용자가 화면을 아래로 스크롤한다
  Then 화면에서 다음을 확인한다:
    - "가족" 섹션에 자녀 수와 동거 가족 표시
  And 추천 카드 화면과 조건 시트에는 자녀 수·동거 가족 항목이 없다
```

#### S10.3: Error State — 비공개 전환된 프로필

```gherkin
Scenario: 보는 사이 상대가 공개를 중단했다
  Given 상대가 프로필 공개를 중단했다
  When 사용자가 해당 프로필 상세를 연다
  Then 화면에서 다음을 확인한다:
    - "이 프로필은 현재 공개되지 않았어요" 텍스트 표시
    - "목록으로" 버튼 표시
```

---

### Step 11: 하트 / 넘기기

> Depends: Step 8

#### S11.1: Happy Path — 하트 전송

```gherkin
Scenario: 관심을 보낸다
  Given 사용자가 추천 카드를 보고 있다
  When 사용자가 "하트" 버튼을 탭한다
  Then 화면에서 다음을 확인한다:
    - "관심을 보냈어요" 토스트 표시
    - 다음 카드로 전환
```

#### S11.2: Happy Path — 넘긴 프로필은 다시 안 나온다

```gherkin
Scenario: 넘긴 프로필은 재추천에서 제외된다
  Given 사용자가 특정 프로필을 "넘기기" 했다
  When 사용자가 앱을 재실행하고 홈 탭에 진입한다
  Then 넘긴 프로필이 카드 스택에 나타나지 않는다
  [검증: uiautomator dump 에서 해당 별명 부재]
```

#### S11.3: Error State — 중복 하트

```gherkin
Scenario: 이미 하트를 보낸 상대에게 다시 보낼 수 없다
  Given 사용자가 이미 하트를 보낸 프로필이 있다
  When 클라이언트가 같은 프로필에 하트를 재전송한다
  Then 서버가 409 를 반환하고
  And 화면에 "이미 관심을 보낸 분이에요" 안내가 표시된다
```

#### S11.4: Happy Path — 버튼으로도 조작 가능 (접근성)

```gherkin
Scenario: 스와이프 없이 버튼만으로 하트/넘기기가 된다
  Given 사용자가 추천 카드를 보고 있다
  When 사용자가 스와이프를 전혀 사용하지 않고 하단 버튼만 탭한다
  Then 하트와 넘기기가 정상 동작한다
  [검증: adb shell input tap 만 사용, swipe 미사용]
```

---

### Step 12: 신고 / 차단

> Depends: Step 8

#### S12.1: Happy Path — 신고 접수

```gherkin
Scenario: 부적절한 프로필을 신고한다
  Given 사용자가 상세 화면의 ⋯ 메뉴를 열었다
  When 사용자가 "신고" → "금전 요구" 선택 후 "신고하기" 를 탭한다
  Then 화면에서 다음을 확인한다:
    - "신고를 접수했어요. 확인 후 조치해드릴게요." 토스트 표시
    - 해당 프로필이 추천 목록에서 사라짐
```

#### S12.2: Happy Path — 차단

```gherkin
Scenario: 차단하면 양방향으로 보이지 않는다
  Given 사용자가 상대를 차단했다
  When 사용자와 상대가 각각 홈 탭을 새로고침한다
  Then 양쪽 추천 목록에서 서로가 보이지 않는다
  And 화면에 "차단했어요. 이 분의 프로필은 더 이상 보이지 않아요." 토스트가 표시되었다
```

#### S12.3: Happy Path — 차단 해제

```gherkin
Scenario: 차단을 해제한다
  Given 차단 목록에 1명이 있다
  When 사용자가 내 정보 → "차단한 사용자" 에서 "해제" 를 탭한다
  Then 목록에서 해당 항목이 사라지고 실행 취소가 가능한 토스트가 표시된다
```

---

### Step 13: 받은 하트

> Depends: Step 6 (공개 상태)
> 관련 화면: `app/(tabs)/hearts/index.tsx`

#### S13.1: Happy Path — 미읽음/읽음 구분

```gherkin
Scenario: 새로 받은 관심과 이전 관심을 구분해 보여준다
  Given 새로 받은 하트 2건과 이미 확인한 하트 1건이 있다
  When 사용자가 관심 탭에 진입한다
  Then 화면에서 다음을 확인한다:
    - "새로 받은 관심" 섹션 헤더 표시
    - "이전에 받은 관심" 섹션 헤더 표시
    - 새 항목에는 인라인 "하트"/"넘기기" 버튼이 있음
```

#### S13.2: Empty State

```gherkin
Scenario: 받은 관심이 없다
  Given 받은 하트가 0건이다
  When 사용자가 관심 탭에 진입한다
  Then 화면에서 다음을 확인한다:
    - "아직 받은 관심이 없어요" 텍스트 표시
    - "프로필 상태 보기" 버튼 표시
```

#### S13.3: Happy Path — 인라인 하트

```gherkin
Scenario: 목록에서 바로 하트를 되돌려준다
  Given 받은 하트 목록에 1건이 있다
  When 사용자가 그 행의 "하트" 버튼을 탭한다
  Then 상호 하트 시트가 표시된다
```

---

### Step 14: 상호 하트 = 대화 연결

> Depends: Step 13
> 관련 화면: `app/matched/[id].tsx`

#### S14.1: Happy Path — 시트 표시

```gherkin
Scenario: 양측이 서로 하트를 보내면 대화가 열린다
  Given 상대가 먼저 우리 부모님께 하트를 보냈다
  When 사용자가 그 상대에게 하트를 보낸다
  Then 화면에서 다음을 확인한다:
    - "서로 관심이 있어요" 텍스트 표시
    - "대화 시작하기" 버튼 표시
    - 양측 부모님 사진 2장 표시
```

#### S14.2: 금지 문구 검증 — '매칭 성공' 부재

```gherkin
Scenario: 상호 하트 단계에서 '매칭 성공'이라는 표현을 쓰지 않는다
  Given S14.1 시트가 표시된 상태이다
  When uiautomator dump 로 화면 텍스트를 수집한다
  Then 수집된 텍스트에 "매칭 성공" 이 포함되지 않는다
  And 같은 시점의 알림 목록 텍스트에도 "매칭 성공" 이 포함되지 않는다
  [검증: dump XML 전체 grep — 실패 시 즉시 결함]
```

#### S14.3: DB 확인 — Connection 생성

```gherkin
Scenario: 상호 하트 시점에 대화방이 만들어진다
  Given S14.1 이 완료된 상태이다
  When Supabase 에서 connections 와 conversations 를 조회한다
  Then 다음 데이터가 존재한다:
    | Table         | Expected                    |
    | connections   | status = mutual_heart       |
    | conversations | connection_id = 위 connection |
```

---

### Step 15: 자녀 간 메시지

> Depends: Step 14
> 관련 화면: `app/(tabs)/connections/[id]/index.tsx`

#### S15.1: Happy Path — 송수신

```gherkin
Scenario: 자녀끼리 메시지를 주고받는다
  Given 사용자가 채팅방에 진입했다
  When 사용자가 "안녕하세요. 아버지 소개 잘 봤습니다" 를 입력하고 전송한다
  Then 화면에서 다음을 확인한다:
    - 우측 정렬 말풍선에 입력한 텍스트 표시
    - 전송 완료 표시
    - 상단에 상대 부모님 요약 바가 계속 보임
```

#### S15.2: Empty State — 첫 문장 칩

```gherkin
Scenario: 대화가 비어 있으면 첫 문장을 제안한다
  Given 대화 이력이 없는 채팅방에 진입했다
  When 화면이 렌더된다
  Then 화면에서 다음을 확인한다:
    - "대화를 시작해보세요" 텍스트 표시
    - "어머니 사진 잘 봤습니다" 칩 표시
  When 사용자가 칩을 탭한다
  Then 입력창에 해당 문구가 채워지고 자동 전송되지 않는다
```

#### S15.3: Error State — 전송 실패

```gherkin
Scenario: 네트워크가 끊긴 상태에서 전송한다
  Given 기기가 비행기 모드이다
  When 사용자가 메시지를 전송한다
  Then 화면에서 다음을 확인한다:
    - 해당 말풍선 옆에 "다시 시도" 표시
    - 메시지가 사라지지 않음
```

#### S15.4: Happy Path — 안전 배너 1회 노출

```gherkin
Scenario: 안전 안내는 처음 한 번만 크게 보인다
  Given 사용자가 채팅방에 처음 진입한다
  Then "전화번호 등 연락처는 충분히 확인한 뒤 공유해주세요." 텍스트가 표시된다
  When 사용자가 배너를 닫고 채팅방을 나갔다가 다시 들어온다
  Then 배너가 펼쳐진 상태로 표시되지 않는다
```

---

### Step 16: 인연 목록 (상태 추적)

> Depends: Step 14
> 관련 화면: `app/(tabs)/connections/index.tsx`

#### S16.1: Happy Path — 상태별 행 구성

```gherkin
Scenario: 상태에 따라 행의 모양이 다르다
  Given 인연이 "서로 관심이 있어요", "대화 중이에요", "만남을 준비하고 있어요" 3건 있다
  When 사용자가 인연 탭에 진입한다
  Then 화면에서 다음을 확인한다:
    - 각 행 상단에 상태 문구가 표시
    - "서로 관심이 있어요" 행에는 "대화 시작하기" 버튼이 있음
    - "대화 중이에요" 행에는 마지막 메시지가 한 줄로 표시
```

#### S16.2: Happy Path — 상태 필터

```gherkin
Scenario: 상태 칩으로 걸러 본다
  Given 인연 목록에 여러 상태가 섞여 있다
  When 사용자가 "대화 중" 칩을 탭한다
  Then 대화 중 상태의 항목만 표시된다
```

#### S16.3: Empty State — 단계별 빈 상태

```gherkin
Scenario: 해당 단계에 인연이 없다
  Given "만남 예정" 상태의 인연이 0건이다
  When 사용자가 "만남 예정" 칩을 탭한다
  Then "아직 이 단계의 인연이 없어요" 텍스트와 "전체 보기" 버튼이 표시된다
```

---

### Step 17: 부모님 의사 확인

> Depends: Step 15
> 관련 화면: `app/(tabs)/connections/[id]/parent-intent.tsx`

#### S17.1: Happy Path — 동의 기록

```gherkin
Scenario: 부모님이 만나보고 싶어 하신다
  Given 사용자가 채팅방에서 "부모님 의사 확인" 을 탭했다
  When 사용자가 "만나보고 싶다고 하세요" 를 선택하고 "부모님 의사 전달하기" 를 탭한다
  Then 화면에서 다음을 확인한다:
    - "부모님 의사를 전달했어요" 토스트 표시
    - "상대방의 부모님 의사를 기다리고 있어요" 텍스트 표시
```

#### S17.2: Happy Path — 거절 시 인연 종료

```gherkin
Scenario: 부모님이 원하지 않으신다
  Given 사용자가 의사 확인 시트에 있다
  When 사용자가 "이번엔 어렵다고 하세요" 를 선택하고 제출한다
  Then 확인 다이얼로그가 표시되고
  When 사용자가 확인한다
  Then 해당 인연이 목록에서 종료 상태로 바뀌고
  And 상대 화면에는 거절 사유가 표시되지 않는다
```

#### S17.3: Happy Path — 양측 동의 시 만남 활성화

```gherkin
Scenario: 양쪽 모두 동의하면 일정 단계가 열린다
  Given 양측 자녀가 모두 "만나보고 싶다" 로 응답했다
  When 사용자가 채팅방을 연다
  Then 화면에서 "만남 일정" 버튼이 활성 상태로 표시된다
```

---

### Step 18: 만남 일정 (+ 미동행)

> Depends: Step 17
> 관련 화면: `app/(tabs)/connections/[id]/meeting.tsx`, `meeting-solo.tsx`

#### S18.1: Happy Path — 제안 후 수락

```gherkin
Scenario: 일정을 제안하고 상대가 수락한다
  Given 사용자가 만남 일정 화면에 있다
  When 사용자가 날짜/시간과 장소 "성남시 분당구 정자동 ○○카페" 를 입력하고
       "만남 일정 제안하기" 를 탭한다
  Then "만남 일정을 제안했어요" 토스트가 표시되고
  When 상대가 수락한다
  Then 양측 화면에 D-day 와 "9월 3일 (수) 오후 2:00" 이 표시된다
```

#### S18.2: Error State — 입력 검증

```gherkin
Scenario: 지난 날짜와 빈 장소는 거부된다
  Given 사용자가 만남 일정 폼에 있다
  When 사용자가 어제 날짜를 선택하고 장소를 비운 채 제안한다
  Then 화면에서 다음을 확인한다:
    - "지난 날짜는 선택할 수 없어요" 텍스트가 날짜 필드 아래 표시
    - "만남 장소를 입력해주세요" 텍스트가 장소 필드 아래 표시
```

#### S18.3: Happy Path — 미동행 확인 절차 (TODO-03/14)

```gherkin
Scenario: 자녀가 동행하지 않으면 추가 확인을 거친다
  Given 사용자가 만남 일정 폼에서 "저도 함께 갑니다" 체크를 해제한다
  Then 확인 시트가 열리고 화면에서 다음을 확인한다:
    - "첫 만남은 자녀 동행을 강력히 권해드려요" 텍스트 표시
    - "동행이 어려운 이유" 입력 필드 표시
    - 안전수칙 체크박스 3개 표시
```

#### S18.4: Error State — 체크 미완료 시 진행 불가

```gherkin
Scenario: 사유와 확인 없이는 진행할 수 없다
  Given 미동행 확인 시트가 열려 있다
  When 사용자가 사유를 비우고 체크를 1개만 한 상태에서 진행을 시도한다
  Then 화면에서 다음을 확인한다:
    - "이해했고 진행할게요" 버튼이 비활성 상태
    - "미동행 사유를 입력해주세요" 안내 표시
```

#### S18.5: Happy Path — 미동행 표기 공유

```gherkin
Scenario: 미동행 사실이 양측에 표시된다
  Given 사용자가 미동행 확인을 완료했다
  When 양측이 만남 일정 화면을 연다
  Then 양측 화면 모두에 "자녀 미동행" 표기가 보인다
```

---

### Step 19: 만남 확인 (양측)

> Depends: Step 18
> 관련 화면: `app/(tabs)/connections/[id]/meeting-confirm.tsx`

#### S19.1: Error State — 만남 전 확인 불가

```gherkin
Scenario: 만남 시각 전에는 확인할 수 없다
  Given 만남 예정 시각이 아직 지나지 않았다
  When 사용자가 만남 일정 화면을 연다
  Then 화면에서 다음을 확인한다:
    - "부모님끼리 만났어요" 버튼이 비활성 상태
    - "만남 시각 이후에 확인할 수 있어요" 텍스트 표시
```

#### S19.2: Happy Path — 한쪽 확인

```gherkin
Scenario: 내가 먼저 확인하면 상대를 기다린다
  Given 만남 예정 시각이 지났다
  When 사용자가 "부모님끼리 만났어요" 를 탭한다
  Then 화면에서 다음을 확인한다:
    - "상대방의 만남 확인을 기다리고 있어요" 텍스트 표시
    - "최종 매칭 성공" 텍스트가 표시되지 않음
  [검증: dump XML 에 "최종 매칭 성공" 부재]
```

#### S19.3: Happy Path — 양쪽 확인 → 최종 매칭

```gherkin
Scenario: 양측이 확인하면 최종 매칭이 된다
  Given 상대가 이미 만남을 확인했다
  When 사용자가 "부모님끼리 만났어요" 를 탭한다
  Then 화면에서 다음을 확인한다:
    - "최종 매칭 성공" 텍스트 표시
    - "대화방은 90일간 유지돼요" 텍스트 표시
    - 별점·점수 형태의 평가 요소가 표시되지 않음
```

#### S19.4: DB 확인 — 확인 2건과 상태 전이

```gherkin
Scenario: 서버가 양측 확인을 근거로 상태를 전이한다
  Given S19.3 이 완료된 상태이다
  When Supabase 에서 meeting_confirmations 와 connections 를 조회한다
  Then 다음 데이터가 존재한다:
    | Table                  | Expected                        |
    | meeting_confirmations  | 해당 meeting_id 로 2건            |
    | connections            | status = matched                |
  And 한쪽 confirm 만 있는 다른 meeting 의 connection 은 status 가 matched 가 아니다
```

---

### Step 20: 만남 이후 비공개 응답

> Depends: Step 19
> 관련 화면: `app/(tabs)/connections/[id]/feedback.tsx`

#### S20.1: Happy Path — 응답 저장

```gherkin
Scenario: 만남 이후 의향을 남긴다
  Given 최종 매칭 직후 응답 시트가 열렸다
  When 사용자가 "인연을 계속 이어가고 싶어요" 를 선택하고 "보내기" 를 탭한다
  Then 시트가 닫히고 별도의 축하·평가 화면이 표시되지 않는다
```

#### S20.2: Happy Path — 건너뛰기

```gherkin
Scenario: 응답하지 않아도 된다
  Given 응답 시트가 열려 있다
  When 사용자가 "건너뛰기" 를 탭한다
  Then 시트가 닫히고 인연 목록으로 돌아간다
```

#### S20.3: 비공개 검증

```gherkin
Scenario: 응답은 상대에게 공개되지 않는다
  Given 사용자가 "더 만나지 않을래요" 로 응답했다
  When 상대 계정으로 해당 인연의 모든 화면을 확인한다
  Then 어느 화면에도 상대의 응답 내용이 표시되지 않는다
  And 상대 계정 토큰으로 meeting_feedbacks 를 조회하는 API 경로가 존재하지 않는다
  [검증: 서버 e2e — 라우트 부재 + RLS 정책]
```

---

### SEC: 개인정보 노출 방어

> Depends: Step 8
> 근거: PRD 7장·15장, `architecture.md` DTO 규칙

#### SEC.1: 실명 미노출

```gherkin
Scenario: 추천·상세 API 응답에 실제 성명이 없다
  When GET /api/discovery 와 GET /api/profiles/:id 를 호출한다
  Then 응답 JSON 어디에도 등록된 실제 성명 전체가 포함되지 않는다
  And 공개되는 이름은 사용자가 정한 nickname 뿐이다
  (별명을 실명과 같게 지은 경우는 예외 — 본인이 확인하고 선택한 공개다)
```

#### SEC.2: 생년월일·연락처 미노출

```gherkin
Scenario: 나이만 내려가고 생년월일·연락처는 내려가지 않는다
  When GET /api/profiles/:id 를 호출한다
  Then 응답에 age 는 있고 birth_date, phone 필드는 없다
```

#### SEC.3: 가족관계증명서 경로 미노출

```gherkin
Scenario: 증명서 경로는 어떤 응답에도 없다
  When GET /api/me/verification 과 GET /api/profiles/:id 를 호출한다
  Then 두 응답 모두 family_doc_path 를 포함하지 않는다
```

#### SEC.4: 사주 공개 설정 준수

```gherkin
Scenario: 비공개 사주는 타인 응답에 포함되지 않는다
  Given 상대 프로필의 saju_infos.is_public 이 false 이다
  When 다른 사용자가 GET /api/profiles/:id 를 호출한다
  Then 응답에 saju 필드가 null 이거나 존재하지 않는다
```

---

### E2E: 부팅 전체 흐름

#### E2E-01: 등록 → 공개 → 하트 → 대화 → 만남 → 최종 매칭

```gherkin
Scenario: 자녀가 부모님을 등록해 최종 매칭까지 도달한다
  # Step 1-2: 발견 → 자격 확인
  Given 계정 A 와 계정 B 가 각각 로그인했고 등록된 부모님이 없다
  When A 가 "부모님 등록하기" 를 탭하고 안내를 넘긴 뒤 "사별" 을 선택한다
  Then "본인 확인이 필요해요" 화면이 표시된다
  [스크린샷: E2E-01]

  # Step 3-4: 인증 → 동의
  When A 가 본인인증과 가족관계 인증을 마치고 대면 동의를 완료한다
  Then 프로필 작성 화면으로 이동한다
  [스크린샷: E2E-02]

  # Step 5-6: 작성 → 승인 → 공개
  When A 가 6개 섹션을 작성하고 미리보기에서 "부모님이 승인하셨어요" 를 탭한다
  And 검수가 통과된다
  Then A 의 부모님 프로필 상태가 "공개 중" 이 된다
  [스크린샷: E2E-03]

  # 같은 절차를 B 도 수행 (조건이 서로 맞도록 지역·연령 설정)
  When B 가 동일 절차로 부모님 프로필을 공개한다
  Then B 의 프로필도 "공개 중" 이 된다

  # Step 8-11: 추천 → 하트
  When A 가 홈 탭에서 B 의 부모님 카드를 확인하고 "하트" 를 탭한다
  Then "관심을 보냈어요" 토스트가 표시된다
  [스크린샷: E2E-04]

  # Step 13-14: 받은 하트 → 상호 하트
  When B 가 관심 탭에서 A 의 부모님에게 "하트" 를 탭한다
  Then "서로 관심이 있어요" 시트가 표시되고 "매칭 성공" 문구는 없다
  [스크린샷: E2E-05]

  # Step 15: 대화
  When B 가 "대화 시작하기" 를 탭하고 메시지를 보낸다
  And A 가 채팅방에서 답장한다
  Then 양측 채팅방에 두 메시지가 표시된다
  [스크린샷: E2E-06]

  # Step 17: 부모님 의사 확인
  When A 와 B 가 각각 "만나보고 싶다고 하세요" 를 제출한다
  Then 양측 채팅방에서 "만남 일정" 이 활성화된다

  # Step 18: 만남 일정
  When A 가 내일 날짜와 공공장소를 입력해 제안하고 B 가 수락한다
  Then 양측에 D-day 와 일시·장소가 표시된다
  [스크린샷: E2E-07]

  # Step 19: 만남 확인
  Given 만남 예정 시각이 지났다
  When A 가 "부모님끼리 만났어요" 를 탭한다
  Then A 화면에 "상대방의 만남 확인을 기다리고 있어요" 가 표시된다
  [스크린샷: E2E-08]
  When B 도 "부모님끼리 만났어요" 를 탭한다
  Then 양측 화면에 "최종 매칭 성공" 이 표시된다
  [스크린샷: E2E-09]

  # 최종 확인
  Then 사용자의 목표가 달성되었다:
    - 양측 인연 목록에 "최종 매칭 성공" 상태 표시
    - connections.status = 'matched'
    - meeting_confirmations 2건 존재
    - meeting_feedbacks 는 각자 본인 것만 조회 가능
  [스크린샷: E2E-FINAL]
```

**검증:** ADB 테스트 시퀀스(2개 계정 병행) + 배포 후 ADB smoke 재확인

---

## Command References

- ADB: `.claude/skills/write-test-scenarios/references/adb-commands.md`
- Server E2E: `apps/server-e2e` (Jest)
- Mobile ADB scripts: `apps/mobile-e2e/adb-tests`

## Decision Log

| Step | Question | Choice |
|------|----------|--------|
| 전체 | 검증 수단 우선순위 | `uiautomator dump` 텍스트 매칭 우선. 스크린샷은 실패 증거와 E2E 관통에만 |
| 1 | 등록 전 추천 호출 여부 | 호출하지 않는 것까지 검증한다 (불필요한 서버 부하 + 빈 상태 오작동 방지) |
| 14, 19 | '매칭 성공' 금지를 어떻게 테스트하나 | dump XML 전체 grep 으로 **부재**를 검증하는 전용 시나리오(S14.2, S19.2)를 둔다 |
| 11 | 스와이프 접근성 | 스와이프를 쓰지 않고 버튼만으로 완주하는 시나리오(S11.4)를 별도로 둔다 |
| 19 | 최종 매칭 판정 검증 위치 | 화면(S19.3) + DB(S19.4) 이중. 클라이언트가 낙관적으로 성공을 그리면 S19.2 에서 잡힌다 |
| 20 | 비공개 응답 검증 | 화면 부재 + **API 경로 부재**까지 확인한다. 라우트가 없으면 유출 경로도 없다 |
| SEC | 개인정보 검증을 어디에 두나 | Journey 밖 독립 그룹(SEC.1~4). 특정 화면이 아니라 API 계약의 문제이기 때문 |
| Post-deploy | Metro 회귀 감시 | smoke 체크리스트에 `UnableToResolve` 부재를 넣는다 (이번 setup 에서 실제로 앱이 검은 화면이었던 원인) |
| Waiting steps | 대기 단계 처리 | 독립 시나리오로 분리하지 않고 앞뒤 step 의 Then 절에 흡수 (S4.1, S17.1, S19.2) |
