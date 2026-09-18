import { Module } from '@nestjs/common';

import { SupabaseModule } from '../supabase/supabase.module';
import { FamilyDocService } from './family-doc.service';
import { FamilyDocReaderService } from './family-doc-reader.service';
import { SmsService } from './sms.service';
import { VerificationController } from './verification.controller';
import { VerificationService } from './verification.service';

@Module({
  imports: [SupabaseModule],
  controllers: [VerificationController],
  providers: [VerificationService, SmsService, FamilyDocService, FamilyDocReaderService],
  exports: [VerificationService],
})
export class VerificationModule {}
