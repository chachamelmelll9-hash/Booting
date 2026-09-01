import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AuthModule } from '../auth/auth.module';
import { CommonModule } from '../common/common.module';
import { DomainExceptionFilter } from '../common/filters/http-exception.filter';
import { ConnectionsModule } from '../connections/connections.module';
import { DiscoveryModule } from '../discovery/discovery.module';
import { HeartsModule } from '../hearts/hearts.module';
import { MaintenanceModule } from '../maintenance/maintenance.module';
import { MeetingsModule } from '../meetings/meetings.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ParentProfileModule } from '../parent-profile/parent-profile.module';
import { RegionsModule } from '../regions/regions.module';
import { SafetyModule } from '../safety/safety.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { VerificationModule } from '../verification/verification.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { validateEnv } from './env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        `.env.${process.env.NODE_ENV || 'development'}`,
        '.env',
      ],
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: 60000, limit: 60 }],
    }),
    SupabaseModule,
    AuthModule,

    // --- 부팅 도메인. 의존 순서대로 (verification → profile → discovery → …) ---
    CommonModule,
    RegionsModule,
    NotificationsModule,
    VerificationModule,
    ParentProfileModule,
    DiscoveryModule,
    HeartsModule,
    ConnectionsModule,
    MeetingsModule,
    SafetyModule,
    MaintenanceModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      // Supabase 에러를 뜻이 있는 상태 코드로 바꾼다 (특히 세션 무효 → 401)
      provide: APP_FILTER,
      useClass: DomainExceptionFilter,
    },
  ],
})
export class AppModule {}
