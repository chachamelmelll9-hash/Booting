# Feature Summary

> 기준 문서는 [`prd.md`](../../prd.md) 다. 이 문서와 개별 스펙은 PRD를 UX 실행 단위로 옮긴 것이며,
> PRD 20장 TODO 표의 확정값을 그대로 따른다. 충돌 시 PRD가 우선한다.

## Ordered Features

구현 순서 (의존성 기준):

1. **부모님 프로필 등록 & 동의** — 독립적. 다른 모든 기능이 소비하는 데이터를 만든다
2. **조건 기반 추천 & 탐색** — 1이 만든 `published` 프로필을 소비
3. **하트 & 대화 연결** — 2에서 발생한 하트를 소비, 상호 하트 시 대화방 생성
4. **첫 만남 & 최종 매칭 확정** — 3의 대화 연결 이후에만 진입 가능

## Features

### 부모님 프로필 등록 & 동의

- **Source Spec**: `docs/features/parent-profile-consent.md`
- **User Goal**: 자녀가 실제 자녀임을 증명하고, 부모님께 직접 동의를 받아, 부모님을 잘 드러내는 프로필을 대신 만들어 공개한다
- **Summary**: 본인인증 → 가족관계 인증 → 부모님 동의 → 6섹션 프로필 작성 → 부모님 최종 승인 → 운영 검수 → 공개까지 한 줄기로 진행한다. 공개 결정권은 부모님에게 있고, 철회하면 즉시 비공개다. 등록 대상은 사별·이혼으로 제한하며 자녀 1명당 부모님 1명이다.
- **Journey Steps**: 발견 → 진입(원칙 안내 + 자격 확인) → 입력(인증) → 입력(부모님 동의) → 입력(프로필 작성) → 대기·결과(승인·검수·공개) → 이탈(공개 중단·철회)
- **Key Screens**: `/(tabs)/home`(빈 상태), `/parent/onboarding`, `/parent/verification`, `/parent/consent`, `/parent/profile/edit`, `/parent/profile/preview`, `/parent/profile/status`
- **Core Data**: ChildVerification, ParentProfile, ParentPhoto, ParentConsent, SajuInfo, RelationshipGoal, ProfileReview
- **Key Decisions**: 부모님 1명(TODO-07) / 만 50세 이상(TODO-02) / 휴대폰 없으면 자녀 단말 대면 동의(TODO-04) / 가족관계 심사는 MVP 자동 승인이되 상태 기계는 실심사 교체 가능하게 유지(TODO-05) / 사주는 선택 입력 + 공개 여부 선택, 궁합은 P2(TODO-13) / 사진 최대 5장·대표 1장 필수 / 부모님 최종 승인 없이는 어떤 경로로도 공개되지 않는다

### 조건 기반 추천 & 탐색

- **Source Spec**: `docs/features/profile-discovery.md`
- **User Goal**: 우리 부모님과 어울릴 상대를 생활권·조건 기준으로 훑어보고 하트를 보내거나 넘긴다
- **Summary**: 부모님의 거주 생활권 기준 반경(10/30/50km/전국, 기본 30km) 안의 공개 프로필을 카드로 추천한다. 카드는 9개 항목만 간결히 싣고, 자녀 수·동거 가족은 필터에서 빼고 상세에서만 보여준다. 관계 목적이 겹치는 프로필을 우선 노출하고, 차단·넘김·비공개는 추천에서 제외한다.
- **Journey Steps**: 발견(홈=추천 피드) → 진입(조건 설정) → 입력·선택(스와이프·하트·넘기기) → 결과(상세 프로필) → 후속(신고·차단) → 이탈
- **Key Screens**: `/(tabs)/home`, `/(tabs)/home/filters`, `/profile/[id]`, `/report/[id]`
- **Core Data**: ParentProfile, ParentPhoto, RelationshipGoal, SajuInfo, DiscoveryFilter, Heart, Pass, Block, Report
- **Key Decisions**: 실시간 GPS 대신 설정된 생활권 사용 / 하트는 확인 다이얼로그 없이 즉시 전송(중복만 차단) / 넘기기 되돌리기 미제공 / 스와이프 전용 조작 금지 — 하트·넘기기는 버튼으로도 제공 / 상세에서 가장 먼저 읽혀야 할 것은 자녀가 쓴 소개글 / '동성 친구' 선택 시 동성 프로필 포함

### 하트 & 대화 연결

- **Source Spec**: `docs/features/heart-conversation.md`
- **User Goal**: 우리 부모님께 관심을 보낸 분을 확인하고, 서로 관심이 맞은 상대의 자녀와 대화해 부모님께 소개할지 판단한다
- **Summary**: 받은 하트 목록에서 하트를 되돌려주면 상호 하트가 성립하고 자녀 간 1:1 메시지가 열린다. 이 단계는 '매칭 성공'이 아니라 **'대화 연결'**이며 그 표현을 화면·알림 어디에서도 쓰지 않는다. 채팅방에서 신고·차단을 바로 쓸 수 있고, 외부 연락처 공유 전 안전수칙을 안내한다.
- **Journey Steps**: 발견(배지·푸시) → 진입(받은 하트 목록) → 결과(상호 하트 = 대화 연결) → 후속(자녀 간 메시지) → 후속(인연 관리 상태 추적) → 이탈(대화 종료·차단)
- **Key Screens**: `/(tabs)/hearts`, `/hearts/matched/[id]`, `/(tabs)/connections`, `/(tabs)/messages`, `/messages/[conversationId]`
- **Core Data**: Heart, Connection, Conversation, Message, Block, Report, Notification
- **Key Decisions**: 메시지는 상호 하트 성립 시에만 활성 / 대화 주체는 자녀 (부모님 직접 참여는 P2) / 상태 문구는 PRD 10.3의 9개 목록과 글자 단위로 일치 / 안전 배너는 최초 진입 1회 후 접힘 / 위험 문구 감지는 P1 / 최종 매칭 후 채팅방 90일 유지(TODO-12)

### 첫 만남 & 최종 매칭 확정

- **Source Spec**: `docs/features/first-meeting-match.md`
- **User Goal**: 각자 부모님의 만남 의사를 확인하고 안전한 자리에서 첫 만남을 잡은 뒤, 만남이 실제로 이뤄졌음을 양측이 확인해 인연을 매듭짓는다
- **Summary**: 부모님 의사 확인 → 양측 동의 → 일정 조율 → 자녀 동반 첫 만남 → 양측 '부모님끼리 만났어요' 확인 → 최종 매칭 성공. 한쪽만 확인하면 '상대방의 만남 확인을 기다리고 있어요' 상태이며 3일 후 재알림한다. 만남 이후 비공개 응답은 상대에게 평가·점수로 공개하지 않는다.
- **Journey Steps**: 발견(채팅방 진입점) → 입력(부모님 의사 확인) → 입력(일정 등록) → 분기(자녀 미동행 확인) → 대기(만남 전 리마인드) → 결과(양측 확인 → 최종 매칭) → 후속(비공개 응답) → 이탈·완료
- **Key Screens**: `/(tabs)/connections`, `/connections/[id]/parent-intent`, `/connections/[id]/meeting`, `/connections/[id]/meeting/solo-confirm`, `/connections/[id]/meeting/confirm`, `/connections/[id]/meeting/feedback`
- **Core Data**: Connection, ParentIntent, Meeting, MeetingConfirmation, MeetingFeedback, Notification
- **Key Decisions**: 자녀 동행은 강력 권장 + 미동행 시 사유 입력·안전수칙 재확인(TODO-03·14) / 최종 매칭은 양측 확인이 모인 뒤 **서버만** 판정 / 만남 확인은 만남 예정 시각 이후에만 가능 / 미확인 재알림 3일 후 1회 / 사후 응답은 작성자 본인만 조회(RLS) / 공공장소 자동 추천은 P1

## 전 기능 공통 제약 (다운스트림 스킬이 반드시 지켜야 할 것)

1. **'매칭 성공'은 부모님이 실제로 만나 양측이 확인한 뒤에만 쓴다.** 상호 하트 단계의 화면·알림·푸시 문구에 등장하면 결함이다 (PRD 10.1·16장).
2. **부모님 동의 없이 공개되는 경로를 만들지 않는다.** 동의 철회 시 즉시 비공개.
3. **민감정보 비공개**: 가족관계증명서 원문, 주민등록번호, 정확한 주소·실시간 위치, 연락처. 성명은 `김OO` 형태로 마스킹.
4. **자녀 수·동거 가족은 검색 필터로 쓰지 않는다.** 상세 프로필에서만 노출.
5. **전면 무료·광고 없음** (TODO-10). 인앱결제·AdMob 관련 UI를 만들지 않는다.
6. **접근성 기본값**: 터치 타겟 44×44px 이상, 대비 4.5:1 이상, 색상 단독 정보 전달 금지, 스와이프 전용 조작 금지.
