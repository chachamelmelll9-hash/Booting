import { Injectable, Logger } from '@nestjs/common';

import { ConnectionStatus } from '../common/types';
import { ConnectionsService } from '../connections/connections.service';
import { NotificationsPublisher } from '../notifications/notifications.publisher';
import { SupabaseService } from '../supabase/supabase.service';

/**
 * **최종 매칭 판정의 유일한 지점.**
 *
 * PRD: '매칭 성공'은 양측이 만남을 확인한 뒤에만 성립한다. 한쪽만 확인한 상태는
 * `meeting_confirm_pending` 이며 절대 matched 가 아니다.
 *
 * 이 규칙이 여러 곳에 흩어지면 "한쪽 확인 = 성공"으로 새는 경로가 반드시 생긴다.
 * 그래서 connections.status = 'matched' 로 쓰는 코드는 이 파일에만 존재한다.
 * (모바일에는 아예 없다 — test-scenarios.md S14.2 / S19.2 가 문구 부재로 검증한다.)
 */
@Injectable()
export class MatchService {
  private readonly logger = new Logger(MatchService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly connections: ConnectionsService,
    private readonly notifications: NotificationsPublisher
  ) {}

  /**
   * 만남 확인 1건을 반영하고, 두 건이 모였을 때만 matched 로 전이한다.
   * @returns 전이 후의 connection 상태
   */
  async applyConfirmation(
    meetingId: string,
    connectionId: string,
    userId: string,
    partnerUserId: string
  ): Promise<ConnectionStatus> {
    const client = this.supabase.getClient();

    const { count } = await client
      .from('meeting_confirmations')
      .select('id', { count: 'exact', head: true })
      .eq('meeting_id', meetingId);

    const confirmations = count ?? 0;

    if (confirmations < 2) {
      await client
        .from('meetings')
        .update({ status: 'confirm_pending' })
        .eq('id', meetingId);
      await this.connections.setStatus(connectionId, 'meeting_confirm_pending');

      await this.notifications.publish({
        userId: partnerUserId,
        type: 'meeting_confirm_request',
        connectionId,
        payload: { meetingId },
      });

      this.logger.log(
        `meeting ${meetingId}: ${confirmations}/2 confirmed — still meeting_confirm_pending`
      );
      return 'meeting_confirm_pending';
    }

    await client.from('meetings').update({ status: 'completed' }).eq('id', meetingId);
    await this.connections.setStatus(connectionId, 'matched');

    await this.notifications.publishMany([
      { userId, type: 'matched', connectionId, payload: { meetingId } },
      { userId: partnerUserId, type: 'matched', connectionId, payload: { meetingId } },
    ]);

    this.logger.log(`meeting ${meetingId}: 2/2 confirmed — connection ${connectionId} matched`);
    return 'matched';
  }
}
