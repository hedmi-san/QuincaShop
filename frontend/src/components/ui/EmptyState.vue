<template>
  <div class="ui-empty-state">
    <div class="empty-icon-wrapper">
      <slot name="icon">
        <Icon :name="icon" :size="40" class="empty-icon" />
      </slot>
    </div>

    <h3 class="empty-title">{{ title }}</h3>
    <p v-if="message" class="empty-message">{{ message }}</p>

    <div v-if="$slots.action || actionLabel" class="empty-actions">
      <slot name="action">
        <Button
          v-if="actionLabel"
          variant="primary"
          :icon="actionIcon"
          @click="$emit('action')"
        >
          {{ actionLabel }}
        </Button>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import Icon from './Icon.vue';
import Button from './Button.vue';

interface Props {
  icon?: string;
  title?: string;
  message?: string;
  actionLabel?: string;
  actionIcon?: string;
}

withDefaults(defineProps<Props>(), {
  icon: 'inbox',
  title: 'Aucune donnée trouvée',
});

defineEmits(['action']);
</script>

<style scoped>
.ui-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: var(--space-6) var(--space-4);
  gap: var(--space-2);
}

.empty-icon-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: var(--radius-pill);
  background-color: var(--color-subtle);
  border: 1px solid var(--color-line);
  color: var(--color-text-tertiary);
  margin-bottom: var(--space-2);
}

.empty-title {
  font-family: var(--font-sans);
  font-size: var(--font-size-md);
  font-weight: 600;
  color: var(--color-ink);
  margin: 0;
}

.empty-message {
  font-size: var(--font-size-base);
  color: var(--color-text-secondary);
  max-width: 50ch;
  margin: 0;
  line-height: var(--line-height-normal);
}

.empty-actions {
  margin-top: var(--space-3);
}
</style>

