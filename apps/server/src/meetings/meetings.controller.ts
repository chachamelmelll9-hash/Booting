import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import { AuthGuard } from '../auth/auth.guard';
import { User } from '../auth/user.decorator';
import {
  MeetingFeedbackDto,
  ParentIntentDto,
  ProposeMeetingDto,
} from './dto/meetings.dto';
import { MeetingsService } from './meetings.service';

@Controller('connections/:connectionId')
@UseGuards(AuthGuard)
export class MeetingsController {
  constructor(private readonly meetings: MeetingsService) {}

  @Post('parent-intent')
  @HttpCode(200)
  parentIntent(
    @User('id') userId: string,
    @Param('connectionId') connectionId: string,
    @Body() dto: ParentIntentDto
  ) {
    return this.meetings.recordParentIntent(connectionId, userId, dto.intent);
  }

  @Get('meeting')
  getMeeting(@User('id') userId: string, @Param('connectionId') connectionId: string) {
    return this.meetings.getMeeting(connectionId, userId);
  }

  @Post('meeting')
  propose(
    @User('id') userId: string,
    @Param('connectionId') connectionId: string,
    @Body() dto: ProposeMeetingDto
  ) {
    return this.meetings.propose(connectionId, userId, dto);
  }

  @Post('meeting/accept')
  @HttpCode(200)
  accept(@User('id') userId: string, @Param('connectionId') connectionId: string) {
    return this.meetings.accept(connectionId, userId);
  }

  @Post('meeting/confirm')
  @HttpCode(200)
  confirm(@User('id') userId: string, @Param('connectionId') connectionId: string) {
    return this.meetings.confirm(connectionId, userId);
  }

  /**
   * 사후 응답은 저장만 한다. 조회 엔드포인트를 의도적으로 두지 않는다 —
   * 있으면 언젠가 화면에서 부르게 된다 (PRD 12.3 비공개).
   */
  @Post('meeting/feedback')
  @HttpCode(204)
  async feedback(
    @User('id') userId: string,
    @Param('connectionId') connectionId: string,
    @Body() dto: MeetingFeedbackDto
  ) {
    await this.meetings.submitFeedback(connectionId, userId, dto.response);
  }
}
