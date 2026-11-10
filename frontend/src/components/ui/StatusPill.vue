<template>
  <span
    class="ui-status-pill"
    :class="[`tone-${meta.tone}`, `size-${size}`]"
  >
    <span class="pill-dot" aria-hidden="true" />
    <span class="pill-label">{{ customLabel || meta.label }}</span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { getStatusMeta, type StatusTone } from '../../lib/status';

interface Props {
  status?: string | null;
  tone?: StatusTone;
  label?: string;
  size?: 'dense' | 'default';
}

const props = withDefaults(defineProps<Props>(), {
  status: '',
  size: 'default',
});

const { locale } = useI18n({ useScope: 'global' });

const meta = computed(() => {
  const resolved = getStatusMeta(props.status, locale.value);
  if (props.tone) {
    return { ...resolved, tone: props.tone };
  }
  return resolved;
});

const customLabel = computed(() => props.label || null);
</script>

<style scoped>
.ui-status-pill {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  font-family: var(--font-sans);
  font-size: var(--font-size-xs);
  font-weight: 500;
  line-height: 1.2;
  white-space: nowrap;
  border: 1px solid transparent;
}

.size-dense {
  padding: 1px 6px;
  font-size: 11px; /* minimal exception for pills, but let's keep it clean at 12px clamp */
  font-size: var(--font-size-xs);
}

.pill-dot {
  width: 6px;
  height: 6px;
  border-radius: var(--radius-pill);
  background-color: currentColor;
}

/* Tone styles: Tinted background + high contrast text */
.tone-success {
  background-color: var(--color-success-tint);
  color: var(--color-success-text);
  border-color: var(--color-success-border);
}

.tone-warning {
  background-color: var(--color-warning-tint);
  color: var(--color-warning-text);
  border-color: var(--color-warning-border);
}

.tone-danger {
  background-color: var(--color-danger-tint);
  color: var(--color-danger-text);
  border-color: var(--color-danger-border);
}

.tone-info {
  background-color: var(--color-info-tint);
  color: var(--color-info-text);
  border-color: var(--color-info-border);
}

.tone-neutral {
  background-color: var(--color-neutral-tint);
  color: var(--color-neutral-text);
  border-color: var(--color-neutral-border);
}
</style>

