import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import hi from './locales/hi.json';
import enPhase2 from './locales/en-phase2.json';
import hiPhase2 from './locales/hi-phase2.json';

function preferredLanguage() {
  try {
    return localStorage.getItem('bharat-bazaar-language') === 'hi' ? 'hi' : 'en';
  } catch {
    return 'en';
  }
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: { ...en, p2: enPhase2 } },
    hi: { translation: { ...hi, p2: hiPhase2 } },
  },
  lng: preferredLanguage(),
  fallbackLng: 'en',
  supportedLngs: ['en', 'hi'],
  interpolation: { escapeValue: false },
});

document.documentElement.lang = i18n.resolvedLanguage || 'en';
i18n.on('languageChanged', (language) => {
  document.documentElement.lang = language;
  try {
    localStorage.setItem('bharat-bazaar-language', language);
  } catch {
    /* Language still works without storage. */
  }
});

export default i18n;
