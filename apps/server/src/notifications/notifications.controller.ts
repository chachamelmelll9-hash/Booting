import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';

import { AuthGuard } from '../auth/auth.guard';
import { User } from '../auth/user.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@User('id') userId: string, @Query() query: PaginationDto) {
    return this.notifications.list(userId, query.cursor, query.limit ?? 20);
  }

  @Get('unread-count')
  async unreadCount(@User('id') userId: string) {
    return { count: await this.notifications.unreadCount(userId) };
  }

  @Post('read-all')
  async readAll(@User('id') userId: string) {
    await this.notifications.markAllRead(userId);
    return { ok: true };
  }
}
