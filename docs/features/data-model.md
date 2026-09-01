# Data Model

## Entities

| Entity | Description | Key Attributes | Source Features |
|--------|-------------|----------------|-----------------|
| User | 앱 사용자 = **성인 자녀** (공통) | id, created_at | (공통) |
| ChildVerification | 자녀의 본인인증·가족관계 인증 상태 | id, user_id, phone_verified_at, family_doc_status(pending/approved/rejected), family_verified_at, reject_reason, created_at | parent-profile-consent |
| ParentProfile | 등록된 부모님 프로필 (자녀 1명당 1건) | id, user_id, display_name, gender, birth_date, region_code, marital_status(bereaved/divorced), marital_since, children_count, living_with, religion, occupation, retired_occupation, economically_active, drinking, smoking, hobbies[], motto, intro_by_child, desired_partner, parent_message, status(draft/consent_pending/review/published/hidden), published_at, last_active_at, created_at | parent-profile-consent, profile-discovery |
| ParentPhoto | 부모님 사진 (**최소 3장**, 최대 5장, 대표 1장) | id, parent_profile_id, storage_path, is_primary, sort_order, created_at | parent-profile-consent, profile-discovery |
| ParentConsent | 부모님의 등록·공개 동의와 철회 이력 | id, parent_profile_id, method(sms/in_person), parent_name, consented_at, revoked_at, created_at | parent-profile-consent |
| SajuInfo | 사주 정보 (선택 입력, 공개 여부 선택) | id, parent_profile_id, birth_date, calendar_type(solar/lunar), birth_time, birth_time_unknown, is_public, created_at | parent-profile-consent, profile-discovery |
| ParentProfile.height_cm | 부모님 키 (cm, 120~220 CHECK). 상세에서만 노출 | integer | parent-profile-consent, profile-discovery |
| RelationshipGoal | 관계 목적 (프로필당 최대 2개) | id, parent_profile_id, goal(remarriage/serious/travel_hobby/same_sex_friend/meal_walk/undecided) | parent-profile-consent, profile-discovery |
| ProfileReview | 운영 검수 결과 | id, parent_profile_id, status(pending/approved/rejected), reject_reason, reviewed_at, created_at | parent-profile-consent |
| DiscoveryFilter | 자녀가 저장한 추천 조건 | id, user_id, target_gender, age_min, age_max, region_code, radius_km(10/30/50/null=전국), marital_filter(bereaved/divorced/any), goals[], religion, drinking, smoking, economically_active, updated_at | profile-discovery |
| Heart | 하트 (관심 보내기) | id, sender_user_id, target_parent_profile_id, created_at | profile-discovery, heart-conversation |
| Pass | 넘긴 프로필 (재추천 제외용) | id, user_id, target_parent_profile_id, created_at | profile-discovery |
| Block | 차단 (양방향 제외) | id, user_id, blocked_user_id, created_at | profile-discovery, heart-conversation |
| Report | 신고 | id, reporter_user_id, target_user_id, target_parent_profile_id, reason(false_info/photo_theft/money/investment/sexual/other), detail, status(received/reviewing/resolved), created_at | profile-discovery, heart-conversation |
| Connection | 두 자녀 사이의 인연 (상태 기계의 주체) | id, user_a_id, user_b_id, parent_profile_a_id, parent_profile_b_id, status(mutual_heart/chatting/parent_intent/meeting_scheduled/meeting_confirm_pending/matched/ended), ended_reason, created_at, updated_at | heart-conversation, first-meeting-match |
| Conversation | 대화방 (상호 하트 성립 시 생성) | id, connection_id, opened_at, read_only_at, created_at | heart-conversation |
| Message | 자녀 간 메시지 | id, conversation_id, sender_user_id, body, sent_at, read_at | heart-conversation |
| ParentIntent | 각 자녀가 기록한 부모님 만남 의사 | id, connection_id, user_id, intent(willing/thinking/declined), responded_at | first-meeting-match |
| Meeting | 첫 만남 일정 | id, connection_id, proposed_by_user_id, meet_at, place, child_accompanied, solo_reason, safety_ack_at, status(proposed/accepted/passed), created_at | first-meeting-match |
| MeetingConfirmation | '부모님끼리 만났어요' 참여자별 확인 | id, meeting_id, user_id, confirmed_at, reminded_at | first-meeting-match |
| MeetingFeedback | 만남 이후 비공개 응답 (상대에게 공개 금지) | id, meeting_id, user_id, response(continue/friends/thinking/no_more), created_at | first-meeting-match |
| Notification | 알림 이력 | id, user_id, type, connection_id, payload, read_at, created_at | heart-conversation, first-meeting-match |

## Relationships

```
User 1──1 ChildVerification
User 1──1 ParentProfile
User 1──1 DiscoveryFilter
ParentProfile 1──N ParentPhoto
ParentProfile 1──N ParentConsent
ParentProfile 1──1 SajuInfo
ParentProfile 1──N RelationshipGoal
ParentProfile 1──N ProfileReview
User 1──N Heart          Heart N──1 ParentProfile
User 1──N Pass           Pass  N──1 ParentProfile
User 1──N Block          User  1──N Report
User N──M User  (Connection 이 교차 테이블)
Connection 1──1 Conversation
Conversation 1──N Message
Connection 1──N ParentIntent      (참여자당 1건)
Connection 1──N Meeting
Meeting 1──N MeetingConfirmation  (참여자당 1건)
Meeting 1──N MeetingFeedback      (참여자당 1건)
User 1──N Notification
```

## Relationship Details

| Relationship | Type | Description |
|-------------|------|-------------|
| User → ParentProfile | 1:1 | 자녀 1명이 등록할 수 있는 부모님은 1명 (TODO-07). 확장 시 1:N |
| ParentProfile → ParentPhoto | 1:N | 최대 5장, `is_primary`는 정확히 1건 |
| ParentProfile → ParentConsent | 1:N | 동의·철회가 반복될 수 있어 이력으로 쌓는다. 최신 레코드의 `revoked_at`이 null 이어야 공개 가능 |
| ParentProfile → RelationshipGoal | 1:N | 최대 2건. `undecided`는 단독으로만 존재 |
| User → Heart | 1:N | `(sender_user_id, target_parent_profile_id)` 유니크 — 중복 하트 차단 |
| Heart ↔ Heart | — | 역방향 하트가 존재하면 서버가 Connection 을 생성 (상호 하트 = 대화 연결) |
| User ↔ User | N:M | Connection 이 두 자녀와 두 부모님 프로필을 함께 들고 있는 교차 엔티티 |
| Connection → Conversation | 1:1 | 상호 하트 성립 시점에만 생성 |
| Connection → ParentIntent | 1:N | 참여자당 1건, 양측 `willing` 이어야 Meeting 생성 가능 |
| Meeting → MeetingConfirmation | 1:N | 참여자당 1건. **2건 모두 존재해야** Connection.status = `matched` |
| Meeting → MeetingFeedback | 1:N | 참여자당 1건. 작성자 본인만 조회 가능 (RLS) |

## Notes

- 논리 모델 수준이다 (Supabase 테이블/Zustand 스토어 매핑은 구현 단계에서 결정).
- `User`는 **자녀**다. 부모님은 계정을 갖지 않고 `ParentProfile` + `ParentConsent`로만 존재한다.
- **최종 매칭은 서버만 판정한다.** `MeetingConfirmation` 2건이 모인 순간에만 `Connection.status`가 `matched`로 전이되며, 클라이언트가 이 상태를 직접 쓸 수 없다.
- 민감정보 분리: 가족관계증명서 원문은 어떤 엔티티에도 공개 컬럼으로 두지 않고 비공개 Storage 버킷 + `ChildVerification.family_doc_status` 결과 플래그만 유지한다 (PRD 15장).
- 위치는 `region_code`(시·군·구)와 그 대표 좌표만 저장한다. 실시간 좌표는 수집하지 않는다.
- 자동 비공개: `ParentProfile.last_active_at` 기준 60일 초과 시 `status=hidden` (TODO-11).
- 채팅 보관: `Connection.status=matched` 시점부터 90일 후 `Conversation.read_only_at` 설정 (TODO-12).
- 추천 제외 집합 = Block(양방향) ∪ Pass ∪ Heart(내가 보낸) ∪ status≠published ∪ 본인 부모님.
