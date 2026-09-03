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
  /** 실명 — 소유자 본인만 본다. 공개 응답에는 절대 실리지 않는다 */
  displayName: string;
  /** 공개 표기용 별명 */
  nickname: string;
  gender: 'male' | 'female';
  birthDate: string;
  age: number;
  regionCode: string;
  region: string;
  maritalStatus: MaritalStatus;
  maritalSince: string | null;
  heightCm: number | null;
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
  /** 부모님 접속 코드 6자리. 공개 전에는 null */
  accessCode: string | null;
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

/** 추천 카드. 실명은 오지 않고 공개용 별명만 온다 */
export interface DiscoveryItem {
  profileId: string;
  nickname: string;
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
  /** 키(cm). 상세에서만 노출 */
  heightCm: number | null;
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
  /** 함께 온 인사말 */
  message: string | null;
  profile: DiscoveryItem;
}

export interface Connection {
  id: string;
  status: ConnectionStatus;
  partner: DiscoveryItem;
  lastMessage: { body: string; sentAt: string; mine: boolean } | null;
  unreadCount: number;
  /** 아직 확인하지 않은 대화방 — 안 읽은 메시지가 있거나 한 번도 열지 않았다 */
  unseen: boolean;
  /** 이 프로필을 내 부모님께 공유했는가 */
  sharedWithParent: boolean;
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
  /** system 은 앱이 남긴 기록 — 말풍선이 아니라 가운데 한 줄로 보인다 */
  kind: 'text' | 'system';
}

/** 찜(보류)한 프로필. 매칭이 아니고 상대는 알지 못한다 */
export interface SavedProfile {
  savedAt: string;
  profile: DiscoveryItem;
}

// --- 부모님 화면 --------------------------------------------------------------

export interface ParentLoginResult {
  token: string;
  /** 부모님 본인 별명 */
  nickname: string;
}

/** 자녀가 부모님께 보내드린 프로필 한 장 */
export interface ParentInboxItem {
  connectionId: string;
  profile: DiscoveryItem;
  sharedAt: string;
  /** 아직 열어보지 않았다 — 초록 강조 */
  unseen: boolean;
  interested: boolean;
  matched: boolean;
  /** 매칭됐을 때만 채워진다 */
  partnerPhone: string | null;
  partnerName: string | null;
}

export interface ParentInterestResult {
  matched: boolean;
  partnerPhone: string | null;
  partnerName: string | null;
  partnerNickname: string | null;
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
  targetNickname: string;
}

export interface Block {
  id: string;
  nickname: string;
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
  /** 알림 상대의 별명. 상대가 없는 알림(프로필 검수 등)은 null */
  nickname: string | null;
  payload: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}
