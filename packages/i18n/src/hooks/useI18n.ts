import { useTranslation as useI18nextTranslation } from 'react-i18next';
import type { SupportedLanguage } from '../config/languages';

/**
 * Custom hook wrapper for i18n with type safety
 * @param namespace - Optional namespace(s) to use
 * @returns Translation function and i18n utilities
 */
export function useI18n(namespace?: string | string[]) {
  const { t, i18n } = useI18nextTranslation(namespace as any);

  const changeLanguage = async (lng: SupportedLanguage) => {
    await i18n.changeLanguage(lng);
  };

  return {
    t,
    i18n,
    currentLanguage: i18n.language as SupportedLanguage,
    changeLanguage,
  };
}
