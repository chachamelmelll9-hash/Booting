import { Module } from '@nestjs/common';

import { CommonModule } from '../common/common.module';
import { DiscoveryModule } from '../discovery/discovery.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { HeartsController, PassesController } from './hearts.controller';
import { HeartsService } from './hearts.service';

@Module({
  imports: [SupabaseModule, CommonModule, DiscoveryModule, NotificationsModule],
  controllers: [HeartsController, PassesController],
  providers: [HeartsService],
})
export class HeartsModule {}
