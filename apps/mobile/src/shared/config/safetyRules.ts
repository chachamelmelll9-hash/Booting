/**
 * 안전수칙 문구 — 단일 소스 (PRD 안전 정책, TODO-14).
 *
 * 채팅방 배너·만남 일정·자녀 미동행 확인 세 곳이 같은 문장을 쓴다.
 * 복붙하면 한 곳만 고쳐지는 일이 반드시 생긴다.
 */

/** 채팅방 상단 배너 */
export const CHAT_SAFETY_BANNER =
  '금전 요구, 개인정보 요청, 외부 메신저 유도는 신고해 주세요.';

/** 만남 일정 화면 안내 */
export const MEETING_SAFETY_NOTES = [
  '첫 만남은 낮 시간, 사람이 많은 공개된 장소에서 하시는 것을 권합니다.',
  '만남 장소와 시간을 가족에게 미리 알려 주세요.',
  '금전 거래나 계약 요구가 있으면 즉시 중단하고 신고해 주세요.',
];

/** 자녀 미동행 시 반드시 확인해야 하는 체크리스트 (TODO-03) */
export const SOLO_SAFETY_CHECKLIST = [
  '만남 장소와 시간을 자녀에게 알렸습니다.',
  '공개된 장소에서 만나기로 했습니다.',
  '만남 후 자녀에게 연락드리기로 했습니다.',
];

/** 자녀 동행 권장 문구 — 미동행 화면에서 먼저 보여준다 */
export const CHILD_ACCOMPANY_RECOMMENDATION =
  '첫 만남에는 자녀분이 함께 나가시는 것을 강력히 권합니다. 부모님 두 분만 만나시는 경우 사고 위험이 높아집니다.';

/** 신고 사유 — 서버 REPORT_REASONS 와 키가 일치해야 한다 */
export const REPORT_REASONS: { key: string; label: string }[] = [
  { key: 'money_request', label: '금전 요구' },
  { key: 'inappropriate_behavior', label: '부적절한 언행' },
  { key: 'scam_suspicion', label: '사기 의심' },
  { key: 'fake_profile', label: '허위 프로필' },
  { key: 'inappropriate_photo', label: '부적절한 사진' },
  { key: 'commercial', label: '상업적 목적·광고' },
  { key: 'meeting_no_show', label: '약속 불이행' },
  { key: 'other', label: '기타' },
];

/**
 * 대화방 ⋯ 메뉴에서 고르는 사유.
 *
 * 대화까지 온 사람이 신고하는 이유는 실제로 이 셋으로 수렴한다. 프로필 상세의
 * 신고 화면은 아직 대화 전이라 판단 근거가 프로필뿐이므로 전체 목록을 쓴다.
 */
const CHAT_REASON_KEYS = ['money_request', 'inappropriate_behavior', 'scam_suspicion'];
export const CHAT_REPORT_REASONS = REPORT_REASONS.filter((r) =>
  CHAT_REASON_KEYS.includes(r.key)
);

/** 더 이상 고를 수 없지만 지난 신고 내역에 남아 있는 사유 */
const LEGACY_REPORT_REASON_LABELS: Record<string, string> = {
  safety_concern: '금전 요구 등 안전 우려',
  abusive_language: '욕설·비하 발언',
};

/**
 * 사유 키 → 화면에 뜨는 문구.
 *
 * 신고 내역은 예전에 낸 신고도 함께 보여준다. 목록에서 사라진 키를 그대로
 * 찍으면 사용자가 자기가 뭘로 신고했는지 알아볼 수 없다.
 */
export function reportReasonLabel(key: string): string {
  return (
    REPORT_REASONS.find((r) => r.key === key)?.label ??
    LEGACY_REPORT_REASON_LABELS[key] ??
    key
  );
}
