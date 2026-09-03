import { Module } from '@nestjs/common';

import { SupabaseModule } from '../supabase/supabase.module';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { KakaoLinkService } from './kakao-link.service';

@Module({
  imports: [SupabaseModule],
  controllers: [AuthController],
  providers: [AuthGuard, AuthService, KakaoLinkService],
  exports: [AuthGuard],
})
export class AuthModule {}
