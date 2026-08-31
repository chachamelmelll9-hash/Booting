import {
  createClient,
  LockFunc,
  SupabaseClient,
  SupportedStorage,
} from '@supabase/supabase-js';

export interface SupabaseConfig {
  url: string;
  key: string;
}

export interface CreateClientOptions {
  storage?: SupportedStorage;
  autoRefreshToken?: boolean;
  persistSession?: boolean;
  detectSessionInUrl?: boolean;
  lock?: LockFunc;
}

export function createSupabaseClient(
  config: SupabaseConfig,
  options: CreateClientOptions = {}
): SupabaseClient {
  return createClient(config.url, config.key, {
    auth: {
      storage: options.storage,
      autoRefreshToken: options.autoRefreshToken ?? true,
      persistSession: options.persistSession ?? true,
      detectSessionInUrl: options.detectSessionInUrl ?? false,
      lock: options.lock,
    },
  });
}
