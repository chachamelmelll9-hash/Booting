import { i18n } from '@product-engineer-community-service/i18n';

export function getAuthErrorMessage(errorCode: string | undefined): string {
  if (!errorCode) return i18n.t('errors:default_error');

  // Dynamic key — defaultValue opts out of strict key typing and marks misses
  const translated = i18n.t(`errors:auth.${errorCode}`, { defaultValue: '' });

  // If translation not found, defaultValue('') is returned, so fall back
  return translated || i18n.t('errors:default_error');
}

export function parseAuthError(error: unknown): string {
  if (!error) return i18n.t('errors:default_error');

  if (typeof error === 'object' && error !== null) {
    const err = error as { code?: string; message?: string };
    if (err.code) {
      return getAuthErrorMessage(err.code);
    }
    if (err.message) {
      // Check if message contains known error patterns
      const message = err.message.toLowerCase();
      if (message.includes('invalid login credentials')) {
        return i18n.t('errors:auth.invalid_credentials');
      }
      if (message.includes('user already registered')) {
        return i18n.t('errors:auth.email_exists');
      }
    }
  }

  return i18n.t('errors:default_error');
}
