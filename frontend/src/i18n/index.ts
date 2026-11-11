import { createI18n } from 'vue-i18n';
import fr from './locales/fr.json';
import ar from './locales/ar.json';

export type SupportedLocale = 'fr' | 'ar';

const savedLocale = (typeof localStorage !== 'undefined' ? localStorage.getItem('quinca_lang') || 'fr' : 'fr') as SupportedLocale;

export const i18n = createI18n({
  legacy: false,
  locale: savedLocale,
  fallbackLocale: 'fr',
  messages: {
    fr,
    ar,
  },
});

/**
 * Switch global locale and toggle HTML layout direction (LTR vs RTL)
 * Compliant with UI Contract Rule 8 (French default, Arabic RTL supported)
 */
export function setLocale(lang: SupportedLocale) {
  i18n.global.locale.value = lang;
  try {
    localStorage.setItem('quinca_lang', lang);
  } catch (e) {
    // Ignore storage issues in restricted environments
  }

  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');

    if (lang === 'ar') {
      document.body.classList.add('rtl-layout');
    } else {
      document.body.classList.remove('rtl-layout');
    }
  }
}

// Initialize on startup
export function initLocale() {
  setLocale(savedLocale);
}

export default i18n;
