/**
 * PRD 10.3 인연 상태 문구 — **단일 소스**.
 *
 * 화면에서 상태 문구를 하드코딩하지 않는다. 이유는 하나다:
 * '매칭 성공'은 **양측이 만남을 확인한 뒤에만** 쓸 수 있는 말인데,
 * 문구가 화면마다 흩어지면 상호 하트나 한쪽 확인 단계에서 누군가 반드시
 * 그 표현을 쓰게 된다. 여기 한 곳에만 두면 그런 실수가 구조적으로 불가능하다.
 *
 * test-scenarios.md S14.2 / S19.2 가 상호 하트·한쪽 확인 시점의 화면 덤프를
 * grep 해서 '매칭 성공' 문구의 **부재**를 검증한다.
 */

export type ConnectionStatus =
  | 'mutual_heart'
  | 'chatting'
  | 'parent_intent'
  | 'meeting_scheduled'
  | 'meeting_confirm_pending'
  | 'matched'
  | 'ended';

interface StatusPresentation {
  /** 배지·목록에 쓰는 짧은 라벨 */
  label: string;
  /** 상세 화면 안내 문구 */
  description: string;
  /** 배지 색 키 */
  tone: 'neutral' | 'active' | 'pending' | 'success' | 'muted';
}

export const CONNECTION_STATUS: Record<ConnectionStatus, StatusPresentation> = {
  mutual_heart: {
    label: '대화 연결',
    // 여기서 '매칭'이라는 말을 쓰지 않는다. 서로 관심을 보였을 뿐이다.
    description: '서로 관심을 보냈어요. 이제 자녀분끼리 대화를 시작할 수 있습니다.',
    tone: 'active',
  },
  chatting: {
    label: '대화 중',
    description: '자녀분끼리 대화하고 있습니다.',
    tone: 'active',
  },
  parent_intent: {
    label: '부모님 의사 확인',
    description: '양측 부모님께 만나실 의향이 있는지 여쭤보는 단계입니다.',
    tone: 'pending',
  },
  meeting_scheduled: {
    label: '만남 예정',
    description: '만남 일정이 정해졌습니다.',
    tone: 'pending',
  },
  meeting_confirm_pending: {
    label: '만남 확인 대기',
    // 한쪽만 확인한 상태다. 절대 성공이 아니다.
    description: '한 분이 만남을 확인했습니다. 상대측 확인을 기다리고 있습니다.',
    tone: 'pending',
  },
  matched: {
    label: '매칭 성공',
    description: '양측 모두 만남을 확인했습니다.',
    tone: 'success',
  },
  ended: {
    label: '대화 종료',
    description: '종료된 인연입니다.',
    tone: 'muted',
  },
};

/** '매칭 성공'을 쓸 수 있는 유일한 상태 */
export const MATCHED_STATUS: ConnectionStatus = 'matched';

export function statusLabel(status: ConnectionStatus): string {
  return CONNECTION_STATUS[status]?.label ?? '';
}

export function statusDescription(status: ConnectionStatus): string {
  return CONNECTION_STATUS[status]?.description ?? '';
}

/** 인연 목록 필터 칩 순서 */
export const CONNECTION_FILTERS: { key: ConnectionStatus | 'all'; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'chatting', label: '대화 중' },
  { key: 'meeting_scheduled', label: '만남 예정' },
  { key: 'matched', label: '매칭 성공' },
  { key: 'ended', label: '종료' },
];
