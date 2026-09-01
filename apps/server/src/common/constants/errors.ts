/**
 * 도메인 에러 코드. 모바일이 문구가 아니라 코드로 분기한다.
 */
export const ERROR_CODES = {
  // 인증·자격
  CHILD_NOT_VERIFIED: 'child_not_verified',
  PROFILE_NOT_PUBLISHED: 'profile_not_published',
  PROFILE_NOT_FOUND: 'profile_not_found',
  PROFILE_EXISTS: 'profile_exists',
  PARENT_MIN_AGE: 'parent_min_age',
  MARITAL_STATUS_NOT_ELIGIBLE: 'marital_status_not_eligible',

  // 동의·검수
  CONSENT_REQUIRED: 'consent_required',
  CONSENT_ALREADY_GIVEN: 'consent_already_given',
  REVIEW_IN_PROGRESS: 'review_in_progress',

  // 프로필 내용
  GOALS_MAX: 'goals_max',
  GOALS_UNDECIDED_ALONE: 'goals_undecided_alone',
  PHOTOS_MAX: 'photos_max',
  PHOTO_REQUIRED: 'photo_required',
  PROFILE_INCOMPLETE: 'profile_incomplete',

  // 상호작용
  HEART_ALREADY_SENT: 'heart_already_sent',
  HEART_SELF: 'heart_self',
  BLOCKED: 'blocked',

  // 인연·대화
  CONNECTION_NOT_FOUND: 'connection_not_found',
  CONNECTION_ENDED: 'connection_ended',
  CONVERSATION_READ_ONLY: 'conversation_read_only',

  // 만남
  MEETING_NOT_FOUND: 'meeting_not_found',
  MEETING_EXISTS: 'meeting_exists',
  MEETING_NOT_ACCEPTED: 'meeting_not_accepted',
  MEETING_TOO_EARLY: 'meeting_too_early',
  MEETING_ALREADY_CONFIRMED: 'meeting_already_confirmed',
  SOLO_REASON_REQUIRED: 'solo_reason_required',
  PARENT_INTENT_REQUIRED: 'parent_intent_required',

  // 일반
  NOT_FOUND: 'not_found',
  FORBIDDEN: 'forbidden',
  INVALID_REGION: 'invalid_region',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  child_not_verified: '자녀 본인인증과 가족관계 확인을 먼저 완료해주세요',
  profile_not_published: '부모님 프로필을 공개한 뒤에 이용할 수 있습니다',
  profile_not_found: '프로필을 찾을 수 없습니다',
  profile_exists: '이미 등록한 부모님 프로필이 있습니다',
  parent_min_age: '부모님은 만 50세 이상이어야 합니다',
  marital_status_not_eligible: '사별 또는 이혼 상태만 등록할 수 있습니다',

  consent_required: '부모님 동의가 필요합니다',
  consent_already_given: '이미 동의가 완료되었습니다',
  review_in_progress: '검수가 진행 중입니다',

  goals_max: '관계 목적은 최대 2개까지 선택할 수 있습니다',
  goals_undecided_alone: '아직 모르겠음은 단독으로만 선택할 수 있습니다',
  photos_max: '사진은 최대 5장까지 등록할 수 있습니다',
  photo_required: '사진을 최소 3장 등록해주세요',
  profile_incomplete: '필수 항목을 모두 입력해주세요',

  heart_already_sent: '이미 관심을 보낸 프로필입니다',
  heart_self: '내 부모님 프로필에는 관심을 보낼 수 없습니다',
  blocked: '이용할 수 없는 상대입니다',

  connection_not_found: '인연을 찾을 수 없습니다',
  connection_ended: '종료된 대화입니다',
  conversation_read_only: '대화 기간이 지나 읽기 전용입니다',

  meeting_not_found: '만남 일정을 찾을 수 없습니다',
  meeting_exists: '이미 진행 중인 만남 일정이 있습니다',
  meeting_not_accepted: '상대가 아직 일정을 수락하지 않았습니다',
  meeting_too_early: '만남 시간이 지난 뒤에 확인할 수 있습니다',
  meeting_already_confirmed: '이미 만남을 확인했습니다',
  solo_reason_required: '자녀 미동행 사유와 안전수칙 확인이 필요합니다',
  parent_intent_required: '양측 부모님의 의사 확인이 먼저 필요합니다',

  not_found: '찾을 수 없습니다',
  forbidden: '권한이 없습니다',
  invalid_region: '지역 정보가 올바르지 않습니다',
};

export function domainError(code: ErrorCode, override?: string) {
  return { code, message: override ?? ERROR_MESSAGES[code] };
}
