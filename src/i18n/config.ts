import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import enTranslations from './locales/en.json';
import arTranslations from './locales/ar.json';

export const languages = {
  en: { nativeName: 'English', dir: 'ltr' },
  ar: { nativeName: 'العربية', dir: 'rtl' }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslations },
      ar: { translation: arTranslations }
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'ar'],
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  });

// Update document direction when language changes
i18n.on('languageChanged', (lng) => {
  const dir = languages[lng as keyof typeof languages]?.dir || 'ltr';
  document.documentElement.dir = dir;
  document.documentElement.lang = lng;
});

// Set initial direction
const currentDir = languages[i18n.language as keyof typeof languages]?.dir || 'ltr';
document.documentElement.dir = currentDir;
document.documentElement.lang = i18n.language;

export default i18n;
