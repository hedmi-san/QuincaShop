<template>
  <div class="lang-switcher">
    <button
      type="button"
      class="lang-btn"
      :class="{ active: currentLocale === 'fr' }"
      @click="changeLocale('fr')"
      title="Passer en Français"
    >
      <span class="flag">🇫🇷</span>
      <span class="lang-label">FR</span>
    </button>
    <span class="divider">/</span>
    <button
      type="button"
      class="lang-btn"
      :class="{ active: currentLocale === 'ar' }"
      @click="changeLocale('ar')"
      title="التحويل إلى العربية"
    >
      <span class="flag">🇩🇿</span>
      <span class="lang-label">عربي</span>
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
.lang-switcher {
  display: inline-flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 20px;
  padding: 2px 6px;
  gap: 4px;
}

.lang-btn {
  background: transparent;
  border: none;
  color: inherit;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  padding: 3px 6px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: all 0.15s ease;
}

.lang-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.lang-btn.active {
  background: #ffffff;
  color: #1e293b;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

.flag {
  font-size: 0.95rem;
}

.divider {
  font-size: 0.75rem;
  opacity: 0.6;
}
</style>

