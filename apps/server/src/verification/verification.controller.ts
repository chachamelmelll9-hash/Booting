import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';

import { AuthGuard } from '../auth/auth.guard';
import { User } from '../auth/user.decorator';
import { RequestPhoneCodeDto, SubmitPhoneDto } from './dto/verification.dto';
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

  // `POST family` 는 없앴다 — 가족관계증명서는 더 이상 받지 않는다
}
