import { Controller, Get, UseGuards } from '@nestjs/common';

import { AuthGuard } from '../auth/auth.guard';
import { RegionsService } from './regions.service';

@Controller('regions')
@UseGuards(AuthGuard)
export class RegionsController {
  constructor(private readonly regions: RegionsService) {}

  /** 지역 선택기(프로필 작성·필터)가 쓰는 목록. 좌표는 내려보내지 않는다 */
  @Get()
  async list() {
    const regions = await this.regions.all();
    return regions.map(({ code, sido, sigungu, label }) => ({ code, sido, sigungu, label }));
  }
}
