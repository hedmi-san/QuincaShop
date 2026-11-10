<template>
  <div
    class="ui-textarea-wrapper"
    :class="{ 'has-error': !!error, 'is-disabled': disabled, 'is-focused': isFocused }"
  >
    <textarea
      :id="id"
      :value="modelValue"
      :rows="rows"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="readonly"
      :required="required"
      class="ui-textarea-field"
      @input="onInput"
      @focus="isFocused = true"
      @blur="isFocused = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

interface Props {
  modelValue?: string | number | null;
  id?: string;
  rows?: number | string;
  placeholder?: string;
  disabled?: boolean;
  readonly?: boolean;
  required?: boolean;
  error?: boolean | string;
}

withDefaults(defineProps<Props>(), {
  modelValue: '',
  rows: 3,
  placeholder: '',
  disabled: false,
  readonly: false,
  required: false,
});

const emit = defineEmits(['update:modelValue']);
const isFocused = ref(false);

function onInput(e: Event) {
  emit('update:modelValue', (e.target as HTMLTextAreaElement).value);
}
</script>

<style scoped>
.ui-textarea-wrapper {
  width: 100%;
  background-color: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-control);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  overflow: hidden;
}

.ui-textarea-wrapper.is-focused {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 1px var(--color-accent);
}

.ui-textarea-wrapper.has-error {
  border-color: var(--color-danger);
}
.ui-textarea-wrapper.has-error.is-focused {
  box-shadow: 0 0 0 1px var(--color-danger);
}

.ui-textarea-wrapper.is-disabled {
  background-color: var(--color-subtle);
  cursor: not-allowed;
  opacity: 0.7;
}

.ui-textarea-field {
  width: 100%;
  border: none;
  background: transparent;
  padding: var(--space-2) var(--space-3);
  font-family: var(--font-sans);
  font-size: var(--font-size-base);
  color: var(--color-ink);
  line-height: var(--line-height-normal);
  resize: vertical;
  outline: none;
}

.ui-textarea-field::placeholder {
  color: var(--color-text-tertiary);
}
</style>
