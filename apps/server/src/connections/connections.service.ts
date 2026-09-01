import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { domainError, ERROR_CODES } from '../common/constants/errors';
import { ConnectionStatus } from '../common/types';
import { DiscoveryService } from '../discovery/discovery.service';
import { SupabaseService } from '../supabase/supabase.service';
import { ConnectionDto } from './dto/connections.dto';

export interface ConnectionContext {
  row: Record<string, any>;
  meUserId: string;
  partnerUserId: string;
  myProfileId: string;
  partnerProfileId: string;
}

@Injectable()
export class ConnectionsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly discovery: DiscoveryService
  ) {}

  /**
   * 참여자 확인 + 양쪽 식별자 정리.
   *
   * 인연 관련 모든 경로가 이 한 곳을 지난다 — connection id 만 알면 남의 대화를
   * 읽을 수 있는 IDOR 를 구조적으로 막기 위해서다.
   */
  async requireParticipant(
    connectionId: string,
    userId: string
  ): Promise<ConnectionContext> {
    const { data } = await this.supabase
      .getClient()
      .from('connections')
      .select('*')
      .eq('id', connectionId)
      .maybeSingle();

    if (!data) throw new NotFoundException(domainError(ERROR_CODES.CONNECTION_NOT_FOUND));

    const isA = data.user_a_id === userId;
    const isB = data.user_b_id === userId;
    if (!isA && !isB) {
      // 존재 여부조차 알려주지 않는다
      throw new NotFoundException(domainError(ERROR_CODES.CONNECTION_NOT_FOUND));
    }

    return {
      row: data,
      meUserId: userId,
      partnerUserId: isA ? data.user_b_id : data.user_a_id,
      myProfileId: isA ? data.parent_profile_a_id : data.parent_profile_b_id,
      partnerProfileId: isA ? data.parent_profile_b_id : data.parent_profile_a_id,
    };
  }

  async list(userId: string, status?: ConnectionStatus): Promise<ConnectionDto[]> {
    const client = this.supabase.getClient();

    let query = client
      .from('connections')
      .select('*')
      .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
      .order('updated_at', { ascending: false });
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const rows = data ?? [];
    if (!rows.length) return [];

    return Promise.all(rows.map((row) => this.toDto(row, userId)));
  }

  async getOne(connectionId: string, userId: string): Promise<ConnectionDto> {
    const ctx = await this.requireParticipant(connectionId, userId);
    return this.toDto(ctx.row, userId);
  }

  async toDto(row: Record<string, any>, userId: string): Promise<ConnectionDto> {
    const client = this.supabase.getClient();
    const isA = row.user_a_id === userId;
    const partnerProfileId = isA ? row.parent_profile_b_id : row.parent_profile_a_id;
    const myProfileId = isA ? row.parent_profile_a_id : row.parent_profile_b_id;
    const partnerUserId = isA ? row.user_b_id : row.user_a_id;

    const [partnerRes, meRes, convRes, intentRes, meetingRes] = await Promise.all([
      client.from('parent_profiles').select('*').eq('id', partnerProfileId).maybeSingle(),
      client.from('parent_profiles').select('region_code').eq('id', myProfileId).maybeSingle(),
      client
        .from('conversations')
        .select('id, read_only_at')
        .eq('connection_id', row.id)
        .maybeSingle(),
      client
        .from('parent_intents')
        .select('user_id, intent')
        .eq('connection_id', row.id),
      client
        .from('meetings')
        .select('id, status')
        .eq('connection_id', row.id)
        .not('status', 'eq', 'cancelled')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const [partner] = await this.discovery.toItems(
      partnerRes.data ? [partnerRes.data] : [],
      meRes.data?.region_code ?? ''
    );

    let lastMessage: ConnectionDto['lastMessage'] = null;
    let unreadCount = 0;

    if (convRes.data) {
      const [lastRes, unreadRes] = await Promise.all([
        client
          .from('messages')
          .select('body, sent_at, sender_user_id')
          .eq('conversation_id', convRes.data.id)
          .order('sent_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        client
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', convRes.data.id)
          .eq('sender_user_id', partnerUserId)
          .is('read_at', null),
      ]);

      if (lastRes.data) {
        lastMessage = {
          body: lastRes.data.body,
          sentAt: lastRes.data.sent_at,
          mine: lastRes.data.sender_user_id === userId,
        };
      }
      unreadCount = unreadRes.count ?? 0;
    }

    const intents = intentRes.data ?? [];
    const myIntent = intents.find((i) => i.user_id === userId)?.intent ?? null;
    const partnerResponded = intents.some((i) => i.user_id === partnerUserId);

    return {
      id: row.id,
      status: row.status,
      partner: partner ?? {
        profileId: partnerProfileId,
        nickname: '',
        age: 0,
        region: '',
        distanceKm: null,
        maritalStatus: 'bereaved',
        goals: [],
        primaryPhotoUrl: '',
        introExcerpt: '',
        badges: { child: false, family: false, consent: false, review: false },
      },
      lastMessage,
      unreadCount,
      readOnly: !!convRes.data?.read_only_at || row.status === 'ended',
      myParentIntent: myIntent,
      partnerRespondedIntent: partnerResponded,
      meetingId: meetingRes.data?.id ?? null,
      endedReason: row.ended_reason,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async end(connectionId: string, userId: string, reason?: string): Promise<ConnectionDto> {
    const ctx = await this.requireParticipant(connectionId, userId);

    if (ctx.row.status === 'ended') {
      throw new ForbiddenException(domainError(ERROR_CODES.CONNECTION_ENDED));
    }

    await this.supabase
      .getClient()
      .from('connections')
      .update({
        status: 'ended',
        ended_reason: reason ?? null,
        ended_at: new Date().toISOString(),
      })
      .eq('id', connectionId);

    return this.getOne(connectionId, userId);
  }

  /** 상태 전이는 서버만 한다 — meetings 모듈이 호출한다 */
  async setStatus(connectionId: string, status: ConnectionStatus): Promise<void> {
    await this.supabase
      .getClient()
      .from('connections')
      .update({
        status,
        ...(status === 'matched' ? { matched_at: new Date().toISOString() } : {}),
      })
      .eq('id', connectionId);
  }
}
