/**
 * DB enum 과 1:1 대응하는 도메인 타입.
 *
 * 여기에는 **표시 문구가 없다.** 코드값만 오간다.
 * 화면 문구는 모바일 `shared/config/*` 가 유일한 소스다 (PRD 10.3).
 */

export type MaritalStatus = 'bereaved' | 'divorced';

export type ProfileStatus =
  | 'draft'
  | 'consent_pending'
  | 'review'
  | 'published'
  | 'hidden'
  | 'rejected';

/** '가벼운 만남'은 제외한다 (사용자 결정, 2026-09-01) */
export type RelationshipGoal =
  | 'remarriage'
  | 'serious'
  | 'travel_hobby'
  | 'same_sex_friend'
  | 'meal_walk'
  | 'undecided';

export const RELATIONSHIP_GOALS: RelationshipGoal[] = [
  'remarriage',
  'serious',
  'travel_hobby',
  'same_sex_friend',
  'meal_walk',
  'undecided',
];

export type ConnectionStatus =
  | 'mutual_heart'
  | 'chatting'
  | 'parent_intent'
  | 'meeting_scheduled'
  | 'meeting_confirm_pending'
  | 'matched'
  | 'ended';

export type ParentIntentKind = 'willing' | 'thinking' | 'declined';

export type MeetingStatus =
  | 'proposed'
  | 'accepted'
  | 'confirm_pending'
  | 'completed'
  | 'cancelled';

export type MeetingFeedbackKind = 'continue' | 'friends' | 'thinking' | 'no_more';

export type FamilyDocStatus = 'none' | 'pending' | 'approved' | 'rejected';

export type ConsentMethod = 'sms' | 'in_person';

export type NotificationKind =
  | 'heart_received'
  | 'mutual_heart'
  | 'message'
  | 'parent_intent'
  | 'meeting_proposed'
  | 'meeting_accepted'
  | 'meeting_confirm_request'
  | 'meeting_confirm_reminder'
  | 'matched'
  | 'profile_approved'
  | 'profile_rejected'
  | 'profile_auto_hidden'
  | 'conversation_read_only';

/** 반경 필터 허용값. 0 = 전국 */
export const ALLOWED_RADIUS_KM = [10, 30, 50, 0] as const;
export const DEFAULT_RADIUS_KM = 30; // TODO-06

/** 부모님 최소 연령 (TODO-02) */
export const PARENT_MIN_AGE = 50;

/** 프로필 사진 최대 장수 */
export const MAX_PROFILE_PHOTOS = 5;

/** 관계 목적 최대 선택 수 */
export const MAX_RELATIONSHIP_GOALS = 2;

/** 채팅방 읽기 전용 전환까지의 일수 (TODO-12) */
export const CHAT_RETENTION_DAYS = 90;

/** 미활동 자동 비공개까지의 일수 (TODO-11) */
export const INACTIVE_HIDE_DAYS = 60;

/** 만남 확인 재알림 간격(일) */
export const MEETING_CONFIRM_REMIND_DAYS = 3;
