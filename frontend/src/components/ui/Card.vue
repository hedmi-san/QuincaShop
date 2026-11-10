<template>
  <div class="ui-card" :class="{ 'is-interactive': interactive }">
    <div v-if="$slots.header || title" class="card-header">
      <slot name="header">
        <div class="header-content">
          <h3 v-if="title" class="card-title">{{ title }}</h3>
          <p v-if="subtitle" class="card-subtitle">{{ subtitle }}</p>
        </div>
        <div v-if="$slots.actions" class="header-actions">
          <slot name="actions" />
        </div>
      </slot>
    </div>

    <div class="card-body" :class="{ 'no-padding': noPadding }">
      <slot />
    </div>

    <div v-if="$slots.footer" class="card-footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  title?: string;
  subtitle?: string;
  noPadding?: boolean;
  interactive?: boolean;
}

withDefaults(defineProps<Props>(), {
  noPadding: false,
  interactive: false,
});
</script>

<style scoped>
.ui-card {
  background-color: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.is-interactive:hover {
  border-color: var(--color-line-strong);
  box-shadow: var(--shadow-md);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--color-line);
}

.header-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.card-title {
  font-family: var(--font-sans);
  font-size: var(--font-size-md);
  font-weight: 600;
  color: var(--color-ink);
  margin: 0;
}

.card-subtitle {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  margin: 0;
}

.card-body {
  padding: var(--space-5);
  flex: 1;
}

.card-body.no-padding {
  padding: 0;
}

.card-footer {
  padding: var(--space-3) var(--space-5);
  background-color: var(--color-subtle);
  border-top: 1px solid var(--color-line);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-2);
}
</style>

