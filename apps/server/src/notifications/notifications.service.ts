import { Injectable } from '@nestjs/common';

import { Page } from '../common/dto/pagination.dto';
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

    return {
      items: page.map((r) => this.toDto(r)),
      nextCursor: hasMore && page.length ? page[page.length - 1].created_at : null,
    };
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

  private toDto(row: Record<string, any>): NotificationDto {
    return {
      id: row.id,
      type: row.type,
      connectionId: row.connection_id,
      payload: row.payload ?? {},
      read: !!row.read_at,
      createdAt: row.created_at,
    };
  }
}
