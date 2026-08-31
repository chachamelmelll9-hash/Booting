import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import { DEFAULT_LANGUAGE, toSupportedLanguage, type SupportedLanguage } from './languages';

// Import all Korean translations
import koCommon from '../locales/ko/common.json';
import koAuth from '../locales/ko/auth.json';
import koUi from '../locales/ko/ui.json';
import koErrors from '../locales/ko/errors.json';
import koMobile from '../locales/ko/mobile.json';

// Import all English translations
import enCommon from '../locales/en/common.json';
import enAuth from '../locales/en/auth.json';
import enUi from '../locales/en/ui.json';
import enErrors from '../locales/en/errors.json';
import enMobile from '../locales/en/mobile.json';

export { DEFAULT_LANGUAGE, LANGUAGE_NAMES, SUPPORTED_LANGUAGES } from './languages';
export type { SupportedLanguage } from './languages';

export const resources = {
  ko: {
    common: koCommon,
    auth: koAuth,
    ui: koUi,
    errors: koErrors,
    mobile: koMobile,
  },
  en: {
    common: enCommon,
    auth: enAuth,
    ui: enUi,
    errors: enErrors,
    mobile: enMobile,
  },
} as const;

/**
 * Initialize i18next for React Native/Expo
 * @param initialLanguage - Optional initial language override
 * @returns Initialized i18n instance
 */
export async function initI18nMobile(initialLanguage?: string) {
  // Detect device language
  const deviceLanguage = Localization.getLocales()[0]?.languageCode || DEFAULT_LANGUAGE;

  // Determine which language to use
  const language = initialLanguage || deviceLanguage;

  // Validate and fallback to default if not supported
  const validLanguage: SupportedLanguage = toSupportedLanguage(language);

  const isDev = process.env.NODE_ENV !== 'production';

  await i18n.use(initReactI18next).init({
    resources,
    lng: validLanguage,
    fallbackLng: DEFAULT_LANGUAGE,
    defaultNS: 'common',
    ns: ['common', 'auth', 'ui', 'errors', 'mobile'],
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    compatibilityJSON: 'v3', // Important for React Native
    react: {
      useSuspense: false, // Prevent suspense issues in React Native
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
