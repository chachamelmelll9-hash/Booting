import type { Meeting } from '@shared/api/booting.types';

export const PARENT_INTENT_LABELS: {
  key: 'willing' | 'thinking' | 'declined';
  label: string;
  hint: string;
}[] = [
  // 양측이 모두 이걸 고르면 매칭이 성립한다 — 그 이후 약속은 대화로 정하시면 된다
  { key: 'willing', label: '만나보고 싶다고 하세요', hint: '양측이 모두 답하면 매칭됩니다' },
  { key: 'thinking', label: '조금 더 생각해 보신대요', hint: '나중에 다시 여쭤볼 수 있습니다' },
  { key: 'declined', label: '만나지 않겠다고 하세요', hint: '대화가 종료됩니다' },
];

export const FEEDBACK_OPTIONS: {
  key: 'continue' | 'friends' | 'thinking' | 'no_more';
  label: string;
}[] = [
  { key: 'continue', label: '계속 만나보고 싶어요' },
  { key: 'friends', label: '친구로 지내고 싶어요' },
  { key: 'thinking', label: '조금 더 생각해볼게요' },
  { key: 'no_more', label: '더 만나지 않을래요' },
];

export function formatMeetAt(iso: string): string {
  const d = new Date(iso);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const hours = d.getHours();
  const meridiem = hours < 12 ? '오전' : '오후';
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${d.getMonth() + 1}월 ${d.getDate()}일(${days[d.getDay()]}) ${meridiem} ${displayHour}시`;
}

/** D-day. 지났으면 음수 */
export function daysUntil(iso: string): number {
  const target = new Date(iso);
  const now = new Date();
  const diffMs = target.setHours(0, 0, 0, 0) - now.setHours(0, 0, 0, 0);
  return Math.round(diffMs / 86_400_000);
}

export function ddayLabel(iso: string): string {
  const days = daysUntil(iso);
  if (days === 0) return '오늘';
  if (days > 0) return `D-${days}`;
  return `${-days}일 전`;
}

/**
 * 만남 화면이 지금 보여줘야 할 상태.
 *
 * 화면마다 `status`/`confirmedByMe`/`meetAt` 조합을 다시 따지면 반드시
 * 어긋난다 — 특히 "한쪽만 확인" 상태를 성공처럼 그리는 실수가 여기서 난다.
 */
export type MeetingPhase =
  | 'none'
  | 'awaiting-accept'
  | 'accept-required'
  | 'scheduled'
  | 'confirmable'
  | 'awaiting-partner-confirm'
  | 'completed';

export function meetingPhase(meeting: Meeting | null | undefined): MeetingPhase {
  if (!meeting) return 'none';
  if (meeting.status === 'completed') return 'completed';
  if (meeting.status === 'proposed') {
    return meeting.proposedByMe ? 'awaiting-accept' : 'accept-required';
  }
  if (meeting.confirmedByMe) return 'awaiting-partner-confirm';
  if (meeting.confirmable) return 'confirmable';
  return 'scheduled';
}
