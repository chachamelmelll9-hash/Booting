/**
 * 서버 DTO 미러.
 *
 * 서버 `apps/server/src/<module>/dto/` 와 짝을 이룬다. 여기에 실명·생년월일·연락처
 * 필드가 **없다는 것 자체가 계약**이다 — 서버가 안 보내고 클라이언트는 받을
 * 자리도 없다.
 */
import type { ConnectionStatus } from '@shared/config/connectionStatus';
import type { RelationshipGoal } from '@shared/config/relationshipGoals';

export type MaritalStatus = 'bereaved' | 'divorced';

export type ProfileStatus =
  | 'draft'
  | 'consent_pending'
  | 'review'
  | 'published'
  | 'hidden'
  | 'rejected';

export type FamilyDocStatus = 'none' | 'pending' | 'approved' | 'rejected';
export type ParentIntentKind = 'willing' | 'thinking' | 'declined';
export type MeetingStatus =
  | 'proposed'
  | 'accepted'
  | 'confirm_pending'
  | 'completed'
  | 'cancelled';
export type MeetingFeedbackKind = 'continue' | 'friends' | 'thinking' | 'no_more';

export interface Badges {
  child: boolean;
  family: boolean;
  consent: boolean;
  review: boolean;
}

export interface VerificationStatus {
  phoneVerified: boolean;
  phoneMasked: string | null;
  familyDocStatus: FamilyDocStatus;
  familyVerified: boolean;
  rejectReason: string | null;
  canCreateProfile: boolean;
}

export interface Photo {
  id: string;
  url: string;
  isPrimary: boolean;
  sortOrder: number;
}

export interface ParentProfile {
  id: string;
  displayName: string;
  gender: 'male' | 'female';
  birthDate: string;
  age: number;
  regionCode: string;
  region: string;
  maritalStatus: MaritalStatus;
  maritalSince: string | null;
  childrenCount: string | null;
  livingWith: string | null;
  religion: string | null;
  occupation: string | null;
  retiredOccupation: string | null;
  economicallyActive: boolean | null;
  drinking: string | null;
  smoking: string | null;
  hobbies: string[];
  motto: string | null;
  introByChild: string | null;
  desiredPartner: string | null;
  parentMessage: string | null;
  goals: RelationshipGoal[];
  photos: Photo[];
  saju: {
    birthDate: string;
    calendarType: 'solar' | 'lunar';
    birthTime: string | null;
    birthTimeUnknown: boolean;
    isPublic: boolean;
  } | null;
  status: ProfileStatus;
  publishedAt: string | null;
  consent: {
    method: 'sms' | 'in_person';
    parentName: string;
    consentedAt: string | null;
    revokedAt: string | null;
  } | null;
  review: {
    status: 'pending' | 'approved' | 'rejected';
    rejectReason: string | null;
    reviewedAt: string | null;
  } | null;
  badges: Badges;
  submittable: boolean;
  missing: string[];
}

/** 추천 카드. 실명이 아니라 마스킹된 이름만 온다 */
export interface DiscoveryItem {
  profileId: string;
  maskedName: string;
  age: number;
  region: string;
  distanceKm: number | null;
  maritalStatus: MaritalStatus;
  goals: RelationshipGoal[];
  primaryPhotoUrl: string;
  introExcerpt: string;
  badges: Badges;
}

export interface PublicProfile extends DiscoveryItem {
  photoUrls: string[];
  maritalSince: string | null;
  introByChild: string;
  desiredPartner: string;
  parentMessage: string;
  motto: string | null;
  religion: string | null;
  occupation: string | null;
  retiredOccupation: string | null;
  economicallyActive: boolean | null;
  drinking: string | null;
  smoking: string | null;
  hobbies: string[];
  /** 상세에서만 노출. 필터 항목이 아니다 (PRD) */
  childrenCount: string | null;
  livingWith: string | null;
  saju: {
    birthDate: string;
    calendarType: 'solar' | 'lunar';
    birthTime: string | null;
    birthTimeUnknown: boolean;
  } | null;
  heartSent: boolean;
}

export interface DiscoveryFilter {
  targetGender?: 'male' | 'female';
  ageMin?: number;
  ageMax?: number;
  regionCode?: string;
  radiusKm: number;
  maritalFilter?: MaritalStatus;
  goals?: RelationshipGoal[];
  religion?: string;
  drinking?: string;
  smoking?: string;
  economicallyActive?: boolean;
}

export interface Region {
  code: string;
  sido: string;
  sigungu: string;
  label: string;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export interface SendHeartResult {
  mutual: boolean;
  connectionId: string | null;
}

export interface ReceivedHeart {
  heartId: string;
  createdAt: string;
  read: boolean;
  profile: DiscoveryItem;
}

export interface Connection {
  id: string;
  status: ConnectionStatus;
  partner: DiscoveryItem;
  lastMessage: { body: string; sentAt: string; mine: boolean } | null;
  unreadCount: number;
  readOnly: boolean;
  myParentIntent: ParentIntentKind | null;
  partnerRespondedIntent: boolean;
  meetingId: string | null;
  endedReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  body: string;
  sentAt: string;
  mine: boolean;
  read: boolean;
}

export interface Meeting {
  id: string;
  meetAt: string;
  place: string;
  childAccompanied: boolean;
  soloReason: string | null;
  status: MeetingStatus;
  proposedByMe: boolean;
  confirmedByMe: boolean;
  confirmedByPartner: boolean;
  confirmable: boolean;
  /** 내 응답만. 상대 응답은 서버가 절대 내려주지 않는다 (PRD 12.3) */
  myFeedback: MeetingFeedbackKind | null;
  createdAt: string;
}

export interface ConfirmMeetingResult {
  meeting: Meeting;
  connectionStatus: ConnectionStatus;
}

export interface Report {
  id: string;
  reason: string;
  detail: string | null;
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
  createdAt: string;
  targetMaskedName: string;
}

export interface Block {
  id: string;
  maskedName: string;
  createdAt: string;
}

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

export interface AppNotification {
  id: string;
  type: NotificationKind;
  connectionId: string | null;
  payload: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}
