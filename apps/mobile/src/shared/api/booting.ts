/**
 * 부팅 서버 API 호출 모음.
 *
 * feature 별 api 파일을 따로 두지 않고 여기 모았다 — 엔드포인트가 얇고
 * (대부분 한 줄), feature 마다 쪼개면 같은 타입을 재수출하는 파일만 늘어난다.
 * 대신 도메인별로 객체를 나눠 호출부에서 `heartsApi.send(...)` 처럼 읽힌다.
 */
import type {
  AppNotification,
  Block,
  ConfirmMeetingResult,
  Connection,
  DiscoveryFilter,
  DiscoveryItem,
  Meeting,
  MeetingFeedbackKind,
  Message,
  Page,
  ParentIntentKind,
  ParentProfile,
  Photo,
  PublicProfile,
  ReceivedHeart,
  Region,
  Report,
  SavedProfile,
  SendHeartResult,
  VerificationStatus,
} from './booting.types';
import { serverFetch } from './server';

function qs(params: Record<string, string | number | undefined | null>): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== ''
  );
  if (!entries.length) return '';
  return `?${entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&')}`;
}

export const verificationApi = {
  status: () => serverFetch<VerificationStatus>('/me/verification'),
  submitPhone: (phone: string, token: string) =>
    serverFetch<VerificationStatus>('/me/verification/phone', {
      method: 'POST',
      body: { phone, token },
    }),
  submitFamilyDoc: (storagePath: string) =>
    serverFetch<VerificationStatus>('/me/verification/family', {
      method: 'POST',
      body: { storagePath },
    }),
};

export const parentProfileApi = {
  get: () => serverFetch<ParentProfile | null>('/parent-profile'),
  create: (body: {
    displayName: string;
    nickname: string;
    gender: 'male' | 'female';
    birthDate: string;
    regionCode: string;
    maritalStatus: 'bereaved' | 'divorced';
    maritalSince?: string;
    goals: string[];
  }) => serverFetch<ParentProfile>('/parent-profile', { method: 'POST', body }),
  update: (body: Record<string, unknown>) =>
    serverFetch<ParentProfile>('/parent-profile', { method: 'PATCH', body }),
  addPhoto: (storagePath: string, isPrimary = false) =>
    serverFetch<Photo[]>('/parent-profile/photos', {
      method: 'POST',
      body: { storagePath, isPrimary },
    }),
  removePhoto: (photoId: string) =>
    serverFetch<Photo[]>(`/parent-profile/photos/${photoId}`, { method: 'DELETE' }),
  requestConsent: (body: { method: 'sms' | 'in_person'; parentName: string; phone?: string }) =>
    serverFetch<{ consentedAt: string | null }>('/parent-profile/consent', {
      method: 'POST',
      body,
    }),
  revokeConsent: () =>
    serverFetch<ParentProfile>('/parent-profile/consent/revoke', { method: 'POST' }),
  submit: () => serverFetch<ParentProfile>('/parent-profile/submit', { method: 'POST' }),
  setVisibility: (visible: boolean) =>
    serverFetch<ParentProfile>('/parent-profile/visibility', {
      method: 'POST',
      body: { visible },
    }),
};

export const regionsApi = {
  list: () => serverFetch<Region[]>('/regions'),
};

export const discoveryApi = {
  feed: (cursor?: string, limit = 10) =>
    serverFetch<Page<DiscoveryItem>>(`/discovery${qs({ cursor, limit })}`),
  getFilter: () => serverFetch<DiscoveryFilter>('/discovery/filters'),
  saveFilter: (filter: DiscoveryFilter) =>
    serverFetch<DiscoveryFilter>('/discovery/filters', { method: 'PUT', body: filter }),
  profile: (profileId: string) => serverFetch<PublicProfile>(`/profiles/${profileId}`),
};

export const heartsApi = {
  /** message 는 선택 — 상호 하트가 되면 대화방 첫 메시지로 남는다 */
  send: (targetProfileId: string, message?: string) =>
    serverFetch<SendHeartResult>('/hearts', {
      method: 'POST',
      body: { targetProfileId, ...(message ? { message } : {}) },
    }),
  received: (cursor?: string) =>
    serverFetch<Page<ReceivedHeart>>(`/hearts/received${qs({ cursor })}`),
  unreadCount: () => serverFetch<{ count: number }>('/hearts/unread-count'),
  pass: (targetProfileId: string) =>
    serverFetch<void>('/passes', { method: 'POST', body: { targetProfileId } }),
};

/** 찜(보류) 보관함 */
export const savedApi = {
  save: (targetProfileId: string) =>
    serverFetch<SavedProfile>('/saved', { method: 'POST', body: { targetProfileId } }),
  list: () => serverFetch<SavedProfile[]>('/saved'),
  unsave: (targetProfileId: string) =>
    serverFetch<void>(`/saved/${targetProfileId}`, { method: 'DELETE' }),
};

export const connectionsApi = {
  list: (status?: string) => serverFetch<Connection[]>(`/connections${qs({ status })}`),
  /** 탭 배지용 — 아직 확인하지 않은 대화방 수 */
  unreadCount: () => serverFetch<{ count: number }>('/connections/unread-count'),
  get: (id: string) => serverFetch<Connection>(`/connections/${id}`),
  messages: (id: string, cursor?: string) =>
    serverFetch<Page<Message>>(`/connections/${id}/messages${qs({ cursor })}`),
  sendMessage: (id: string, body: string) =>
    serverFetch<Message>(`/connections/${id}/messages`, { method: 'POST', body: { body } }),
  end: (id: string, reason?: string) =>
    serverFetch<Connection>(`/connections/${id}/end`, { method: 'POST', body: { reason } }),
  /** 부모님께 공유 완료 표시 + 대화방에 기록 한 줄 */
  shareWithParent: (id: string) =>
    serverFetch<Connection>(`/connections/${id}/parent-share`, { method: 'POST' }),
};

export const meetingsApi = {
  setParentIntent: (connectionId: string, intent: ParentIntentKind) =>
    serverFetch<Connection>(`/connections/${connectionId}/parent-intent`, {
      method: 'POST',
      body: { intent },
    }),
  get: (connectionId: string) =>
    serverFetch<Meeting | null>(`/connections/${connectionId}/meeting`),
  propose: (
    connectionId: string,
    body: {
      meetAt: string;
      place: string;
      childAccompanied: boolean;
      soloReason?: string;
      safetyAck?: boolean;
    }
  ) => serverFetch<Meeting>(`/connections/${connectionId}/meeting`, { method: 'POST', body }),
  accept: (connectionId: string) =>
    serverFetch<Meeting>(`/connections/${connectionId}/meeting/accept`, { method: 'POST' }),
  confirm: (connectionId: string) =>
    serverFetch<ConfirmMeetingResult>(`/connections/${connectionId}/meeting/confirm`, {
      method: 'POST',
    }),
  // 사후 응답은 보내기만 한다. 읽는 API 는 서버에 존재하지 않는다 (PRD 12.3)
  sendFeedback: (connectionId: string, response: MeetingFeedbackKind) =>
    serverFetch<void>(`/connections/${connectionId}/meeting/feedback`, {
      method: 'POST',
      body: { response },
    }),
};

export const safetyApi = {
  report: (targetProfileId: string, reason: string, detail?: string) =>
    serverFetch<Report>('/reports', { method: 'POST', body: { targetProfileId, reason, detail } }),
  listReports: () => serverFetch<Report[]>('/reports'),
  block: (targetProfileId: string) =>
    serverFetch<Block>('/blocks', { method: 'POST', body: { targetProfileId } }),
  listBlocks: () => serverFetch<Block[]>('/blocks'),
  unblock: (blockId: string) => serverFetch<void>(`/blocks/${blockId}`, { method: 'DELETE' }),
};

export const notificationsApi = {
  list: (cursor?: string) =>
    serverFetch<Page<AppNotification>>(`/notifications${qs({ cursor })}`),
  unreadCount: () => serverFetch<{ count: number }>('/notifications/unread-count'),
  markAllRead: () => serverFetch<{ ok: boolean }>('/notifications/read-all', { method: 'POST' }),
};

/** React Query 키 — 무효화 지점을 한곳에서 본다 */
export const bootingKeys = {
  verification: ['verification'] as const,
  parentProfile: ['parent-profile'] as const,
  regions: ['regions'] as const,
  discovery: ['discovery'] as const,
  discoveryFilter: ['discovery', 'filter'] as const,
  publicProfile: (id: string) => ['profile', id] as const,
  heartsReceived: ['hearts', 'received'] as const,
  heartsUnread: ['hearts', 'unread'] as const,
  saved: ['saved'] as const,
  connections: (status?: string) => ['connections', status ?? 'all'] as const,
  connectionsUnread: ['connections', 'unread-count'] as const,
  connection: (id: string) => ['connection', id] as const,
  messages: (id: string) => ['messages', id] as const,
  meeting: (id: string) => ['meeting', id] as const,
  reports: ['reports'] as const,
  blocks: ['blocks'] as const,
  notifications: ['notifications'] as const,
  notificationsUnread: ['notifications', 'unread'] as const,
};
