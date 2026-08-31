/**
 * @internal - OAuth 인증 전용 Supabase 클라이언트.
 * DB 쿼리나 일반 API 호출에 사용하지 마세요.
 * 모든 post-login API 호출은 NestJS 서버를 경유합니다.
 */
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey =
  process.env.EXPO_PUBLIC_SUPABASE_KEY || 'placeholder-key';

if (supabaseUrl === 'https://placeholder.supabase.co') {
  console.warn(
    '[Supabase] EXPO_PUBLIC_SUPABASE_URL not set. Auth will not work until configured via /setup.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: Platform.OS !== 'web' ? ExpoSecureStoreAdapter : undefined,
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});
