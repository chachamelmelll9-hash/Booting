// 지원 언어의 단일 소스 — src/locales/ 하위 디렉토리와 반드시 일치해야 한다.
// (scripts/check-locales.mjs가 turbo test에서 일치 여부를 검증한다)
export const SUPPORTED_LANGUAGES = ['ko', 'en'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: SupportedLanguage = 'ko';

export const LANGUAGE_NAMES: Record<SupportedLanguage, { native: string; english: string }> = {
  ko: { native: '한국어', english: 'Korean' },
  en: { native: 'English', english: 'English' },
};

export function toSupportedLanguage(language: string | null | undefined): SupportedLanguage {
  return SUPPORTED_LANGUAGES.includes(language as SupportedLanguage)
    ? (language as SupportedLanguage)
    : DEFAULT_LANGUAGE;
}
