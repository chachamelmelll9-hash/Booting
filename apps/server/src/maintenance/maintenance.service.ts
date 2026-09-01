import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import { SupabaseService } from '../supabase/supabase.service';

/** 기본 10분. 규칙이 전부 "일" 단위라 분 단위 정확도면 충분하다. */
const DEFAULT_INTERVAL_MS = 10 * 60 * 1000;

/**
 * 시간 기반 규칙 실행기.
 *
 * 규칙 자체는 `run_maintenance()` SQL 함수에 있다 (advisory lock 포함).
 * 여기서는 주기적으로 부르기만 한다 — 상태 변경과 알림 발행이 한 트랜잭션에
 * 묶여 있어야 "알림 없이 조용히 비공개된 프로필" 같은 틈이 안 생긴다.
 *
 * `@nestjs/schedule` 대신 setInterval 을 쓴 이유는 의존성 추가 없이 같은 일을
 * 하기 때문이다 — 크론 표현식이 필요할 만큼 정교한 주기가 아니다.
 */
@Injectable()
export class MaintenanceService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MaintenanceService.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly supabase: SupabaseService) {}

  onModuleInit() {
    if (process.env.MAINTENANCE_DISABLED === 'true') {
      this.logger.log('maintenance loop disabled by MAINTENANCE_DISABLED');
      return;
    }

    const intervalMs = Number(process.env.MAINTENANCE_INTERVAL_MS) || DEFAULT_INTERVAL_MS;
    this.timer = setInterval(() => void this.runOnce(), intervalMs);
    // 프로세스 종료를 막지 않는다 (테스트·CI 에서 매달리는 걸 방지)
    this.timer.unref?.();
    this.logger.log(`maintenance loop every ${Math.round(intervalMs / 1000)}s`);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async runOnce(): Promise<Record<string, unknown> | null> {
    const { data, error } = await this.supabase.getClient().rpc('run_maintenance');
    if (error) {
      this.logger.warn(`maintenance failed: ${error.message}`);
      return null;
    }
    const result = data as Record<string, unknown>;
    if (result && result.skipped !== true) {
      const changed =
        Number(result.hiddenProfiles ?? 0) +
        Number(result.readOnlyNotifications ?? 0) +
        Number(result.confirmReminders ?? 0);
      if (changed > 0) this.logger.log(`maintenance: ${JSON.stringify(result)}`);
    }
    return result;
  }
}
