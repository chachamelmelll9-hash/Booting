import { Module } from '@nestjs/common';

import { SupabaseModule } from '../supabase/supabase.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsPublisher } from './notifications.publisher';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [SupabaseModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsPublisher],
  exports: [NotificationsPublisher],
})
export class NotificationsModule {}
