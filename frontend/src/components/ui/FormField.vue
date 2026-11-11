<template>
  <div class="ui-form-field" :class="{ 'has-error': !!error, 'is-required': required }">
    <label v-if="label" :for="forId" class="field-label">
      <span>{{ label }}</span>
      <span v-if="required" class="required-mark" aria-hidden="true">*</span>
    </label>

    <div class="field-control">
      <slot :id="forId" :has-error="!!error" />
    </div>

    <div v-if="error" class="field-error" role="alert">
      {{ error }}
    </div>
    <div v-else-if="helper || $slots.helper" class="field-helper">
      <slot name="helper">{{ helper }}</slot>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  label?: string;
  forId?: string;
  required?: boolean;
  error?: string | boolean | null;
  helper?: string;
}

defineProps<Props>();
</script>

<style scoped>
.ui-form-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  width: 100%;
}

.field-label {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-family: var(--font-sans);
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-ink);
  line-height: 1.2;
}

.required-mark {
  color: var(--color-danger);
  font-weight: 600;
}

.field-control {
  width: 100%;
}

.field-error {
  font-size: var(--font-size-xs);
  color: var(--color-danger);
  line-height: 1.3;
}

.field-helper {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  line-height: 1.3;
}
</style>

