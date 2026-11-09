<template>
  <div class="app-input-group" :class="{ 'has-error': !!error, 'is-disabled': disabled }">
    <label v-if="label" :for="inputId" class="input-label">
      {{ label }}
      <span v-if="required" class="required-star">*</span>
    </label>

    <div class="input-wrapper">
      <span v-if="prefix || $slots.prefix" class="input-affix input-prefix">
        <slot name="prefix">{{ prefix }}</slot>
      </span>

      <input
        :id="inputId"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :required="required"
        class="input-control"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        @blur="$emit('blur', $event)"
        @focus="$emit('focus', $event)"
      />

      <span v-if="suffix || $slots.suffix" class="input-affix input-suffix">
        <slot name="suffix">{{ suffix }}</slot>
      </span>
    </div>

    <span v-if="error" class="input-error-msg" role="alert">
      {{ error }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    modelValue: string | number;
    label?: string;
    error?: string;
    type?: string;
    placeholder?: string;
    disabled?: boolean;
    readonly?: boolean;
    required?: boolean;
    id?: string;
    prefix?: string;
    suffix?: string;
  }>(),
  {
    label: '',
    error: '',
    type: 'text',
    placeholder: '',
    disabled: false,
    readonly: false,
    required: false,
    id: '',
    prefix: '',
    suffix: '',
  }
);

defineEmits<{
  (e: 'update:modelValue', val: string): void;
  (e: 'blur', event: FocusEvent): void;
  (e: 'focus', event: FocusEvent): void;
}>();

const inputId = computed(() => props.id || `input-${Math.random().toString(36).substring(2, 9)}`);
</script>

<style scoped>
.app-input-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
  width: 100%;
}

.input-label {
  font-family: var(--font-sans);
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-secondary);
}

.required-star {
  color: var(--color-danger);
}

.input-wrapper {
  display: flex;
  align-items: center;
  position: relative;
  background-color: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.input-wrapper:hover {
  border-color: var(--color-border-dark);
}

.input-wrapper:focus-within {
  border-color: var(--color-amber);
  box-shadow: 0 0 0 1px var(--color-amber);
}

.input-control {
  width: 100%;
  padding: 8px 12px;
  font-family: var(--font-sans);
  font-size: 14px;
  color: var(--color-text-primary);
  background: transparent;
  border: none;
  outline: none;
}

.input-control::placeholder {
  color: var(--color-text-tertiary);
}

.input-affix {
  display: flex;
  align-items: center;
  padding: 0 10px;
  font-size: 13px;
  color: var(--color-text-secondary);
  background-color: var(--color-surface);
  user-select: none;
}

.input-prefix {
  border-right: 1px solid var(--color-border);
}

.input-suffix {
  border-left: 1px solid var(--color-border);
}

[dir="rtl"] .input-prefix {
  border-right: none;
  border-left: 1px solid var(--color-border);
}

[dir="rtl"] .input-suffix {
  border-left: none;
  border-right: 1px solid var(--color-border);
}

.has-error .input-wrapper {
  border-color: var(--color-danger);
}

.has-error .input-wrapper:focus-within {
  box-shadow: 0 0 0 1px var(--color-danger);
}

.input-error-msg {
  font-size: 12px;
  color: var(--color-danger);
  font-weight: 500;
}

.is-disabled .input-wrapper {
  background-color: var(--color-surface);
  cursor: not-allowed;
  opacity: 0.7;
}

.is-disabled .input-control {
  cursor: not-allowed;
}
</style>

