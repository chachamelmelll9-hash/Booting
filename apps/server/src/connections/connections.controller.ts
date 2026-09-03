import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { AuthGuard } from '../auth/auth.guard';
import { User } from '../auth/user.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
// 데코레이터가 붙은 시그니처에 쓰이는 타입은 type-only 로 가져와야 한다
// (isolatedModules + emitDecoratorMetadata)
import type { ConnectionStatus } from '../common/types';
import { ConnectionsService } from './connections.service';
import { EndConnectionDto, SendMessageDto } from './dto/connections.dto';
import { MessagesService } from './messages.service';

@Controller('connections')
@UseGuards(AuthGuard)
export class ConnectionsController {
  constructor(
    private readonly connections: ConnectionsService,
    private readonly messages: MessagesService
  ) {}

  @Get()
  list(@User('id') userId: string, @Query('status') status?: ConnectionStatus) {
    return this.connections.list(userId, status);
  }

  // `:id` 보다 먼저 선언해야 한다 — Nest 는 선언 순서대로 매칭해서,
  // 뒤에 두면 'unread-count' 가 connectionId 로 잡힌다
  @Get('unread-count')
  async unreadCount(@User('id') userId: string) {
    return { count: await this.connections.unseenCount(userId) };
  }

  /** 카카오 공유에 실어 보낼 서명 — 콜백이 돌아왔을 때 위조를 가른다 */
  @Get(':id/share-token')
  shareToken(@User('id') userId: string, @Param('id') id: string) {
    return { token: this.connections.parentShareToken(id, userId), userId };
  }

  @Get(':id')
  getOne(@User('id') userId: string, @Param('id') id: string) {
    return this.connections.getOne(id, userId);
  }

  @Get(':id/messages')
  listMessages(
    @User('id') userId: string,
    @Param('id') id: string,
    @Query() query: PaginationDto
  ) {
    return this.messages.list(id, userId, query.cursor, query.limit ?? 30);
  }

  @Post(':id/messages')
  sendMessage(
    @User('id') userId: string,
    @Param('id') id: string,
    @Body() dto: SendMessageDto
  ) {
    return this.messages.send(id, userId, dto.body);
  }


  // 공유 완료를 앱이 표시하는 경로(`POST :id/parent-share`)는 없앴다. 앱은
  // "카카오톡으로 넘겼다"까지만 알아서, 공유 화면을 열었다 그냥 나와도 완료가
  // 됐다. 표시는 카카오 서버 콜백(`KakaoShareController`)만 한다.

  @Post(':id/end')
  @HttpCode(200)
  end(
    @User('id') userId: string,
    @Param('id') id: string,
    @Body() dto: EndConnectionDto
  ) {
    return this.connections.end(id, userId, dto.reason);
  }
}
