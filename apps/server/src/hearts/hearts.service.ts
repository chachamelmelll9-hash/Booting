import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { domainError, ERROR_CODES } from '../common/constants/errors';
import { Page } from '../common/dto/pagination.dto';
import { DiscoveryService } from '../discovery/discovery.service';
import { NotificationsPublisher } from '../notifications/notifications.publisher';
import { SupabaseService } from '../supabase/supabase.service';
import { ReceivedHeartDto, SendHeartResponse } from './dto/hearts.dto';

@Injectable()
export class HeartsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly discovery: DiscoveryService,
    private readonly notifications: NotificationsPublisher
  ) {}

  /**
   * 관심(하트) 보내기.
   *
   * 상호 하트 판정과 Connection 생성이 여기 한 곳에 있다. 클라이언트는
   * `mutual` 결과만 받고, '매칭 성공' 같은 상위 상태로 해석하지 않는다 —
   * 상호 하트는 **대화 연결**일 뿐이다 (PRD 10.3).
   */
  async send(
    userId: string,
    myProfileId: string,
    targetProfileId: string
  ): Promise<SendHeartResponse> {
    const client = this.supabase.getClient();

    if (targetProfileId === myProfileId) {
      throw new BadRequestException(domainError(ERROR_CODES.HEART_SELF));
    }

    const { data: target } = await client
      .from('parent_profiles')
      .select('id, user_id, status')
      .eq('id', targetProfileId)
      .eq('status', 'published')
      .maybeSingle();
    if (!target) throw new NotFoundException(domainError(ERROR_CODES.PROFILE_NOT_FOUND));

    const { data: block } = await client
      .from('blocks')
      .select('id')
      .or(
        `and(user_id.eq.${userId},blocked_user_id.eq.${target.user_id}),and(user_id.eq.${target.user_id},blocked_user_id.eq.${userId})`
      )
      .maybeSingle();
    if (block) throw new ForbiddenException(domainError(ERROR_CODES.BLOCKED));

    const { error } = await client.from('hearts').insert({
      sender_user_id: userId,
      target_parent_profile_id: targetProfileId,
    });
    if (error) {
      // unique(sender, target) 위반 = 이미 보낸 하트
      if (error.code === '23505') {
        throw new BadRequestException(domainError(ERROR_CODES.HEART_ALREADY_SENT));
      }
      throw new BadRequestException({ code: 'heart_failed', message: error.message });
    }

    // 역방향 하트가 있는가 — 상대가 내 부모님 프로필에 하트를 보냈는가
    const { data: reverse } = await client
      .from('hearts')
      .select('id')
      .eq('sender_user_id', target.user_id)
      .eq('target_parent_profile_id', myProfileId)
      .maybeSingle();

    if (!reverse) {
      await this.notifications.publish({
        userId: target.user_id,
        type: 'heart_received',
        payload: { profileId: myProfileId },
      });
      return { mutual: false, connectionId: null };
    }

    const connectionId = await this.createConnection(
      userId,
      myProfileId,
      target.user_id,
      targetProfileId
    );

    await this.notifications.publishMany([
      { userId, type: 'mutual_heart', connectionId, payload: { profileId: targetProfileId } },
      {
        userId: target.user_id,
        type: 'mutual_heart',
        connectionId,
        payload: { profileId: myProfileId },
      },
    ]);

    return { mutual: true, connectionId };
  }

  private async createConnection(
    userId: string,
    myProfileId: string,
    otherUserId: string,
    otherProfileId: string
  ): Promise<string> {
    const client = this.supabase.getClient();

    // 두 사람이 동시에 하트를 눌러도 인연은 하나여야 한다.
    // connections_pair_uniq (least/greatest) 가 경합을 막고, 여기서는 그 결과를 읽어 온다.
    const { data: inserted, error } = await client
      .from('connections')
      .insert({
        user_a_id: userId,
        user_b_id: otherUserId,
        parent_profile_a_id: myProfileId,
        parent_profile_b_id: otherProfileId,
        status: 'mutual_heart',
      })
      .select('id')
      .maybeSingle();

    let connectionId = inserted?.id as string | undefined;

    if (error) {
      if (error.code !== '23505') {
        throw new BadRequestException({ code: 'connection_failed', message: error.message });
      }
      const { data: existing } = await client
        .from('connections')
        .select('id')
        .or(
          `and(user_a_id.eq.${userId},user_b_id.eq.${otherUserId}),and(user_a_id.eq.${otherUserId},user_b_id.eq.${userId})`
        )
        .maybeSingle();
      connectionId = existing?.id;
    }

    if (!connectionId) {
      throw new BadRequestException({
        code: 'connection_failed',
        message: '인연을 만들지 못했습니다',
      });
    }

    await client
      .from('conversations')
      .upsert({ connection_id: connectionId }, { onConflict: 'connection_id' });

    return connectionId;
  }

  async pass(userId: string, targetProfileId: string): Promise<void> {
    // 넘기기는 되돌릴 수 없다 (PRD). 중복 호출은 조용히 흡수한다.
    await this.supabase
      .getClient()
      .from('passes')
      .upsert(
        { user_id: userId, target_parent_profile_id: targetProfileId },
        { onConflict: 'user_id,target_parent_profile_id' }
      );
  }

  async received(
    userId: string,
    myProfileId: string,
    cursor?: string,
    limit = 20
  ): Promise<Page<ReceivedHeartDto>> {
    const client = this.supabase.getClient();

    let query = client
      .from('hearts')
      .select('id, sender_user_id, created_at, read_at')
      .eq('target_parent_profile_id', myProfileId) // 내 프로필이 받은 것만
      .order('created_at', { ascending: false })
      .limit(limit + 1);
    if (cursor) query = query.lt('created_at', cursor);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const rows = data ?? [];
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    if (!page.length) return { items: [], nextCursor: null };

    // 차단한 상대의 하트는 보이지 않아야 한다
    const senderIds = page.map((r) => r.sender_user_id);
    const { data: blocks } = await client
      .from('blocks')
      .select('user_id, blocked_user_id')
      .or(`user_id.eq.${userId},blocked_user_id.eq.${userId}`);
    const blocked = new Set<string>();
    for (const b of blocks ?? []) {
      blocked.add(b.user_id === userId ? b.blocked_user_id : b.user_id);
    }

    const visible = page.filter((r) => !blocked.has(r.sender_user_id));

    const { data: profiles } = await client
      .from('parent_profiles')
      .select('*')
      .in('user_id', senderIds)
      .eq('status', 'published');

    const { data: me } = await client
      .from('parent_profiles')
      .select('region_code')
      .eq('id', myProfileId)
      .maybeSingle();

    const items = await this.discovery.toItems(profiles ?? [], me?.region_code ?? '');
    const byUser = new Map(
      (profiles ?? []).map((p, i) => [p.user_id, items[i]])
    );

    // 목록을 연 시점에 읽음 처리 — 카드/컴팩트 변형 판정에 쓰인다
    await client
      .from('hearts')
      .update({ read_at: new Date().toISOString() })
      .eq('target_parent_profile_id', myProfileId)
      .is('read_at', null);

    return {
      items: visible
        .filter((r) => byUser.has(r.sender_user_id))
        .map((r) => ({
          heartId: r.id,
          createdAt: r.created_at,
          read: !!r.read_at,
          profile: byUser.get(r.sender_user_id)!,
        })),
      nextCursor: hasMore && page.length ? page[page.length - 1].created_at : null,
    };
  }

  async unreadCount(myProfileId: string): Promise<number> {
    const { count } = await this.supabase
      .getClient()
      .from('hearts')
      .select('id', { count: 'exact', head: true })
      .eq('target_parent_profile_id', myProfileId)
      .is('read_at', null);
    return count ?? 0;
  }
}
