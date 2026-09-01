import { Module } from '@nestjs/common';

import { SupabaseModule } from '../supabase/supabase.module';
import { PublishedProfileGuard } from './guards/published-profile.guard';
import { VerifiedChildGuard } from './guards/verified-child.guard';

@Module({
  imports: [SupabaseModule],
  providers: [VerifiedChildGuard, PublishedProfileGuard],
  exports: [VerifiedChildGuard, PublishedProfileGuard],
})
export class CommonModule {}
