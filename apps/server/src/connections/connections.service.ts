import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
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
  private readonly logger = new Logger(ConnectionsService.name);

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

    /**
     * 종료된 인연은 목록에 싣지 않는다.
     *
     * 대화 나가기·차단·신고로 끝난 관계는 되돌릴 수 없고 방에 들어가도 할 수
     * 있는 게 없다. "대화 종료" 카드로 남겨 두면 목록이 무덤이 되고, 진행 중인
     * 인연이 그 사이에 묻힌다.
     *
     * 상태 문구(`ended`)는 지우지 않는다 — 방 안에 있는 동안 상대가 나가면
     * 그 자리에서 알려 줘야 한다.
     */
    let query = client
      .from('connections')
      .select('*')
      .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
      .neq('status', 'ended')
      .order('updated_at', { ascending: false });
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const rows = data ?? [];
    if (!rows.length) return [];

    /**
     * 차단한(= 신고한) 상대와의 대화도 지운다.
     *
     * 차단은 인연을 `ended` 로 끝내니 위 필터에 이미 걸리지만, 어떤 이유로
     * 인연이 살아 있어도 차단한 상대는 목록에 보이면 안 된다. 차단당한 쪽에서도
     * 사라져야 한다 — 한쪽에만 남으면 상대가 왜 답이 없는지 모른 채 계속 말을 건다.
     */
    const [mine, theirs] = await Promise.all([
      client.from('blocks').select('blocked_user_id').eq('user_id', userId),
      client.from('blocks').select('user_id').eq('blocked_user_id', userId),
    ]);
    const blocked = new Set<string>([
      ...(mine.data ?? []).map((b) => b.blocked_user_id as string),
      ...(theirs.data ?? []).map((b) => b.user_id as string),
    ]);

    const visible = rows.filter(
      (row) => !blocked.has(row.user_a_id === userId ? row.user_b_id : row.user_a_id)
    );
    if (!visible.length) return [];

    return Promise.all(visible.map((row) => this.toDto(row, userId)));
  }

  /**
   * 탭 배지용 — 아직 확인하지 않은 대화방 수.
   *
   * `list()` 를 세는 방식은 쓰지 않는다. 그쪽은 방 하나당 쿼리 5~6번을 돌려
   * 카드 한 장을 다 만든다. 배지는 30초마다 물어보는 값이라, 개수만 세는
   * 쿼리 몇 개로 끝내야 한다.
   */
  async unseenCount(userId: string): Promise<number> {
    const client = this.supabase.getClient();

    const { data: rows } = await client
      .from('connections')
      .select('id, user_a_id, user_b_id, status')
      .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
      .neq('status', 'ended');
    if (!rows?.length) return 0;

    // 목록에서 빠지는 대화는 배지에서도 빠져야 한다 (차단·신고한 상대)
    const [mine, theirs] = await Promise.all([
      client.from('blocks').select('blocked_user_id').eq('user_id', userId),
      client.from('blocks').select('user_id').eq('blocked_user_id', userId),
    ]);
    const blocked = new Set<string>([
      ...(mine.data ?? []).map((b) => b.blocked_user_id as string),
      ...(theirs.data ?? []).map((b) => b.user_id as string),
    ]);
    const visible = rows.filter(
      (r) => !blocked.has(r.user_a_id === userId ? r.user_b_id : r.user_a_id)
    );
    if (!visible.length) return 0;

    const { data: conversations } = await client
      .from('conversations')
      .select('id, connection_id')
      .in(
        'connection_id',
        visible.map((r) => r.id as string)
      );

    // 대화방 행이 아직 없는 인연은 열어본 적이 없는 새 대화다
    const withConversation = new Set((conversations ?? []).map((c) => c.connection_id as string));
    let count = visible.filter((r) => !withConversation.has(r.id as string)).length;

    const conversationIds = (conversations ?? []).map((c) => c.id as string);
    if (!conversationIds.length) return count;

    const [reads, unreadMessages] = await Promise.all([
      client
        .from('conversation_reads')
        .select('conversation_id')
        .eq('user_id', userId)
        .in('conversation_id', conversationIds),
      client
        .from('messages')
        .select('conversation_id')
        .in('conversation_id', conversationIds)
        .neq('sender_user_id', userId)
        .is('read_at', null),
    ]);

    const opened = new Set((reads.data ?? []).map((r) => r.conversation_id as string));
    const hasUnread = new Set((unreadMessages.data ?? []).map((m) => m.conversation_id as string));

    count += conversationIds.filter((id) => !opened.has(id) || hasUnread.has(id)).length;
    return count;
  }

  /**
   * 부모님께 프로필을 공유했다고 기록한다.
   *
   * 실제 전송(카카오톡·공유 시트)은 기기에서 일어나고 서버가 확인할 방법이 없다.
   * 그래서 이건 "보냈다고 표시한 시각"이지 전송 증명이 아니다 — 자녀가 여러
   * 인연을 들고 있을 때 누구를 이미 보여드렸는지 기억해 주는 게 목적이다.
   *
   * 다시 눌러도 처음 시각을 유지한다 (`ignoreDuplicates`) — 두 번 공유했다고
   * 기록이 덮이면 "언제 보여드렸더라"의 답이 틀어진다.
   */
  async markParentShare(connectionId: string, userId: string): Promise<ConnectionDto> {
    const ctx = await this.requireParticipant(connectionId, userId);

    const { error } = await this.supabase
      .getClient()
      .from('parent_shares')
      .upsert(
        { connection_id: connectionId, user_id: userId },
        { onConflict: 'connection_id,user_id', ignoreDuplicates: true }
      );
    if (error) {
      throw new BadRequestException({ code: 'parent_share_failed', message: error.message });
    }

    return this.toDto(ctx.row, userId);
  }

  /** 내 부모님 별명 — 시스템 메시지 문구에 쓴다 */
  async myParentNickname(connectionId: string, userId: string): Promise<string> {
    const ctx = await this.requireParticipant(connectionId, userId);
    const { data } = await this.supabase
      .getClient()
      .from('parent_profiles')
      .select('nickname, display_name')
      .eq('id', ctx.myProfileId)
      .maybeSingle();
    return data?.nickname || data?.display_name || '상대';
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

    const [partnerRes, meRes, convRes, intentRes, meetingRes, shareRes] = await Promise.all([
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
      client
        .from('parent_shares')
        .select('shared_at')
        .eq('connection_id', row.id)
        .eq('user_id', userId)
        .maybeSingle(),
    ]);

    const [partner] = await this.discovery.toItems(
      partnerRes.data ? [partnerRes.data] : [],
      meRes.data?.region_code ?? ''
    );

    let lastMessage: ConnectionDto['lastMessage'] = null;
    let unreadCount = 0;
    /**
     * 아직 확인하지 않은 대화방.
     *
     * 안 읽은 메시지가 있거나, **한 번도 열어보지 않았거나**. 두 번째 조건이
     * 없으면 인사말 없이 열린 새 대화방이 목록에서 아무 표시 없이 지나간다.
     * 대화방이 아직 없는 인연도 열어본 적 없는 새 대화다.
     */
    let unseen = true;

    if (convRes.data) {
      const [lastRes, unreadRes, readRes] = await Promise.all([
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
        client
          .from('conversation_reads')
          .select('read_at')
          .eq('conversation_id', convRes.data.id)
          .eq('user_id', userId)
          .maybeSingle(),
      ]);

      if (lastRes.data) {
        lastMessage = {
          body: lastRes.data.body,
          sentAt: lastRes.data.sent_at,
          mine: lastRes.data.sender_user_id === userId,
        };
      }
      unreadCount = unreadRes.count ?? 0;
      unseen = unreadCount > 0 || !readRes.data;
    }
    // 끝난 대화는 열어볼 이유가 없다 — 안 열면 배지가 영영 안 꺼진다
    if (row.status === 'ended') unseen = false;

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
      unseen,
      sharedWithParent: !!shareRes.data,
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

  /**
   * 상태 전이는 서버만 한다 — meetings·hearts 모듈이 호출한다.
   *
   * `matched` 는 종착점이다. 매칭된 뒤에 만남 일정 API 를 부르더라도 상태를
   * 되돌리지 않는다 — 한 번 '매칭 성공'을 본 사용자에게 그게 취소된 것처럼
   * 보이면 안 된다. 되돌릴 수 있는 건 종료뿐이다.
   *
   * 실제로 적용된 상태를 돌려준다 (거부됐으면 기존 상태).
   */
  async setStatus(connectionId: string, status: ConnectionStatus): Promise<ConnectionStatus> {
    const client = this.supabase.getClient();

    const { data: current } = await client
      .from('connections')
      .select('status')
      .eq('id', connectionId)
      .maybeSingle();

    const currentStatus = current?.status as ConnectionStatus | undefined;
    if (currentStatus === 'matched' && status !== 'ended') return 'matched';

    const { error } = await client
      .from('connections')
      .update({
        status,
        ...(status === 'matched' ? { matched_at: new Date().toISOString() } : {}),
      })
      .eq('id', connectionId);

    if (error) {
      // 조용히 넘기면 '메시지는 보냈는데 상태는 그대로'인 인연이 남는다
      this.logger.error(`setStatus(${connectionId}, ${status}) failed: ${error.message}`);
      return currentStatus ?? status;
    }
    return status;
  }
}
