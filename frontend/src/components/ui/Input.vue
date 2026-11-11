<template>
  <div
    class="ui-input-wrapper"
    :class="[
      `size-${size}`,
      { 'has-error': !!error, 'is-disabled': disabled, 'is-focused': isFocused }
    ]"
  >
    <span v-if="prefixIcon || $slots.prefix" class="input-affix prefix">
      <slot name="prefix">
        <Icon v-if="prefixIcon" :name="prefixIcon" :size="iconSize" />
      </slot>
    </span>

    <input
      :id="id"
      ref="inputRef"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="readonly"
      :required="required"
      class="ui-input-field"
      @input="onInput"
      @focus="isFocused = true"
      @blur="isFocused = false"
      @keydown="$emit('keydown', $event)"
    />

    <span v-if="suffixIcon || clearable || $slots.suffix" class="input-affix suffix">
      <button
        v-if="clearable && modelValue"
        type="button"
        class="clear-button"
        aria-label="Effacer"
        @click="clear"
      >
        <Icon name="x" :size="14" />
      </button>
      <slot name="suffix">
        <Icon v-if="suffixIcon" :name="suffixIcon" :size="iconSize" />
      </slot>
    </span>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import Icon from './Icon.vue';

interface Props {
  modelValue?: string | number | null;
  id?: string;
  type?: string;
  placeholder?: string;
  size?: 'dense' | 'default' | 'touch';
  disabled?: boolean;
  readonly?: boolean;
  required?: boolean;
  error?: boolean | string;
  prefixIcon?: string;
  suffixIcon?: string;
  clearable?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  type: 'text',
  placeholder: '',
  size: 'default',
  disabled: false,
  readonly: false,
  required: false,
  clearable: false,
});

const emit = defineEmits(['update:modelValue', 'change', 'clear', 'keydown']);

const inputRef = ref<HTMLInputElement | null>(null);
const isFocused = ref(false);

const iconSize = computed(() => (props.size === 'dense' ? 14 : 16));

function onInput(e: Event) {
  const val = (e.target as HTMLInputElement).value;
  emit('update:modelValue', val);
}

function clear() {
  emit('update:modelValue', '');
  emit('clear');
  inputRef.value?.focus();
}
</script>

<style scoped>
.ui-input-wrapper {
  display: inline-flex;
  align-items: center;
  width: 100%;
  background-color: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-control);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  overflow: hidden;
}

.ui-input-wrapper.size-dense {
  height: var(--height-control-dense);
}

.ui-input-wrapper.size-default {
  height: var(--height-control-default);
}

.ui-input-wrapper.size-touch {
  height: var(--height-control-touch);
}

.ui-input-wrapper.is-focused {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 1px var(--color-accent);
}

.ui-input-wrapper.has-error {
  border-color: var(--color-danger);
}
.ui-input-wrapper.has-error.is-focused {
  box-shadow: 0 0 0 1px var(--color-danger);
}

.ui-input-wrapper.is-disabled {
  background-color: var(--color-subtle);
  cursor: not-allowed;
  opacity: 0.7;
}

.ui-input-field {
  flex: 1;
  width: 100%;
  height: 100%;
  border: none;
  background: transparent;
  border-radius: inherit;
  padding: 0 var(--space-3);
  font-family: var(--font-sans);
  font-size: var(--font-size-base);
  color: var(--color-ink);
  outline: none;
}

.size-dense .ui-input-field {
  font-size: var(--font-size-sm);
  padding: 0 var(--space-2);
}

.ui-input-field::placeholder {
  color: var(--color-text-tertiary);
}

.input-affix {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
}

.input-affix.prefix {
  padding-left: var(--space-3);
}

.input-affix.suffix {
  padding-right: var(--space-3);
  gap: var(--space-1);
}

.clear-button {
  background: transparent;
  border: none;
  color: var(--color-text-tertiary);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  padding: 2px;
  border-radius: var(--radius-pill);
}
.clear-button:hover {
  color: var(--color-ink);
}
</style>
