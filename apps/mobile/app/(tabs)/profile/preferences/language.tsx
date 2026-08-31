import { useLanguageStore } from '@features/settings';
import { useTranslation } from '@chachamelmelll9-hash-service/i18n';
import {
  LANGUAGE_NAMES,
  SUPPORTED_LANGUAGES,
} from '@chachamelmelll9-hash-service/i18n/config/mobile';
import React from 'react';
import { Pressable, StyleSheet,Text, View } from 'react-native';

const LANGUAGES = SUPPORTED_LANGUAGES.map((code) => ({
  code,
  ...LANGUAGE_NAMES[code],
}));

export default function LanguageScreen() {
  const { t, i18n } = useTranslation('ui');
  const { language: storedLanguage, setLanguage } = useLanguageStore();
  // 언어를 직접 선택한 적이 없으면(null) 디바이스 로케일 기반 i18n 언어를 표시
  const language = storedLanguage ?? i18n.language;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('language_settings')}</Text>
        <Text style={styles.subtitle}>{t('language_settings_subtitle')}</Text>
      </View>

      <View style={styles.languageList}>
        {LANGUAGES.map((lang) => (
          <Pressable accessibilityRole="button"
            key={lang.code}
            style={[
              styles.languageItem,
              language === lang.code && styles.languageItemActive,
            ]}
            onPress={() => setLanguage(lang.code)}
          >
            <View>
              <Text style={styles.languageName}>{lang.native}</Text>
              <Text style={styles.languageSubname}>{lang.english}</Text>
            </View>
            {language === lang.code && <Text style={styles.checkmark}>✓</Text>}
          </Pressable>
        ))}
      </View>

      <View style={styles.currentLanguageContainer}>
        <Text style={styles.currentLanguageLabel}>{t('current_language')}:</Text>
        <Text style={styles.currentLanguage}>
          {LANGUAGES.find((l) => l.code === language)?.native}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#374151',
  },
  languageList: {
    gap: 12,
  },
  languageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  languageItemActive: {
    borderColor: '#10B981',
    backgroundColor: '#D1FAE5',
  },
  languageName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  languageSubname: {
    fontSize: 14,
    color: '#374151',
  },
  checkmark: {
    fontSize: 24,
    color: '#10B981',
  },
  currentLanguageContainer: {
    marginTop: 32,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currentLanguageLabel: {
    fontSize: 14,
    color: '#374151',
  },
  currentLanguage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
});
