// Client
export type { CreateClientOptions,SupabaseConfig } from './lib/client';
export { createSupabaseClient } from './lib/client';

// Types
export type { AuthError, AuthResult,AuthState, Session, User } from './lib/types';

// Schemas
export type {
  ForgotPasswordFormData,
  LoginFormData,
  SignupFormData,
} from './schemas/auth';
export {
  AUTH_VALIDATION_KEYS,
  forgotPasswordSchema,
  loginSchema,
  signupSchema,
} from './schemas/auth';
