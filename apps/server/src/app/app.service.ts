import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';

import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  getData(): { message: string } {
    return { message: 'Hello API' };
  }

  async getHealth(): Promise<{ status: 'ok'; supabase: 'ok' }> {
    try {
      const res = await fetch(
        `${this.supabaseService.getUrl()}/auth/v1/health`,
        {
          headers: { apikey: this.supabaseService.getAnonKey() },
          signal: AbortSignal.timeout(3000),
        }
      );
      if (!res.ok) {
        throw new Error(`Supabase health responded with ${res.status}`);
      }
    } catch (err) {
      this.logger.error(`Supabase health check failed: ${String(err)}`);
      throw new ServiceUnavailableException({
        status: 'unhealthy',
        supabase: 'unreachable',
      });
    }
    return { status: 'ok', supabase: 'ok' };
  }
}
