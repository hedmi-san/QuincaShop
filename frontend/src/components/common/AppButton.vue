<template>
  <button
    :type="type"
    class="app-button"
    :class="[
      `variant-${variant}`,
      `size-${size}`,
      { 'is-loading': loading, 'is-disabled': disabled }
    ]"
    :disabled="disabled || loading"
    @click="$emit('click', $event)"
  >
    <span v-if="loading" class="spinner" aria-hidden="true"></span>
    <span v-if="$slots['icon-left'] && !loading" class="icon-slot icon-left">
      <slot name="icon-left" />
    </span>
    <span class="button-label">
      <slot />
    </span>
    <span v-if="$slots['icon-right'] && !loading" class="icon-slot icon-right">
      <slot name="icon-right" />
    </span>
  </button>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'amber' | 'outline' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
  }>(),
  {
    variant: 'primary',
    size: 'md',
    loading: false,
    disabled: false,
    type: 'button',
  }
);

defineEmits<{
  (e: 'click', event: MouseEvent): void;
}>();
</script>

<style scoped>
.app-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-family: var(--font-sans);
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  transition: background-color var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast), transform var(--transition-fast);
  white-space: nowrap;
  user-select: none;
  position: relative;
}

.app-button:active:not(:disabled) {
  transform: translateY(1px);
}

.app-button:focus-visible {
  outline: 2px solid var(--color-amber);
  outline-offset: 2px;
}

/* Sizes */
.size-sm {
  padding: 5px 10px;
  font-size: 12px;
  height: 28px;
}

.size-md {
  padding: 7px 16px;
  font-size: 13px;
  height: 36px;
}

.size-lg {
  padding: 10px 22px;
  font-size: 15px;
  height: 44px;
}

/* Variant: Primary (Cast Iron) */
.variant-primary {
  background-color: var(--color-primary);
  color: var(--color-text-inverse);
  border-color: #090c0e;
}

.variant-primary:hover:not(:disabled) {
  background-color: var(--color-primary-hover);
}

/* Variant: Amber (Cadmium Safety Machinery) */
.variant-amber {
  background-color: var(--color-amber);
  color: #ffffff;
  border-color: #b45309;
}

.variant-amber:hover:not(:disabled) {
  background-color: var(--color-amber-hover);
}

/* Variant: Secondary (Steel Plate) */
.variant-secondary {
  background-color: var(--color-surface);
  color: var(--color-text-primary);
  border-color: var(--color-border);
}

.variant-secondary:hover:not(:disabled) {
  background-color: var(--color-surface-hover);
  border-color: var(--color-border-dark);
}

/* Variant: Outline */
.variant-outline {
  background-color: transparent;
  color: var(--color-primary);
  border-color: var(--color-border-dark);
}

.variant-outline:hover:not(:disabled) {
  background-color: var(--color-surface);
  border-color: var(--color-primary);
}

/* Variant: Danger */
.variant-danger {
  background-color: var(--color-danger);
  color: #ffffff;
  border-color: #991b1b;
}

.variant-danger:hover:not(:disabled) {
  background-color: #991b1b;
}

/* Disabled & Loading */
.app-button:disabled,
.app-button.is-disabled {
  opacity: 0.55;
  cursor: not-allowed;
  transform: none;
}

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.icon-slot {
  display: inline-flex;
  align-items: center;
  font-size: 1.1em;
}
</style>

