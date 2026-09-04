import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { ParentLoginDto } from './dto/parent.dto';
import { ParentGuard } from './parent.guard';
import { ParentService } from './parent.service';

/**
 * 부모님 화면 API.
 *
 * 자녀용 API 와 완전히 분리된 표면이다. 부모님 토큰으로는 여기 말고 아무 데도
 * 못 간다 — 추천도, 대화도, 신고도, 다른 사람 프로필도 없다.
 */
@Controller('parent')
export class ParentController {
  constructor(private readonly parent: ParentService) {}

  /**
   * 코드 로그인 — 시도 횟수를 막는다.
   *
   * 코드가 숫자 8자리라 1억 가지지만, 제한이 없으면 기계가 쉬지 않고 넣어 본다.
   * 여기서 열리는 건 남의 부모님 사진이고 성사되면 연락처까지라, 뚫리면 되돌릴
   * 수 없다. 부모님은 코드를 한 번 넣지 분당 열 번 넣지 않으므로 실제 사용에는
   * 걸리지 않는다.
   */
  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(200)
  login(@Body() dto: ParentLoginDto) {
    return this.parent.login(dto.code);
  }

  @Post('logout')
  @HttpCode(204)
  @UseGuards(ParentGuard)
  async logout(@Headers('authorization') authorization?: string) {
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
    await this.parent.logout(token);
  }

  @Get('profiles')
  @UseGuards(ParentGuard)
  inbox(@Req() req: { parentProfileId: string }) {
    return this.parent.inbox(req.parentProfileId);
  }

  @Get('profiles/:connectionId')
  @UseGuards(ParentGuard)
  detail(
    @Req() req: { parentProfileId: string },
    @Param('connectionId') connectionId: string
  ) {
    return this.parent.detail(req.parentProfileId, connectionId);
  }

  @Post('profiles/:connectionId/view')
  @HttpCode(204)
  @UseGuards(ParentGuard)
  async view(
    @Req() req: { parentProfileId: string },
    @Param('connectionId') connectionId: string
  ) {
    await this.parent.markViewed(req.parentProfileId, connectionId);
  }

  /** 대화해보고 싶어요 */
  @Post('profiles/:connectionId/interest')
  @HttpCode(200)
  @UseGuards(ParentGuard)
  express(
    @Req() req: { parentProfileId: string },
    @Param('connectionId') connectionId: string
  ) {
    return this.parent.express(req.parentProfileId, connectionId);
  }

  /** 다른 프로필 볼래요 (영구 삭제) */
  @Post('profiles/:connectionId/decline')
  @HttpCode(204)
  @UseGuards(ParentGuard)
  async decline(
    @Req() req: { parentProfileId: string },
    @Param('connectionId') connectionId: string
  ) {
    await this.parent.decline(req.parentProfileId, connectionId);
  }
}
