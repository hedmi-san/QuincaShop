<template>
  <span class="app-badge" :class="[`badge-${variant}`, { 'has-dot': dot }]">
    <span v-if="dot" class="badge-dot" aria-hidden="true"></span>
    <span class="badge-content">
      <slot>{{ text }}</slot>
    </span>
  </span>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'amber';
    text?: string;
    dot?: boolean;
  }>(),
  {
    variant: 'neutral',
    text: '',
    dot: false,
  }
);
</script>

<style scoped>
.app-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 7px;
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  line-height: 1.3;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-radius: var(--radius-xs);
  border: 1px solid transparent;
  white-space: nowrap;
}

.badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: currentColor;
}

/* Neutral: Stamped Zinc Plate */
.badge-neutral {
  background-color: var(--color-surface);
  color: var(--color-text-secondary);
  border-color: var(--color-border);
}

/* Success: Calibrated In-Stock Green */
.badge-success {
  background-color: var(--color-success-bg);
  color: var(--color-success);
  border-color: var(--color-success-border);
}

/* Warning: Inspection Alert */
.badge-warning {
  background-color: var(--color-warning-bg);
  color: var(--color-warning);
  border-color: var(--color-warning-border);
}

/* Danger: Out of Stock / Void */
.badge-danger {
  background-color: var(--color-danger-bg);
  color: var(--color-danger);
  border-color: var(--color-danger-border);
}

/* Info: Technical Notice */
.badge-info {
  background-color: var(--color-info-bg);
  color: var(--color-info);
  border-color: var(--color-info-border);
}

/* Amber: B2B Wholesale / Priority Flag */
.badge-amber {
  background-color: var(--color-amber-subtle);
  color: var(--color-amber-text);
  border-color: var(--color-amber-border);
}
</style>

