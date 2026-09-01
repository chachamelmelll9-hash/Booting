import { Module } from '@nestjs/common';

import { ConnectionsModule } from '../connections/connections.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { MatchService } from './match.service';
import { MeetingsController } from './meetings.controller';
import { MeetingsService } from './meetings.service';

@Module({
  imports: [SupabaseModule, ConnectionsModule, NotificationsModule],
  controllers: [MeetingsController],
  providers: [MeetingsService, MatchService],
})
export class MeetingsModule {}
