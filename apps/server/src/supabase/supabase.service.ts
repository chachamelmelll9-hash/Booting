import { Injectable, Logger,OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private client!: SupabaseClient;
  private readonly logger = new Logger(SupabaseService.name);

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const url = this.configService.get<string>('SUPABASE_URL');
    const key = this.configService.get<string>('SUPABASE_SECRET_KEY');

    if (!url || !key) {
      throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY must be set');
    }

    this.logger.log('Supabase client initialized');

    this.client = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  /** Service-role client — bypasses RLS. Use only for admin operations. */
  getClient(): SupabaseClient {
    return this.client;
  }

  /**
   * User-scoped client — queries run with the user's JWT so RLS policies
   * apply on the server path. Prefer this over getClient() for user data.
   */
  getUserClient(accessToken: string): SupabaseClient {
    return createClient(this.getUrl(), this.getAnonKey(), {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    });
  }

  /** Supabase project URL (e.g. https://xxx.supabase.co) */
  getUrl(): string {
    return this.configService.get<string>('SUPABASE_URL')!;
  }

  /** Service-role key for GoTrue admin endpoints */
  getServiceRoleKey(): string {
    return this.configService.get<string>('SUPABASE_SECRET_KEY')!;
  }

  /** Anon key for GoTrue user-facing endpoints and user-scoped clients */
  getAnonKey(): string {
    const key = this.configService.get<string>('SUPABASE_ANON_KEY');
    if (!key) {
      throw new Error(
        'SUPABASE_ANON_KEY must be set — falling back to the service-role key would bypass RLS'
      );
    }
    return key;
  }
}
