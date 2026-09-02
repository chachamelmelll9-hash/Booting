import { Injectable } from '@nestjs/common';

import { Page } from '../common/dto/pagination.dto';
import { maskName } from '../common/privacy';
import { SupabaseService } from '../supabase/supabase.service';
import { NotificationDto } from './dto/notification.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly supabase: SupabaseService) {}

  async list(
    userId: string,
    cursor?: string,
    limit = 20
  ): Promise<Page<NotificationDto>> {
    let query = this.supabase
      .getClient()
      .from('notifications')
      .select('*')
      .eq('user_id', userId) // IDOR 방어: RLS 이전에 쿼리에서 스코프한다
      .order('created_at', { ascending: false })
      .limit(limit + 1);

    if (cursor) query = query.lt('created_at', cursor);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const rows = data ?? [];
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    const nicknames = await this.resolveNicknames(page, userId);

    return {
      items: page.map((r) => this.toDto(r, nicknames.get(r.id) ?? null)),
      nextCursor: hasMore && page.length ? page[page.length - 1].created_at : null,
    };
  }

  /**
   * 알림 한 줄에 들어갈 상대 별명.
   *
   * "대화가 연결되었습니다" 만으로는 누구와 연결됐는지 알 수 없어, 알림을 열어
   * 대화방까지 들어가 봐야 안다. 이름은 알림이 답해야 할 첫 번째 질문이다.
   *
   * 별명을 payload 에 박아두지 않고 조회 시점에 푸는 이유: 상대가 별명을 바꾸면
   * 지난 알림만 옛 이름으로 남는다. 목록 한 페이지당 쿼리 2번으로 끝난다.
   */
  private async resolveNicknames(
    rows: Record<string, any>[],
    userId: string
  ): Promise<Map<string, string>> {
    const client = this.supabase.getClient();

    // 하트 계열은 payload 에 상대 프로필이 들어 있고, 나머지는 인연에서 찾는다
    const profileIdByRow = new Map<string, string>();
    const connectionIds = new Set<string>();
    for (const row of rows) {
      const profileId = (row.payload ?? {}).profileId as string | undefined;
      if (profileId) profileIdByRow.set(row.id, profileId);
      else if (row.connection_id) connectionIds.add(row.connection_id as string);
    }

    if (connectionIds.size) {
      const { data: connections } = await client
        .from('connections')
        .select('id, user_a_id, parent_profile_a_id, parent_profile_b_id')
        .in('id', [...connectionIds]);

      const partnerByConnection = new Map(
        (connections ?? []).map((c) => [
          c.id as string,
          (c.user_a_id === userId ? c.parent_profile_b_id : c.parent_profile_a_id) as string,
        ])
      );

      for (const row of rows) {
        if (profileIdByRow.has(row.id) || !row.connection_id) continue;
        const partnerId = partnerByConnection.get(row.connection_id as string);
        if (partnerId) profileIdByRow.set(row.id, partnerId);
      }
    }

    const profileIds = [...new Set(profileIdByRow.values())];
    if (!profileIds.length) return new Map();

    const { data: profiles } = await client
      .from('parent_profiles')
      .select('id, display_name, nickname')
      .in('id', profileIds);

    // 공개 표기는 별명을 쓰고, 별명이 없는 옛 데이터만 마스킹으로 폴백한다
    const nameById = new Map(
      (profiles ?? []).map((p) => [p.id as string, (p.nickname || maskName(p.display_name)) as string])
    );

    const result = new Map<string, string>();
    for (const [rowId, profileId] of profileIdByRow) {
      const name = nameById.get(profileId);
      if (name) result.set(rowId, name);
    }
    return result;
  }

  async markAllRead(userId: string): Promise<void> {
    await this.supabase
      .getClient()
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('read_at', null);
  }

  async unreadCount(userId: string): Promise<number> {
    const { count } = await this.supabase
      .getClient()
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('read_at', null);
    return count ?? 0;
  }

  private toDto(row: Record<string, any>, nickname: string | null): NotificationDto {
    return {
      id: row.id,
      type: row.type,
      connectionId: row.connection_id,
      nickname,
      payload: row.payload ?? {},
      read: !!row.read_at,
      createdAt: row.created_at,
    };
  }
}
