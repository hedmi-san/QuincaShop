import { createI18n } from 'vue-i18n';
import fr from './locales/fr.json';

export type SupportedLocale = 'fr';

export const i18n = createI18n({
  legacy: false,
  locale: 'fr',
  fallbackLocale: 'fr',
  messages: {
    fr,
  },
});

/**
 * Global locale initializer: enforces French and standard LTR layout.
 * Cleans up any legacy RTL / Arabic state from previous sessions.
 */
export function initLocale() {
  try {
    localStorage.removeItem('quinca_lang');
  } catch (e) {
    // Ignore storage errors in restricted environments
  }

  document.documentElement.setAttribute('lang', 'fr');
  document.documentElement.setAttribute('dir', 'ltr');
  document.body.classList.remove('rtl-layout');
}

export function setLocale(_lang?: string) {
  initLocale();
}

export default i18n;
