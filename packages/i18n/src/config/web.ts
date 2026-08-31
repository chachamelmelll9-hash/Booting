import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { DEFAULT_LANGUAGE, toSupportedLanguage, type SupportedLanguage } from './languages';

// Import all Korean translations (webview namespace instead of mobile)
import koCommon from '../locales/ko/common.json';
import koAuth from '../locales/ko/auth.json';
import koUi from '../locales/ko/ui.json';
import koErrors from '../locales/ko/errors.json';
import koWebview from '../locales/ko/webview.json';

// Import all English translations
import enCommon from '../locales/en/common.json';
import enAuth from '../locales/en/auth.json';
import enUi from '../locales/en/ui.json';
import enErrors from '../locales/en/errors.json';
import enWebview from '../locales/en/webview.json';

export { DEFAULT_LANGUAGE, LANGUAGE_NAMES, SUPPORTED_LANGUAGES } from './languages';
export type { SupportedLanguage } from './languages';

export const resources = {
  ko: {
    common: koCommon,
    auth: koAuth,
    ui: koUi,
    errors: koErrors,
    webview: koWebview,
  },
  en: {
    common: enCommon,
    auth: enAuth,
    ui: enUi,
    errors: enErrors,
    webview: enWebview,
  },
} as const;

/**
 * Initialize i18next for React/Vite (Webview)
 * @param initialLanguage - Optional initial language override
 * @returns Initialized i18n instance
 */
export async function initI18nWeb(initialLanguage?: string) {
  // For WebView, default to Korean (matching mobile app default)
  // The actual language will be set by the mobile app via SESSION message
  const language = initialLanguage || DEFAULT_LANGUAGE;

  // Validate and fallback
  const validLanguage: SupportedLanguage = toSupportedLanguage(language);

  const isDev = process.env.NODE_ENV !== 'production';

  await i18n.use(initReactI18next).init({
    resources,
    lng: validLanguage,
    fallbackLng: DEFAULT_LANGUAGE,
    defaultNS: 'common',
    ns: ['common', 'auth', 'ui', 'errors', 'webview'],
    interpolation: {
      escapeValue: false,
    },
    saveMissing: isDev,
    missingKeyHandler: isDev
      ? (lngs, ns, key) => {
          console.warn(`[i18n] Missing translation key "${ns}:${key}" (${lngs.join(', ')})`);
        }
      : undefined,
  });

  return i18n;
}
