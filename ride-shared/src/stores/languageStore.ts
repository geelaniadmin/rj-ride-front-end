import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Language = 'en' | 'ja';

interface LanguageStore {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
}

export const useLanguageStore = create<LanguageStore>()(
  persist(
    (set, get) => ({
      language: 'en',
      setLanguage: (lang) => set({ language: lang }),
      toggleLanguage: () => {
        const current = get().language;
        set({ language: current === 'en' ? 'ja' : 'en' });
      },
    }),
    { name: 'ride-language' }
  )
);
