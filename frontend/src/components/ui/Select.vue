<template>
  <div
    class="ui-select-wrapper"
    :class="[
      `size-${size}`,
      { 'has-error': !!error, 'is-disabled': disabled }
    ]"
  >
    <select
      :id="id"
      :value="modelValue"
      :disabled="disabled"
      :required="required"
      class="ui-select-field"
      @change="onChange"
    >
      <option v-if="placeholder" value="" disabled :selected="!modelValue">
        {{ placeholder }}
      </option>
      <slot>
        <option
          v-for="opt in options"
          :key="String(opt.value)"
          :value="opt.value"
          :disabled="opt.disabled"
        >
          {{ opt.label }}
        </option>
      </slot>
    </select>
    <span class="select-chevron" aria-hidden="true">
      <Icon name="chevron-down" :size="iconSize" />
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Icon from './Icon.vue';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

interface Props {
  modelValue?: string | number | null;
  id?: string;
  options?: SelectOption[];
  placeholder?: string;
  size?: 'dense' | 'default' | 'touch';
  disabled?: boolean;
  required?: boolean;
  error?: boolean | string;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  options: () => [],
  placeholder: '',
  size: 'default',
  disabled: false,
  required: false,
});

const emit = defineEmits(['update:modelValue', 'change']);

const iconSize = computed(() => (props.size === 'dense' ? 14 : 16));

function onChange(e: Event) {
  const val = (e.target as HTMLSelectElement).value;
  emit('update:modelValue', val);
  emit('change', val);
}
</script>

<style scoped>
.ui-select-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
  width: 100%;
  background-color: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-control);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.ui-select-wrapper.size-dense {
  height: var(--height-control-dense);
}

.ui-select-wrapper.size-default {
  height: var(--height-control-default);
}

.ui-select-wrapper.size-touch {
  height: var(--height-control-touch);
}

.ui-select-wrapper:focus-within {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 1px var(--color-accent);
}

.ui-select-wrapper.has-error {
  border-color: var(--color-danger);
}
.ui-select-wrapper.has-error:focus-within {
  box-shadow: 0 0 0 1px var(--color-danger);
}

.ui-select-wrapper.is-disabled {
  background-color: var(--color-subtle);
  cursor: not-allowed;
  opacity: 0.7;
}

.ui-select-field {
  width: 100%;
  height: 100%;
  border: none;
  background: transparent;
  border-radius: inherit;
  padding: 0 var(--space-6) 0 var(--space-3);
  font-family: var(--font-sans);
  font-size: var(--font-size-base);
  color: var(--color-ink);
  appearance: none;
  -webkit-appearance: none;
  cursor: pointer;
  outline: none;
}

.size-dense .ui-select-field {
  font-size: var(--font-size-sm);
  padding: 0 var(--space-5) 0 var(--space-2);
}

.select-chevron {
  position: absolute;
  right: var(--space-3);
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: var(--color-text-muted);
  display: inline-flex;
  align-items: center;
}
</style>
