import { Module } from '@nestjs/common';

import { SupabaseModule } from '../supabase/supabase.module';
import { MaintenanceService } from './maintenance.service';

@Module({
  imports: [SupabaseModule],
  providers: [MaintenanceService],
  exports: [MaintenanceService],
})
export class MaintenanceModule {}
