import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { AuthGuard } from '../auth/auth.guard';
import { User } from '../auth/user.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PublishedProfileGuard } from '../common/guards/published-profile.guard';
import { PassDto, SendHeartDto } from './dto/hearts.dto';
import { HeartsService } from './hearts.service';

@Controller('hearts')
@UseGuards(AuthGuard, PublishedProfileGuard)
export class HeartsController {
  constructor(private readonly hearts: HeartsService) {}

  @Post()
  @HttpCode(200)
  send(
    @User('id') userId: string,
    @Req() req: { parentProfileId: string },
    @Body() dto: SendHeartDto
  ) {
    return this.hearts.send(userId, req.parentProfileId, dto.targetProfileId, dto.message);
  }

  @Get('received')
  received(
    @User('id') userId: string,
    @Req() req: { parentProfileId: string },
    @Query() query: PaginationDto
  ) {
    return this.hearts.received(userId, req.parentProfileId, query.cursor, query.limit ?? 20);
  }

  @Get('unread-count')
  async unreadCount(@User('id') userId: string, @Req() req: { parentProfileId: string }) {
    return { count: await this.hearts.unreadCount(userId, req.parentProfileId) };
  }
}

@Controller('passes')
@UseGuards(AuthGuard, PublishedProfileGuard)
export class PassesController {
  constructor(private readonly hearts: HeartsService) {}

  @Post()
  @HttpCode(204)
  async pass(@User('id') userId: string, @Body() dto: PassDto) {
    await this.hearts.pass(userId, dto.targetProfileId);
  }
}
