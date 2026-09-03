import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { AuthGuard } from '../auth/auth.guard';
import { User } from '../auth/user.decorator';
import { VerifiedChildGuard } from '../common/guards/verified-child.guard';
import {
  AddPhotoDto,
  ConsentDto,
  CreateParentProfileDto,
  UpdateParentProfileDto,
  VisibilityDto,
} from './dto/parent-profile.dto';
import { ParentProfileService } from './parent-profile.service';

@Controller('parent-profile')
@UseGuards(AuthGuard)
export class ParentProfileController {
  constructor(private readonly profiles: ParentProfileService) {}

  /** 조회는 인증 미완료 상태에서도 가능해야 한다 — 등록 플로우가 상태를 물어본다 */
  @Get()
  get(@User('id') userId: string) {
    return this.profiles.findByUser(userId);
  }

  @Post()
  @UseGuards(VerifiedChildGuard)
  create(@User('id') userId: string, @Body() dto: CreateParentProfileDto) {
    return this.profiles.create(userId, dto);
  }

  @Patch()
  @UseGuards(VerifiedChildGuard)
  update(@User('id') userId: string, @Body() dto: UpdateParentProfileDto) {
    return this.profiles.update(userId, dto);
  }

  @Post('photos')
  @UseGuards(VerifiedChildGuard)
  addPhoto(@User('id') userId: string, @Body() dto: AddPhotoDto) {
    return this.profiles.addPhoto(userId, dto);
  }

  @Delete('photos/:id')
  @UseGuards(VerifiedChildGuard)
  removePhoto(@User('id') userId: string, @Param('id') photoId: string) {
    return this.profiles.removePhoto(userId, photoId);
  }

  /**
   * 부모님께 보낼 동의 링크를 발급한다.
   *
   * 자녀가 "동의 받았습니다" 를 눌러 스스로 기록하던 경로는 없앴다. 그건
   * 자녀의 진술이지 부모님의 동의가 아니고, 분쟁이 생기면 증명하지 못한다.
   */
  @Post('consent/link')
  @UseGuards(VerifiedChildGuard)
  @HttpCode(200)
  createConsentLink(@User('id') userId: string, @Body() dto: ConsentDto) {
    return this.profiles.createConsentLink(userId, dto);
  }

  @Post('consent/revoke')
  @HttpCode(200)
  revokeConsent(@User('id') userId: string) {
    return this.profiles.revokeConsent(userId);
  }

  @Post('submit')
  @UseGuards(VerifiedChildGuard)
  @HttpCode(200)
  submit(@User('id') userId: string) {
    return this.profiles.submit(userId);
  }

  @Post('visibility')
  @HttpCode(200)
  setVisibility(@User('id') userId: string, @Body() dto: VisibilityDto) {
    return this.profiles.setVisibility(userId, dto.visible);
  }
}
