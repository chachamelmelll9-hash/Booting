import { Module } from '@nestjs/common';

import { ConnectionsModule } from '../connections/connections.module';
import { DiscoveryModule } from '../discovery/discovery.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { ParentController } from './parent.controller';
import { ParentGuard } from './parent.guard';
import { ParentService } from './parent.service';
import { ParentViewController } from './parent-view.controller';

@Module({
  imports: [SupabaseModule, DiscoveryModule, ConnectionsModule],
  // ParentViewController 는 부모님 세션이 아니라 **링크 서명**으로 여는 웹 화면이라
  // ParentGuard 를 타지 않는다 (컨트롤러 주석 참고).
  controllers: [ParentController, ParentViewController],
  providers: [ParentService, ParentGuard],
})
export class ParentModule {}
