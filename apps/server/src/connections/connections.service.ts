import { createHmac, timingSafeEqual } from 'node:crypto';

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
   * 카카오 서버 콜백이 들고 오는 표식.
   *
   * 콜백 URL 은 공개돼 있어서 아무나 POST 할 수 있다. "누가 무엇을 보냈는지"를
   * 서버 비밀로 서명해 실어 보내고, 돌아온 값을 그 비밀로 다시 만들어 비교한다.
   * 서명이 없으면 남의 인연을 공유 완료로 바꿔 놓을 수 있다.
   */
  parentShareToken(connectionId: string, userId: string): string {
    return createHmac('sha256', this.shareSecret())
      .update(`${connectionId}:${userId}`)
      .digest('base64url');
  }

  /**
   * 카카오톡 카드의 버튼이 갈 주소.
   *
   * 앱 실행 파라미터만 넣으면 카카오톡이 버튼을 지운다 — 부모님 폰에 앱이 없고
   * (아이폰이면 더더욱) 갈 곳이 없다고 보기 때문이다. 실제로 카드는 왔는데
   * '자세히 보기' 가 없었다 (실측). 어느 기기에서나 열리는 웹 주소를 준다.
   *
   * 바깥에서 닿는 주소여야 한다 — localhost 나 10.0.2.2 를 보내면 부모님
   * 폰에서 열리지 않는다. 동의 링크와 같은 환경변수를 쓴다.
   */
  parentOpenUrl(connectionId: string): string {
    const base = process.env.PUBLIC_BASE_URL;
    if (!base) {
      throw new BadRequestException({
        code: 'public_url_missing',
        message: '공유 링크 주소가 설정되지 않았습니다',
      });
    }
    return `${base.replace(/\/$/, '')}/open/${connectionId}`;
  }

  verifyParentShareToken(connectionId: string, userId: string, token: string): boolean {
    const expected = this.parentShareToken(connectionId, userId);
    // 길이가 다르면 timingSafeEqual 이 던진다
    if (expected.length !== token.length) return false;
    return timingSafeEqual(Buffer.from(expected), Buffer.from(token));
  }

  private shareSecret(): string {
    // 서버 전용 키를 그대로 쓴다 — 이 값이 새면 어차피 DB 가 통째로 열린다
    return process.env.SUPABASE_SECRET_KEY ?? 'booting-dev-share-secret';
  }

  /**
   * 부모님께 프로필이 실제로 전달됐다고 기록한다.
   *
   * 부르는 곳은 카카오 서버 콜백 하나뿐이다 — 카카오톡으로 **메시지가 전송된**
   * 순간에만 카카오가 우리를 부른다. 앱에는 이 기록을 만드는 경로가 없다.
   * 있으면 공유 화면만 열었다 나와도 '공유 완료'가 되기 때문이다.
   *
   * 카카오는 보낸 대화방 수만큼 콜백을 준다. 그래서 처음 한 번만 기록하고
   * (`23505` 는 이미 보낸 것), 대화방 기록도 그때만 남긴다 — 두 번 보내면
   * 같은 줄이 두 번 찍힌다.
   */
  async markParentShare(connectionId: string, userId: string): Promise<ConnectionDto> {
    const ctx = await this.requireParticipant(connectionId, userId);

    const { error } = await this.supabase
      .getClient()
      .from('parent_shares')
      .insert({ connection_id: connectionId, user_id: userId });

    const alreadyShared = error?.code === '23505';
    if (error && !alreadyShared) {
      throw new BadRequestException({ code: 'parent_share_failed', message: error.message });
    }

    if (!alreadyShared) await this.postShareNotice(connectionId, userId, ctx.myProfileId);

    // 부모님께 넘어간 순간 인연은 '부모님 확인 중'이 된다. 이제 공은 부모님께 있다.
    if (['mutual_heart', 'chatting'].includes(ctx.row.status as string)) {
      await this.setStatus(connectionId, 'parent_intent');
      const { data: fresh } = await this.supabase
        .getClient()
        .from('connections')
        .select('*')
        .eq('id', connectionId)
        .maybeSingle();
      if (fresh) return this.toDto(fresh, userId);
    }

    return this.toDto(ctx.row, userId);
  }

  /**
   * "…님의 자녀가 프로필을 공유했습니다" 를 대화방에 남긴다.
   *
   * 상대는 이 한 줄로 저쪽 집에서 이야기가 오가는 중임을 안다 — 이 앱에서
   * 가장 알고 싶은 신호다.
   *
   * `MessagesService.postSystemMessage` 를 쓰지 않고 직접 넣는다. 그쪽이 이미
   * 이 서비스를 주입받고 있어 반대로 주입하면 순환이 된다. 넣는 값이 세 개뿐이라
   * forwardRef 를 끌어오는 것보다 이게 읽기 쉽다.
   *
   * 실패해도 던지지 않는다. 이건 곁들이는 알림이고, 여기서 던지면 카카오
   * 콜백이 실패로 남아 정작 중요한 '공유 완료'가 안 찍힌다.
   */
  private async postShareNotice(connectionId: string, userId: string, myProfileId: string) {
    const client = this.supabase.getClient();
    const [profileRes, convRes] = await Promise.all([
      client.from('parent_profiles').select('nickname, display_name').eq('id', myProfileId).maybeSingle(),
      client.from('conversations').select('id').eq('connection_id', connectionId).maybeSingle(),
    ]);
    if (!convRes.data) return;

    const nickname = profileRes.data?.nickname || profileRes.data?.display_name || '상대';
    const { error } = await client.from('messages').insert({
      conversation_id: convRes.data.id,
      sender_user_id: userId,
      body: `${nickname} 님의 자녀가 프로필을 공유했습니다.`,
      kind: 'system',
    });
    if (error) this.logger.warn(`parent share notice failed: ${error.message}`);
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
      /**
       * 부모님의 결정.
       *
       * 예전에는 자녀가 부모님을 대신해 눌렀다(`parent_intents`). 지금은
       * 부모님이 자기 화면에서 직접 고르고(`parent_interests`), 자녀는 그
       * 결과만 본다. 자녀 화면에 '부모님이 만나보신대요' 버튼은 없앴다.
       */
      client
        .from('parent_interests')
        .select('parent_profile_id, kind')
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

    // 'interested'/'declined' 를 기존 DTO 어휘('willing'/'declined')로 옮긴다 —
    // 자녀 화면은 결정 주체가 바뀐 걸 알 필요가 없다
    const interests = intentRes.data ?? [];
    const mine = interests.find((i) => i.parent_profile_id === myProfileId)?.kind;
    const myIntent = mine ? (mine === 'interested' ? 'willing' : 'declined') : null;
    const partnerResponded = interests.some((i) => i.parent_profile_id === partnerProfileId);

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
        badges: { consent: false, review: false },
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
