import type { SupportedLanguage } from '@product-engineer-community-service/i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage,persist } from 'zustand/middleware';

interface LanguageState {
  /** null until the user explicitly picks a language — device locale is used then. */
  language: SupportedLanguage | null;
  setLanguage: (language: SupportedLanguage) => void;
}

/**
 * Language preference store using Zustand + AsyncStorage
 * Pattern: Same as useAuthStore
 */
export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: null,
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'language-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
