import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

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
  /**
   * 고르지 않았으면 기기 언어가 아니라 **한국어**로 연다.
   *
   * 기기 언어를 따라가면 영어로 맞춰 둔 기기에서 로그인·설정만 영어가 되고,
   * 그 안쪽(부모님 프로필 등록, 지역 목록, 동의서)은 전부 한국어로 남는다.
   * 번역이 없어서가 아니라 이 서비스의 내용 자체가 한국어라서 그렇다 —
   * 반만 영어인 화면은 영어 사용자에게도 도움이 되지 않는다.
   *
   * 영어가 필요하면 설정에서 고른다. 그 선택은 `initialLanguage` 로 들어와
   * 여기보다 우선한다.
   */
  const language = initialLanguage || DEFAULT_LANGUAGE;

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
