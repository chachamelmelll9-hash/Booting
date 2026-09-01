import { Module } from '@nestjs/common';

import { SupabaseModule } from '../supabase/supabase.module';
import { BlocksController, ReportsController } from './safety.controller';
import { SafetyService } from './safety.service';

@Module({
  imports: [SupabaseModule],
  controllers: [ReportsController, BlocksController],
  providers: [SafetyService],
})
export class SafetyModule {}
