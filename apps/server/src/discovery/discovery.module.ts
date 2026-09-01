import { Module } from '@nestjs/common';

import { CommonModule } from '../common/common.module';
import { ParentProfileModule } from '../parent-profile/parent-profile.module';
import { RegionsModule } from '../regions/regions.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { DiscoveryController, ProfilesController } from './discovery.controller';
import { DiscoveryRepository } from './discovery.repository';
import { DiscoveryService } from './discovery.service';

@Module({
  imports: [SupabaseModule, CommonModule, RegionsModule, ParentProfileModule],
  controllers: [DiscoveryController, ProfilesController],
  providers: [DiscoveryService, DiscoveryRepository],
  exports: [DiscoveryService],
})
export class DiscoveryModule {}
