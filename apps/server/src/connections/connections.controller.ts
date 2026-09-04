import {
  Body,
  Controller,
  ForbiddenException,
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


  /**
   * **개발 빌드 전용** — 카카오 콜백 없이 공유를 기록한다.
   *
   * 운영에서 공유 완료를 표시하는 길은 카카오 서버 콜백 하나뿐이다
   * (`KakaoShareController`). 앱은 "카카오톡으로 넘겼다"까지만 알아서, 앱이
   * 표시하게 두면 공유 화면을 열었다 그냥 나와도 완료가 된다.
   *
   * 그런데 개발 중에는 그 콜백이 닿지 않는다. 카카오 콘솔에 등록하는 콜백
   * 주소는 공개 주소여야 하는데, 개발용 임시 터널은 띄울 때마다 주소가 바뀐다.
   * 그래서 테스트할 때마다 콘솔을 고쳐야 했고, 안 고치면 부모님 화면이
   * "자녀분이 거두었습니다" 로 막혔다 (실측).
   *
   * 운영에서는 도메인이 고정되므로 이 우회로가 필요 없다 — 그래서 **production
   * 에서는 아예 막는다.** 남겨 두면 언젠가 앱이 이걸 불러 증명 없는 완료를
   * 만들어 낸다.
   */
  @Post(':id/parent-share')
  @HttpCode(200)
  markShareInDev(@User('id') userId: string, @Param('id') id: string) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException({
        code: 'not_available',
        message: '사용할 수 없습니다',
      });
    }
    return this.connections.markParentShare(id, userId);
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
