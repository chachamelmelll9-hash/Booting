import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { domainError, ERROR_CODES } from '../common/constants/errors';
import { Page } from '../common/dto/pagination.dto';
import { NotificationsPublisher } from '../notifications/notifications.publisher';
import { SupabaseService } from '../supabase/supabase.service';
import { ConnectionsService } from './connections.service';
import { MessageDto } from './dto/connections.dto';

@Injectable()
export class MessagesService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly connections: ConnectionsService,
    private readonly notifications: NotificationsPublisher
  ) {}

  /** 대화방은 상호 하트 시점에 만들어지지만, 없으면 여기서 만든다 (자기 치유) */
  private async conversationFor(
    connectionId: string
  ): Promise<{ id: string; read_only_at: string | null }> {
    const client = this.supabase.getClient();
    const { data } = await client
      .from('conversations')
      .select('id, read_only_at')
      .eq('connection_id', connectionId)
      .maybeSingle();

    if (data) return data;

    const { data: created, error } = await client
      .from('conversations')
      .insert({ connection_id: connectionId })
      .select('id, read_only_at')
      .single();

    if (error || !created) {
      throw new BadRequestException({
        code: 'conversation_failed',
        message: error?.message ?? '대화방을 열지 못했습니다',
      });
    }
    return created;
  }

  async list(
    connectionId: string,
    userId: string,
    cursor?: string,
    limit = 30
  ): Promise<Page<MessageDto>> {
    await this.connections.requireParticipant(connectionId, userId);
    const conversation = await this.conversationFor(connectionId);

    const client = this.supabase.getClient();
    let query = client
      .from('messages')
      .select('*')
      .eq('conversation_id', conversation.id)
      .order('sent_at', { ascending: false })
      .limit(limit + 1);
    if (cursor) query = query.lt('sent_at', cursor);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const rows = data ?? [];
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    // 상대가 보낸 안 읽은 메시지를 읽음 처리
    await client
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('conversation_id', conversation.id)
      .neq('sender_user_id', userId)
      .is('read_at', null);

    // 방을 열었다는 사실 자체를 남긴다 — 메시지가 하나도 없는 새 대화방은
    // 메시지 읽음 처리만으로는 "확인함"이 되지 않는다 (목록 하이라이트 기준)
    await client
      .from('conversation_reads')
      .upsert(
        { conversation_id: conversation.id, user_id: userId, read_at: new Date().toISOString() },
        { onConflict: 'conversation_id,user_id' }
      );

    return {
      items: page.map((r) => ({
        id: r.id,
        body: r.body,
        sentAt: r.sent_at,
        mine: r.sender_user_id === userId,
        read: !!r.read_at,
      })),
      nextCursor: hasMore && page.length ? page[page.length - 1].sent_at : null,
    };
  }

  async send(connectionId: string, userId: string, body: string): Promise<MessageDto> {
    const ctx = await this.connections.requireParticipant(connectionId, userId);

    if (ctx.row.status === 'ended') {
      throw new ForbiddenException(domainError(ERROR_CODES.CONNECTION_ENDED));
    }

    const conversation = await this.conversationFor(connectionId);
    if (conversation.read_only_at) {
      throw new ForbiddenException(domainError(ERROR_CODES.CONVERSATION_READ_ONLY));
    }

    const client = this.supabase.getClient();
    const { data, error } = await client
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        sender_user_id: userId,
        body,
      })
      .select('*')
      .single();

    if (error) throw new BadRequestException({ code: 'message_failed', message: error.message });

    // 첫 메시지가 오가면 '대화 중'으로 올라간다. '매칭 성공'이 아니다.
    if (ctx.row.status === 'mutual_heart') {
      await this.connections.setStatus(connectionId, 'chatting');
    }

    await this.notifications.publish({
      userId: ctx.partnerUserId,
      type: 'message',
      connectionId,
      payload: { preview: body.slice(0, 40) },
    });

    return {
      id: data.id,
      body: data.body,
      sentAt: data.sent_at,
      mine: true,
      read: false,
    };
  }
}
