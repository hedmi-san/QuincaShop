<template>
  <dl class="ui-key-value-list" :class="{ 'is-dense': dense }">
    <div
      v-for="item in items"
      :key="item.key"
      class="kv-item"
    >
      <dt class="kv-key">{{ item.label }}</dt>
      <dd class="kv-value">
        <slot :name="`value-${item.key}`" :value="item.value">
          <span v-if="isEmpty(item.value)" class="unspecified-label">
            Non renseigné
          </span>
          <span v-else>{{ item.value }}</span>
        </slot>
      </dd>
    </div>
  </dl>
</template>

<script setup lang="ts">
export interface KeyValueItem {
  key: string;
  label: string;
  value?: any;
}

interface Props {
  items: KeyValueItem[];
  dense?: boolean;
}

withDefaults(defineProps<Props>(), {
  dense: false,
});

function isEmpty(val: any) {
  return val === null || val === undefined || val === '' || val === '-';
}
</script>

<style scoped>
.ui-key-value-list {
  display: flex;
  flex-direction: column;
  width: 100%;
  margin: 0;
  border-top: 1px solid var(--color-line);
}

.kv-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-3) 0;
  border-bottom: 1px solid var(--color-line);
  font-size: var(--font-size-base);
}

.is-dense .kv-item {
  padding: var(--space-2) 0;
  font-size: var(--font-size-sm);
}

.kv-key {
  color: var(--color-text-secondary);
  font-weight: 500;
  flex: 1;
}

.kv-value {
  color: var(--color-ink);
  font-weight: 500;
  text-align: right;
  margin: 0;
}

.unspecified-label {
  color: var(--color-text-tertiary);
  font-style: italic;
  font-weight: 400;
}

@media (max-width: 640px) {
  .kv-item {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-1);
  }
  .kv-value {
    text-align: left;
  }
}
</style>

