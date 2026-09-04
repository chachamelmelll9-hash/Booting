import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';

import { AuthGuard } from '../auth/auth.guard';
import { User } from '../auth/user.decorator';
import { SubmitPhoneDto } from './dto/verification.dto';
import { VerificationService } from './verification.service';

@Controller('me/verification')
@UseGuards(AuthGuard)
export class VerificationController {
  constructor(private readonly verification: VerificationService) {}

  @Get()
  getStatus(@User('id') userId: string) {
    return this.verification.getStatus(userId);
  }

  @Post('phone')
  submitPhone(@User('id') userId: string, @Body() dto: SubmitPhoneDto) {
    return this.verification.submitPhone(userId, dto);
  }

  // `POST family` 는 없앴다 — 가족관계증명서는 더 이상 받지 않는다
}
