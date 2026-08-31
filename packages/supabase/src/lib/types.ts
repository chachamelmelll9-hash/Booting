import type { AuthError,Session, User } from '@supabase/supabase-js';

export type { AuthError,Session, User };

export interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
}

export interface AuthResult {
  success: boolean;
  error?: string;
}
