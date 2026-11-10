<template>
  <div class="ui-lang-switcher" role="group" aria-label="Sélection de la langue">
    <button
      type="button"
      class="lang-pill"
      :class="{ 'is-active': currentLocale === 'fr' }"
      title="Français"
      @click="changeLocale('fr')"
    >
      <span class="lang-code">FR</span>
    </button>
    <span class="lang-divider" aria-hidden="true">/</span>
    <button
      type="button"
      class="lang-pill"
      :class="{ 'is-active': currentLocale === 'ar' }"
      title="العربية"
      @click="changeLocale('ar')"
    >
      <span class="lang-code font-arabic">عربي</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { setLocale, type SupportedLocale } from '../../i18n';

const { locale } = useI18n();

const currentLocale = computed(() => locale.value as SupportedLocale);

function changeLocale(lang: SupportedLocale) {
  if (currentLocale.value !== lang) {
    setLocale(lang);
  }
}
</script>

<style scoped>
.ui-lang-switcher {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  background-color: var(--color-subtle);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-pill);
  padding: 2px 4px;
}

.lang-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 3px 8px;
  background: transparent;
  border: none;
  border-radius: var(--radius-pill);
  font-family: var(--font-sans);
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
  line-height: 1;
}

.lang-pill:hover {
  color: var(--color-ink);
}

.lang-pill.is-active {
  background-color: var(--color-surface);
  color: var(--color-ink);
  box-shadow: var(--shadow-sm);
}

.font-arabic {
  font-family: var(--font-arabic), var(--font-sans);
}

.lang-divider {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

@media (max-width: 768px) {
  .lang-pill {
    min-height: 38px;
    min-width: 38px;
    padding: 6px 10px;
  }
}
</style>
