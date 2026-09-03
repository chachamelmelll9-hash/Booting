import { Module } from '@nestjs/common';

import { ConnectionsModule } from '../connections/connections.module';
import { DiscoveryModule } from '../discovery/discovery.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { ParentController } from './parent.controller';
import { ParentGuard } from './parent.guard';
import { ParentService } from './parent.service';

@Module({
  imports: [SupabaseModule, DiscoveryModule, ConnectionsModule],
  controllers: [ParentController],
  providers: [ParentService, ParentGuard],
})
export class ParentModule {}
