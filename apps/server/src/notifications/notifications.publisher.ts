import { Injectable, Logger } from '@nestjs/common';

import { NotificationKind } from '../common/types';
import { SupabaseService } from '../supabase/supabase.service';

export interface PublishInput {
  userId: string;
  type: NotificationKind;
  connectionId?: string | null;
  payload?: Record<string, unknown>;
}

/**
 * 다른 모듈이 호출하는 알림 발행 API.
 *
 * 알림 실패가 본 동작(하트·메시지·만남 확인)을 되돌리면 안 된다 —
 * 그래서 여기서 던지지 않고 로그만 남긴다.
 */
@Injectable()
export class NotificationsPublisher {
  private readonly logger = new Logger(NotificationsPublisher.name);

  constructor(private readonly supabase: SupabaseService) {}

  async publish(input: PublishInput): Promise<void> {
    const { error } = await this.supabase.getClient().from('notifications').insert({
      user_id: input.userId,
      type: input.type,
      connection_id: input.connectionId ?? null,
      payload: input.payload ?? {},
    });
    if (error) {
      this.logger.warn(
        `notification publish failed (${input.type}): ${error.message}`
      );
    }
  }

  async publishMany(inputs: PublishInput[]): Promise<void> {
    await Promise.all(inputs.map((i) => this.publish(i)));
  }
}
