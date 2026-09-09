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

// FamilyDocStatus 는 없앴다 — 가족관계증명서는 더 이상 받지 않는다
export type ParentIntentKind = 'willing' | 'thinking' | 'declined';
export type MeetingStatus =
  | 'proposed'
  | 'accepted'
  | 'confirm_pending'
  | 'completed'
  | 'cancelled';
export type MeetingFeedbackKind = 'continue' | 'friends' | 'thinking' | 'no_more';

/**
 * 화면에 보이는 배지는 '부모님 동의' 하나다 — `review` 는 내부 심사 상태다.
 *
 * '자녀 인증'·'가족관계' 는 없앴다. 공개된 프로필에는 그 둘이 늘 켜져 있었고
 * (인증을 마쳐야 프로필을 만들 수 있으니 당연하다), 늘 같은 값인 표시는
 * 아무것도 알려주지 않으면서 카드마다 자리를 차지했다.
 */
export interface Badges {
  consent: boolean;
  review: boolean;
}

export interface VerificationStatus {
  phoneVerified: boolean;
  /** 카카오 계정이 붙어 있는가 — 카카오 하나는 부팅 계정 하나에만 붙는다 */
  kakaoLinked: boolean;
  /** 문자 사업자가 꽂혀 있는가 — false 면 화면에서 휴대폰 항목을 감춘다 */
  phoneAvailable: boolean;
  phoneMasked: string | null;
  /** 문자 인증 **또는** 카카오 연결 중 하나면 열린다 */
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
  /** 부모님 접속 코드 숫자 8자리. 공개 전에는 null */
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

// --- 사주 궁합 ----------------------------------------------------------------

/** 점수의 근거. 서버는 **코드만** 보내고 문구는 `shared/config/saju.ts` 가 만든다 */
export type SajuReasonCode =
  | 'stem_union'
  | 'stem_generate'
  | 'stem_same'
  | 'stem_clash'
  | 'branch_six_union'
  | 'branch_triple_union'
  | 'branch_seasonal_union'
  | 'branch_same'
  | 'branch_clash'
  | 'zodiac_triple_union'
  | 'zodiac_six_union'
  | 'zodiac_clash'
  | 'zodiac_resentment'
  | 'month_union'
  | 'month_clash'
  | 'element_complement'
  | 'element_biased'
  | 'yinyang_balanced'
  | 'hour_union'
  | 'hour_clash';

export interface SajuCompatibility {
  /** 30~99. **등급 문구는 없다** — 서비스가 두 사람 사이를 판정하지 않는다 */
  score: number;
  reasons: SajuReasonCode[];
  /** 양쪽 다 출생시각을 알면 high */
  confidence: 'high' | 'medium';
}

/** 사주 한 기둥 — 천간(0~9)·지지(0~11) 인덱스 */
export interface SajuPillar {
  stem: number;
  branch: number;
}

export interface SajuPillars {
  year: SajuPillar;
  month: SajuPillar;
  day: SajuPillar;
  /** 출생시각을 모르면 null */
  hour: SajuPillar | null;
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
  /** 우리 부모님과의 궁합. 한쪽이라도 사주를 안 적었으면 null */
  compatibility: SajuCompatibility | null;
  /** 이 분 본인의 일주 — 카드에 '을사일주'로 찍는다. 사주를 안 적었으면 null */
  dayPillar: SajuPillar | null;
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
  /**
   * 궁합의 근거가 된 네 기둥. 궁합이 있을 때만 온다.
   * 상대 기둥은 상대가 사주를 공개했을 때만 채워진다 (기둥 넷이면 생일이 드러난다).
   */
  sajuPillars: { mine: SajuPillars; theirs: SajuPillars | null } | null;
  heartSent: boolean;
}

/**
 * 추천 조건.
 *
 * 정렬 항목이 **없다.** 조건에 맞는 분들 안에서 누구를 먼저 보여줄지는 서버가
 * 정한다 — 우리 부모님 사주가 있으면 궁합이 높은 순, 없으면 최근 활동 순이다.
 */
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

/** 부모님이 여시는 상세 — 카드보다 훨씬 많이 담는다 */
export interface ParentProfileDetail extends Omit<ParentInboxItem, 'profile'> {
  profile: PublicProfile;
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
