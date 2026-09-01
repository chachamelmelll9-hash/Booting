import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { domainError, ERROR_CODES } from '../common/constants/errors';
import { ParentIntentKind } from '../common/types';
import { ConnectionsService } from '../connections/connections.service';
import { ConnectionDto } from '../connections/dto/connections.dto';
import { NotificationsPublisher } from '../notifications/notifications.publisher';
import { SupabaseService } from '../supabase/supabase.service';
import {
  ConfirmMeetingResponse,
  MeetingDto,
  ProposeMeetingDto,
} from './dto/meetings.dto';
import { MatchService } from './match.service';

@Injectable()
export class MeetingsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly connections: ConnectionsService,
    private readonly match: MatchService,
    private readonly notifications: NotificationsPublisher
  ) {}

  // --- 부모님 의사 확인 ----------------------------------------------------------

  async recordParentIntent(
    connectionId: string,
    userId: string,
    intent: ParentIntentKind
  ): Promise<ConnectionDto> {
    const ctx = await this.connections.requireParticipant(connectionId, userId);
    if (ctx.row.status === 'ended') {
      throw new ForbiddenException(domainError(ERROR_CODES.CONNECTION_ENDED));
    }

    const client = this.supabase.getClient();
    await client.from('parent_intents').upsert(
      {
        connection_id: connectionId,
        user_id: userId,
        intent,
        responded_at: new Date().toISOString(),
      },
      { onConflict: 'connection_id,user_id' }
    );

    if (intent === 'declined') {
      // 한쪽이 거절하면 만남 동선을 더 진행하지 않는다
      await this.connections.end(connectionId, userId, 'parent_declined');
      return this.connections.getOne(connectionId, userId);
    }

    /**
     * 매칭은 여기서 결정된다 — **양측 부모님이 모두 만날 의사를 밝혔을 때만**.
     *
     * 한쪽이 눌렀다고 '매칭 성공'을 띄우면, 상대 부모님은 아직 아무 말도 하지
     * 않았는데 성사된 것처럼 보인다. 이 두 사람 규칙은 이 앱에서 가장 오해가
     * 비싼 지점이라 상태 하나에 그대로 박아 둔다.
     */
    const { data: intents } = await client
      .from('parent_intents')
      .select('user_id, intent')
      .eq('connection_id', connectionId);

    const willing = (intents ?? []).filter((i) => i.intent === 'willing');
    if (willing.length >= 2) {
      await this.connections.setStatus(connectionId, 'matched');
    } else if (['mutual_heart', 'chatting'].includes(ctx.row.status)) {
      await this.connections.setStatus(connectionId, 'parent_intent');
    }

    await this.notifications.publish({
      userId: ctx.partnerUserId,
      type: 'parent_intent',
      connectionId,
      payload: { intent },
    });

    return this.connections.getOne(connectionId, userId);
  }

  // --- 만남 일정 ---------------------------------------------------------------

  async getMeeting(connectionId: string, userId: string): Promise<MeetingDto | null> {
    await this.connections.requireParticipant(connectionId, userId);
    const row = await this.activeMeetingRow(connectionId);
    return row ? this.toDto(row, userId) : null;
  }

  async propose(
    connectionId: string,
    userId: string,
    dto: ProposeMeetingDto
  ): Promise<MeetingDto> {
    const ctx = await this.connections.requireParticipant(connectionId, userId);
    if (ctx.row.status === 'ended') {
      throw new ForbiddenException(domainError(ERROR_CODES.CONNECTION_ENDED));
    }

    // 양측 부모님이 만날 의사를 밝힌 뒤에만 일정을 잡을 수 있다
    const { data: intents } = await this.supabase
      .getClient()
      .from('parent_intents')
      .select('user_id, intent')
      .eq('connection_id', connectionId);

    const willing = (intents ?? []).filter((i) => i.intent === 'willing');
    if (willing.length < 2) {
      throw new BadRequestException(domainError(ERROR_CODES.PARENT_INTENT_REQUIRED));
    }

    if (!dto.childAccompanied && (!dto.soloReason || !dto.safetyAck)) {
      throw new BadRequestException(domainError(ERROR_CODES.SOLO_REASON_REQUIRED));
    }

    if (await this.activeMeetingRow(connectionId)) {
      throw new BadRequestException(domainError(ERROR_CODES.MEETING_EXISTS));
    }

    const { data, error } = await this.supabase
      .getClient()
      .from('meetings')
      .insert({
        connection_id: connectionId,
        proposed_by_user_id: userId,
        meet_at: dto.meetAt,
        place: dto.place,
        child_accompanied: dto.childAccompanied,
        solo_reason: dto.childAccompanied ? null : dto.soloReason,
        safety_ack_at: dto.childAccompanied ? null : new Date().toISOString(),
        status: 'proposed',
      })
      .select('*')
      .single();

    if (error) throw new BadRequestException({ code: 'meeting_failed', message: error.message });

    await this.notifications.publish({
      userId: ctx.partnerUserId,
      type: 'meeting_proposed',
      connectionId,
      payload: { meetingId: data.id, meetAt: data.meet_at },
    });

    return this.toDto(data, userId);
  }

  async accept(connectionId: string, userId: string): Promise<MeetingDto> {
    const ctx = await this.connections.requireParticipant(connectionId, userId);
    const meeting = await this.requireActiveMeeting(connectionId);

    if (meeting.proposed_by_user_id === userId) {
      throw new ForbiddenException(
        domainError(ERROR_CODES.FORBIDDEN, '상대가 수락해야 하는 일정입니다')
      );
    }

    const client = this.supabase.getClient();
    await client.from('meetings').update({ status: 'accepted' }).eq('id', meeting.id);
    await this.connections.setStatus(connectionId, 'meeting_scheduled');

    await this.notifications.publish({
      userId: ctx.partnerUserId,
      type: 'meeting_accepted',
      connectionId,
      payload: { meetingId: meeting.id },
    });

    const { data } = await client.from('meetings').select('*').eq('id', meeting.id).single();
    return this.toDto(data, userId);
  }

  /**
   * 만남 확인. 실제 전이 판정은 MatchService 가 한다 —
   * 이 메서드는 자격 확인과 기록까지만 담당한다.
   */
  async confirm(connectionId: string, userId: string): Promise<ConfirmMeetingResponse> {
    const ctx = await this.connections.requireParticipant(connectionId, userId);
    const meeting = await this.requireActiveMeeting(connectionId);

    if (meeting.status === 'proposed') {
      throw new BadRequestException(domainError(ERROR_CODES.MEETING_NOT_ACCEPTED));
    }
    if (new Date(meeting.meet_at).getTime() > Date.now()) {
      throw new BadRequestException(domainError(ERROR_CODES.MEETING_TOO_EARLY));
    }

    const client = this.supabase.getClient();
    const { error } = await client.from('meeting_confirmations').insert({
      meeting_id: meeting.id,
      user_id: userId,
    });
    if (error && error.code !== '23505') {
      throw new BadRequestException({ code: 'confirm_failed', message: error.message });
    }
    if (error?.code === '23505') {
      throw new BadRequestException(domainError(ERROR_CODES.MEETING_ALREADY_CONFIRMED));
    }

    const connectionStatus = await this.match.applyConfirmation(
      meeting.id,
      connectionId,
      userId,
      ctx.partnerUserId
    );

    const { data: fresh } = await client.from('meetings').select('*').eq('id', meeting.id).single();

    return { meeting: await this.toDto(fresh, userId), connectionStatus };
  }

  /**
   * 사후 응답. 저장만 하고 **어떤 응답에도 상대의 값을 내려보내지 않는다** (PRD 12.3).
   * 조회 API 자체가 없다 — test-scenarios.md S20.3 이 경로 부재를 검증한다.
   */
  async submitFeedback(
    connectionId: string,
    userId: string,
    response: string
  ): Promise<void> {
    await this.connections.requireParticipant(connectionId, userId);
    const meeting = await this.requireActiveMeeting(connectionId);

    await this.supabase
      .getClient()
      .from('meeting_feedbacks')
      .upsert(
        { meeting_id: meeting.id, user_id: userId, response },
        { onConflict: 'meeting_id,user_id' }
      );
  }

  // --- 내부 -------------------------------------------------------------------

  private async activeMeetingRow(connectionId: string) {
    const { data } = await this.supabase
      .getClient()
      .from('meetings')
      .select('*')
      .eq('connection_id', connectionId)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return data ?? null;
  }

  private async requireActiveMeeting(connectionId: string) {
    const meeting = await this.activeMeetingRow(connectionId);
    if (!meeting) throw new NotFoundException(domainError(ERROR_CODES.MEETING_NOT_FOUND));
    return meeting;
  }

  private async toDto(row: Record<string, any>, userId: string): Promise<MeetingDto> {
    const client = this.supabase.getClient();

    const [confirmations, feedback] = await Promise.all([
      client.from('meeting_confirmations').select('user_id').eq('meeting_id', row.id),
      client
        .from('meeting_feedbacks')
        .select('response')
        .eq('meeting_id', row.id)
        .eq('user_id', userId) // 내 응답만. 상대 것은 조회조차 하지 않는다
        .maybeSingle(),
    ]);

    const confirmedUserIds = (confirmations.data ?? []).map((c) => c.user_id);

    return {
      id: row.id,
      meetAt: row.meet_at,
      place: row.place,
      childAccompanied: row.child_accompanied,
      soloReason: row.solo_reason,
      status: row.status,
      proposedByMe: row.proposed_by_user_id === userId,
      confirmedByMe: confirmedUserIds.includes(userId),
      confirmedByPartner: confirmedUserIds.some((id) => id !== userId),
      confirmable:
        row.status !== 'proposed' && new Date(row.meet_at).getTime() <= Date.now(),
      myFeedback: (feedback.data?.response as MeetingDto['myFeedback']) ?? null,
      createdAt: row.created_at,
    };
  }
}
