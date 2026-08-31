// Register typed translation resources (declaration emit에 포함되어 소비자에게 적용됨)
import './types/resources';

// Export hooks
export { useI18n } from './hooks/useI18n';
export { useTranslation } from 'react-i18next';

// Re-export i18next for direct access if needed
export { default as i18n } from 'i18next';

// Export config functions (use specific imports to avoid bundling react-native in web)
export { initI18nWeb } from './config/web';

// Language constants (single source: ./config/languages)
export {
  DEFAULT_LANGUAGE,
  LANGUAGE_NAMES,
  SUPPORTED_LANGUAGES,
  toSupportedLanguage,
} from './config/languages';
export type { SupportedLanguage } from './config/languages';
