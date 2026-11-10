<template>
  <button
    :type="type"
    :class="[
      'ui-button',
      `variant-${variant}`,
      `size-${size}`,
      { 'is-loading': loading, 'is-icon-only': iconOnly }
    ]"
    :disabled="disabled || loading"
    :aria-disabled="disabled || loading"
    :aria-label="ariaLabelComputed"
  >
    <Icon v-if="loading" name="loader-2" :size="iconSize" spin class="btn-spinner" />
    <Icon v-else-if="icon" :name="icon" :size="iconSize" class="btn-icon" />
    <span v-if="!iconOnly" class="btn-text">
      <slot />
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Icon from './Icon.vue';

interface Props {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'dense' | 'default' | 'touch';
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  iconOnly?: boolean;
  ariaLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'default',
  type: 'button',
  disabled: false,
  loading: false,
  iconOnly: false,
});

const ariaLabelComputed = computed(() => {
  if (props.ariaLabel) return props.ariaLabel;
  return undefined;
});

const iconSize = computed(() => {
  if (props.size === 'dense') return 16;
  if (props.size === 'touch') return 20;
  return 18;
});
</script>

<style scoped>
.ui-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  border-radius: var(--radius-control);
  font-family: var(--font-sans);
  font-weight: 500;
  font-size: var(--font-size-base);
  line-height: 1;
  text-decoration: none;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
  user-select: none;
  border: 1px solid transparent;
}

/* Sizes */
.size-dense {
  height: var(--height-control-dense);
  padding: 0 var(--space-3);
  font-size: var(--font-size-sm);
}

.size-default {
  height: var(--height-control-default);
  padding: 0 var(--space-4);
  font-size: var(--font-size-base);
}

.size-touch {
  height: var(--height-control-touch);
  padding: 0 var(--space-5);
  font-size: var(--font-size-base);
}

.is-icon-only.size-dense {
  width: var(--height-control-dense);
  padding: 0;
}

.is-icon-only.size-default {
  width: var(--height-control-default);
  padding: 0;
}

.is-icon-only.size-touch {
  width: var(--height-control-touch);
  padding: 0;
}

/* Primary: Dark industrial authority */
.variant-primary {
  background-color: var(--color-brand);
  color: var(--color-text-inverse);
  border-color: var(--color-brand);
}
.variant-primary:hover:not(:disabled) {
  background-color: var(--color-brand-hover);
  border-color: var(--color-brand-hover);
}
.variant-primary:active:not(:disabled) {
  background-color: #000000;
}

/* Secondary: Crisp bordered control */
.variant-secondary {
  background-color: var(--color-surface);
  color: var(--color-ink);
  border-color: var(--color-line);
}
.variant-secondary:hover:not(:disabled) {
  background-color: var(--color-subtle);
  border-color: var(--color-line-strong);
}

/* Ghost: Clean text action */
.variant-ghost {
  background-color: transparent;
  color: var(--color-text-secondary);
  border-color: transparent;
}
.variant-ghost:hover:not(:disabled) {
  background-color: var(--color-subtle);
  color: var(--color-ink);
}

/* Danger */
.variant-danger {
  background-color: var(--color-danger-tint);
  color: var(--color-danger-text);
  border-color: var(--color-danger-border);
}
.variant-danger:hover:not(:disabled) {
  background-color: #fee2e2;
  border-color: #fca5a5;
}

/* Disabled & Loading */
.ui-button:disabled,
.ui-button.is-loading {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-spinner {
  color: currentColor;
}
</style>

