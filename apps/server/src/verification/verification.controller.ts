import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';

import { AuthGuard } from '../auth/auth.guard';
import { User } from '../auth/user.decorator';
import {
  RequestPhoneCodeDto,
  SubmitFamilyDocDto,
  SubmitPhoneDto,
} from './dto/verification.dto';
import { VerificationService } from './verification.service';

@Controller('me/verification')
@UseGuards(AuthGuard)
export class VerificationController {
  constructor(private readonly verification: VerificationService) {}

  @Get()
  getStatus(@User('id') userId: string) {
    return this.verification.getStatus(userId);
  }

  /** 인증번호 발송 — 발급·만료·재발송 간격은 서버가 정한다 */
  @Post('phone/code')
  requestCode(@User('id') userId: string, @Body() dto: RequestPhoneCodeDto) {
    return this.verification.requestCode(userId, dto);
  }

  @Post('phone')
  submitPhone(@User('id') userId: string, @Body() dto: SubmitPhoneDto) {
    return this.verification.submitPhone(userId, dto);
  }

  /**
   * 가족관계증명서 자동 심사 — 올린 사진을 읽어 프로필과 대조하고 결과를 돌려준다.
   * 사진은 심사 직후 삭제된다. 부모님 기본 정보(성함·생년월일)가 먼저 있어야 한다.
   */
  @Post('family-doc')
  submitFamilyDoc(@User('id') userId: string, @Body() dto: SubmitFamilyDocDto) {
    return this.verification.submitFamilyDoc(userId, dto);
  }
}
