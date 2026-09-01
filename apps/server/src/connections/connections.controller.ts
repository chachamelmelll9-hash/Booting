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
