import { Module } from '@nestjs/common';

import { SupabaseModule } from '../supabase/supabase.module';
import { SmsService } from './sms.service';
import { VerificationController } from './verification.controller';
import { VerificationService } from './verification.service';

@Module({
  imports: [SupabaseModule],
  controllers: [VerificationController],
  providers: [VerificationService, SmsService],
  exports: [VerificationService],
})
export class VerificationModule {}
