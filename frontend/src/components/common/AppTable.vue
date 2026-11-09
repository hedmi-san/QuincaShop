<template>
  <div class="app-table-container">
    <div v-if="loading" class="table-loading-overlay">
      <div class="table-spinner"></div>
      <span>Chargement des données techniques...</span>
    </div>

    <table class="app-table">
      <thead>
        <tr>
          <th
            v-for="col in columns"
            :key="col.key"
            :style="{ width: col.width, textAlign: col.align || 'left' }"
            :class="[`col-align-${col.align || 'left'}`]"
          >
            {{ col.label }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="!loading && items.length === 0" class="empty-row">
          <td :colspan="columns.length" class="empty-cell">
            {{ emptyText || 'Aucun enregistrement trouvé.' }}
          </td>
        </tr>
        <tr
          v-for="(item, idx) in items"
          :key="item.id || idx"
          class="table-row"
          :class="{ 'is-clickable': isClickable }"
          @click="isClickable ? $emit('row-click', item) : null"
        >
          <td
            v-for="col in columns"
            :key="col.key"
            :style="{ textAlign: col.align || 'left' }"
            :class="[`col-align-${col.align || 'left'}`]"
          >
            <slot :name="`cell(${col.key})`" :item="item" :value="item[col.key]">
              {{ item[col.key] !== undefined && item[col.key] !== null ? item[col.key] : '—' }}
            </slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
export interface ColumnDef {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  width?: string;
}

withDefaults(
  defineProps<{
    columns: ColumnDef[];
    items: any[];
    loading?: boolean;
    emptyText?: string;
    isClickable?: boolean;
  }>(),
  {
    loading: false,
    emptyText: 'Aucune donnée disponible',
    isClickable: false,
  }
);

defineEmits<{
  (e: 'row-click', item: any): void;
}>();
</script>

<style scoped>
.app-table-container {
  width: 100%;
  overflow-x: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background-color: var(--color-bg);
  position: relative;
}

.app-table {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--font-sans);
  font-size: 13px;
  text-align: left;
}

thead {
  background-color: var(--color-surface);
  border-bottom: 2px solid var(--color-border);
}

th {
  padding: 10px 14px;
  font-family: var(--font-display);
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-secondary);
  white-space: nowrap;
}

td {
  padding: 10px 14px;
  border-bottom: 1px solid var(--color-border-subtle);
  color: var(--color-text-primary);
  vertical-align: middle;
}

.table-row:hover {
  background-color: var(--color-bg-subtle);
}

.table-row.is-clickable {
  cursor: pointer;
}

.col-align-left {
  text-align: left;
}

.col-align-right {
  text-align: right;
  font-family: var(--font-mono);
}

.col-align-center {
  text-align: center;
}

[dir="rtl"] th,
[dir="rtl"] td {
  text-align: right;
}

[dir="rtl"] .col-align-left {
  text-align: right;
}

[dir="rtl"] .col-align-right {
  text-align: left;
}

.empty-cell {
  padding: 32px 16px;
  text-align: center;
  color: var(--color-text-tertiary);
  font-style: italic;
}

.table-loading-overlay {
  position: absolute;
  inset: 0;
  background-color: rgba(255, 255, 255, 0.85);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  z-index: 10;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.table-spinner {
  width: 22px;
  height: 22px;
  border: 2px solid var(--color-amber);
  border-right-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

