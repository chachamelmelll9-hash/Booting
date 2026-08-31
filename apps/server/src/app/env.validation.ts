const REQUIRED_ENV_VARS = [
  'SUPABASE_URL',
  'SUPABASE_SECRET_KEY',
  'SUPABASE_ANON_KEY',
] as const;

export function validateEnv(
  config: Record<string, unknown>
): Record<string, unknown> {
  const missing = REQUIRED_ENV_VARS.filter((key) => !config[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
        'See apps/server/.env.example and set them in .env.development / .env.production.'
    );
  }
  return config;
}
