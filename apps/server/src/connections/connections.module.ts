import { Module } from '@nestjs/common';

import { DiscoveryModule } from '../discovery/discovery.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { ConnectionsController } from './connections.controller';
import { ConnectionsService } from './connections.service';
import { MessagesService } from './messages.service';

@Module({
  imports: [SupabaseModule, DiscoveryModule, NotificationsModule],
  controllers: [ConnectionsController],
  providers: [ConnectionsService, MessagesService],
  exports: [ConnectionsService],
})
export class ConnectionsModule {}
