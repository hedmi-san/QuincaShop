<template>
  <div class="ui-filter-bar">
    <div class="filter-search">
      <Input
        :model-value="search"
        size="dense"
        :placeholder="searchPlaceholder"
        prefix-icon="search"
        clearable
        @update:model-value="$emit('update:search', $event)"
        @clear="$emit('update:search', '')"
      />
    </div>

    <div v-if="$slots.filters || filters?.length" class="filter-controls">
      <slot name="filters">
        <button
          v-for="chip in filters"
          :key="chip.id"
          type="button"
          class="filter-chip"
          :class="{ 'is-active': chip.active }"
          @click="$emit('select-chip', chip.id)"
        >
          <span>{{ chip.label }}</span>
          <span v-if="chip.count !== undefined" class="chip-count">{{ chip.count }}</span>
        </button>
      </slot>
    </div>

    <div v-if="showReset" class="filter-reset">
      <Button
        variant="ghost"
        size="dense"
        icon="rotate-ccw"
        @click="$emit('reset')"
      >
        {{ resetLabel }}
      </Button>
    </div>

    <div v-if="$slots.actions" class="filter-actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
import Input from './Input.vue';
import Button from './Button.vue';

export interface FilterChip {
  id: string;
  label: string;
  count?: number;
  active?: boolean;
}

interface Props {
  search?: string;
  searchPlaceholder?: string;
  filters?: FilterChip[];
  showReset?: boolean;
  resetLabel?: string;
}

withDefaults(defineProps<Props>(), {
  search: '',
  searchPlaceholder: 'Rechercher...',
  filters: () => [],
  showReset: false,
  resetLabel: 'Réinitialiser',
});

defineEmits(['update:search', 'select-chip', 'reset']);
</script>

<style scoped>
.ui-filter-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background-color: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-control);
  margin-bottom: var(--space-4);
}

.filter-search {
  min-width: 220px;
  flex: 1;
  max-width: 360px;
}

.filter-controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  height: var(--height-control-dense);
  padding: 0 var(--space-3);
  background-color: var(--color-subtle);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-pill);
  font-family: var(--font-sans);
  font-size: var(--font-size-xs);
  font-weight: 500;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.filter-chip:hover {
  border-color: var(--color-line-strong);
  color: var(--color-ink);
}

.filter-chip.is-active {
  background-color: var(--color-brand);
  border-color: var(--color-brand);
  color: var(--color-text-inverse);
}

.chip-count {
  padding: 0 5px;
  border-radius: var(--radius-pill);
  background: rgba(0, 0, 0, 0.08);
  font-family: var(--font-mono);
  font-size: var(--font-size-xs);
}
.filter-chip.is-active .chip-count {
  background: rgba(255, 255, 255, 0.2);
}

.filter-reset {
  margin-left: auto;
}

.filter-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

@media (max-width: 768px) {
  .ui-filter-bar {
    flex-direction: column;
    align-items: stretch;
  }
  .filter-search {
    max-width: none;
  }
  .filter-reset {
    margin-left: 0;
    margin-right: 0;
  }
}
</style>
