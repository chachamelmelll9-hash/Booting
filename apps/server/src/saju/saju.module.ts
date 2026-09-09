import { Module } from '@nestjs/common';

import { SupabaseModule } from '../supabase/supabase.module';
import { SajuService } from './saju.service';

@Module({
  imports: [SupabaseModule],
  providers: [SajuService],
  exports: [SajuService],
})
export class SajuModule {}
