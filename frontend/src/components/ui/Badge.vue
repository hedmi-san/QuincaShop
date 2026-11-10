<template>
  <span class="ui-badge" :class="[`tone-${tone}`, { 'is-pill': pill }]">
    <slot>{{ content }}</slot>
  </span>
</template>

<script setup lang="ts">
interface Props {
  content?: string | number;
  tone?: 'neutral' | 'brand' | 'accent' | 'danger' | 'success';
  pill?: boolean;
}

withDefaults(defineProps<Props>(), {
  tone: 'neutral',
  pill: false,
});
</script>

<style scoped>
.ui-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 1px 6px;
  font-family: var(--font-mono);
  font-size: var(--font-size-xs);
  font-weight: 500;
  line-height: 1.2;
  border-radius: var(--radius-sm);
  white-space: nowrap;
}

.is-pill {
  border-radius: var(--radius-pill);
}

.tone-neutral {
  background-color: var(--color-subtle);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-line);
}

.tone-brand {
  background-color: var(--color-brand);
  color: var(--color-text-inverse);
}

.tone-accent {
  background-color: var(--color-accent-subtle);
  color: var(--color-accent);
  border: 1px solid var(--color-accent-border);
}

.tone-danger {
  background-color: var(--color-danger);
  color: var(--color-text-inverse);
}

.tone-success {
  background-color: var(--color-success-tint);
  color: var(--color-success-text);
  border: 1px solid var(--color-success-border);
}
</style>

