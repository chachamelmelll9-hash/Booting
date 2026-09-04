import { Module } from '@nestjs/common';

import { DiscoveryModule } from '../discovery/discovery.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { ConnectionsController } from './connections.controller';
import { ConnectionsService } from './connections.service';
import { KakaoShareController } from './kakao-share.controller';
import { MessagesService } from './messages.service';
import { OpenPageController } from './open-page.controller';

@Module({
  imports: [SupabaseModule, DiscoveryModule, NotificationsModule],
  controllers: [ConnectionsController, KakaoShareController, OpenPageController],
  providers: [ConnectionsService, MessagesService],
  exports: [ConnectionsService],
})
export class ConnectionsModule {}
