import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { AuthGuard } from '../auth/auth.guard';
import { User } from '../auth/user.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PublishedProfileGuard } from '../common/guards/published-profile.guard';
import { DiscoveryService } from './discovery.service';
import { DiscoveryFilterDto } from './dto/discovery.dto';

@Controller('discovery')
@UseGuards(AuthGuard)
export class DiscoveryController {
  constructor(private readonly discovery: DiscoveryService) {}

  /** 필터는 프로필 공개 전에도 읽고 쓸 수 있다 (등록 중 미리 설정) */
  @Get('filters')
  getFilters(@User('id') userId: string) {
    return this.discovery.getFilter(userId);
  }

  @Put('filters')
  saveFilters(@User('id') userId: string, @Body() dto: DiscoveryFilterDto) {
    return this.discovery.saveFilter(userId, dto);
  }

  /** 추천은 내 프로필이 공개 상태일 때만 — 상호주의 */
  @Get()
  @UseGuards(PublishedProfileGuard)
  recommend(
    @User('id') userId: string,
    @Req() req: { parentProfileId: string },
    @Query() query: PaginationDto
  ) {
    return this.discovery.recommend(
      userId,
      req.parentProfileId,
      query.cursor,
      query.limit ?? 10
    );
  }
}

@Controller('profiles')
@UseGuards(AuthGuard, PublishedProfileGuard)
export class ProfilesController {
  constructor(private readonly discovery: DiscoveryService) {}

  @Get(':id')
  get(
    @User('id') userId: string,
    @Req() req: { parentProfileId: string },
    @Param('id') profileId: string
  ) {
    return this.discovery.getPublicProfile(userId, req.parentProfileId, profileId);
  }
}
