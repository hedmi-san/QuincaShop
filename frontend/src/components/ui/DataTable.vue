<template>
  <div class="ui-data-table-container">
    <!-- Loading State -->
    <div v-if="loading" class="table-loading-skeleton">
      <div v-for="i in 5" :key="i" class="skeleton-row">
        <Skeleton height="20px" width="100%" />
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="table-error-state">
      <Icon name="alert-triangle" :size="32" class="error-icon" />
      <p class="error-message">{{ error }}</p>
      <Button variant="secondary" size="dense" icon="rotate-ccw" @click="$emit('retry')">
        Réessayer
      </Button>
    </div>

    <!-- Empty State -->
    <div v-else-if="!data || data.length === 0" class="table-empty-state">
      <slot name="empty">
        <EmptyState
          :title="emptyTitle"
          :message="emptyMessage"
          :action-label="emptyActionLabel"
          @action="$emit('empty-action')"
        />
      </slot>
    </div>

    <!-- Table Content -->
    <div v-else class="table-scroll-wrapper">
      <table class="ui-data-table">
        <thead>
          <tr>
            <th
              v-for="col in columns"
              :key="col.key"
              :class="[
                `role-${col.role || 'text'}`,
                { 'is-sortable': col.sortable }
              ]"
              :style="{ width: col.width, minWidth: col.minWidth }"
              @click="col.sortable && $emit('sort', col.key)"
            >
              <div class="th-content">
                <span>{{ col.label }}</span>
                <Icon
                  v-if="col.sortable && sortKey === col.key"
                  :name="sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'"
                  :size="14"
                />
              </div>
            </th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="(row, rowIdx) in data"
            :key="getRowKey(row, rowIdx)"
            class="table-row"
            :class="{ 'is-clickable': rowClickable }"
            @click="rowClickable && $emit('row-click', row)"
          >
            <td
              v-for="col in columns"
              :key="col.key"
              :class="[`role-${col.role || 'text'}`]"
              :data-label="col.label"
            >
              <!-- Card Mode Label for Mobile <= 768px -->
              <span class="mobile-cell-label" aria-hidden="true">{{ col.label }}</span>

              <div class="cell-content">
                <slot :name="`cell-${col.key}`" :row="row" :value="row[col.key]">
                  <!-- ID / Code Column -->
                  <span v-if="col.role === 'id'" class="code-cell font-mono">
                    {{ row[col.key] || '-' }}
                  </span>

                  <!-- Status Column -->
                  <StatusPill
                    v-else-if="col.role === 'status'"
                    :status="row[col.key]"
                  />

                  <!-- Numeric / Money Column -->
                  <span v-else-if="col.role === 'numeric'" class="num-cell font-mono">
                    {{ formatCellNum(row[col.key], col) }}
                  </span>

                  <!-- Standard Text Column -->
                  <span v-else class="text-cell" :title="String(row[col.key] || '')">
                    {{ row[col.key] ?? '-' }}
                  </span>
                </slot>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Table Pagination / Footer -->
    <div v-if="totalPages && totalPages > 1" class="table-pagination">
      <div class="pagination-info">
        Page <span class="font-mono">{{ currentPage }}</span> sur <span class="font-mono">{{ totalPages }}</span>
        <span v-if="totalCount" class="total-count">({{ totalCount }} éléments)</span>
      </div>

      <div class="pagination-controls">
        <Button
          variant="secondary"
          size="dense"
          icon="chevron-left"
          icon-only
          aria-label="Page précédente"
          :disabled="currentPage <= 1"
          @click="$emit('page-change', currentPage - 1)"
        />
        <Button
          variant="secondary"
          size="dense"
          icon="chevron-right"
          icon-only
          aria-label="Page suivante"
          :disabled="currentPage >= totalPages"
          @click="$emit('page-change', currentPage + 1)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Icon from './Icon.vue';
import Button from './Button.vue';
import Skeleton from './Skeleton.vue';
import EmptyState from './EmptyState.vue';
import StatusPill from './StatusPill.vue';
import { formatMoney, formatNumber } from '../../lib/format';

export interface TableColumn {
  key: string;
  label: string;
  role?: 'text' | 'id' | 'numeric' | 'status' | 'actions';
  width?: string;
  minWidth?: string;
  sortable?: boolean;
  isCurrency?: boolean;
}

interface Props {
  columns: TableColumn[];
  data: any[];
  rowKey?: string;
  loading?: boolean;
  error?: string | null;
  sortKey?: string;
  sortOrder?: 'asc' | 'desc';
  currentPage?: number;
  totalPages?: number;
  totalCount?: number;
  rowClickable?: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyActionLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  rowKey: 'id',
  loading: false,
  error: null,
  sortOrder: 'asc',
  currentPage: 1,
  totalPages: 1,
  rowClickable: false,
  emptyTitle: 'Aucune donnée disponible',
  emptyMessage: 'Aucun enregistrement ne correspond à vos critères.',
});

defineEmits(['sort', 'page-change', 'row-click', 'retry', 'empty-action']);

function getRowKey(row: any, idx: number) {
  if (props.rowKey && row[props.rowKey] !== undefined) {
    return row[props.rowKey];
  }
  return idx;
}

function formatCellNum(val: any, col: TableColumn) {
  if (val === null || val === undefined) return '-';
  if (col.isCurrency) return formatMoney(val);
  return formatNumber(val);
}
</script>

<style scoped>
.ui-data-table-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  background-color: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-card);
  overflow: hidden;
}

.table-scroll-wrapper {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.ui-data-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

/* Table Header: 12px muted 500, sentence case, sticky, NO bold/uppercase */
.ui-data-table th {
  padding: var(--space-3) var(--space-4);
  background-color: var(--color-subtle);
  border-bottom: 1px solid var(--color-line);
  font-family: var(--font-sans);
  font-size: var(--font-size-xs);
  font-weight: 500;
  color: var(--color-text-muted);
  text-transform: none; /* Contract rule: sentence case, no uppercase headers */
  white-space: nowrap;
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
}

.th-content {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.ui-data-table th.is-sortable {
  cursor: pointer;
  user-select: none;
}
.ui-data-table th.is-sortable:hover {
  color: var(--color-ink);
}

/* Rows: 56-64px height */
.table-row {
  border-bottom: 1px solid var(--color-line);
  transition: background-color 0.15s ease;
}
.table-row:hover {
  background-color: var(--color-subtle);
}
.table-row.is-clickable {
  cursor: pointer;
}

.ui-data-table td {
  padding: var(--space-4);
  font-size: var(--font-size-base);
  color: var(--color-ink);
  vertical-align: middle;
}

/* Column Roles */
.role-id {
  white-space: nowrap;
  font-weight: 500;
  color: var(--color-ink);
}

.role-numeric {
  text-align: right;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.ui-data-table th.role-numeric .th-content {
  justify-content: flex-end;
}

.role-status {
  white-space: nowrap;
}

.role-actions {
  text-align: right;
  white-space: nowrap;
}
.ui-data-table th.role-actions .th-content {
  justify-content: flex-end;
}

.mobile-cell-label {
  display: none;
}

/* Loading & Empty */
.table-loading-skeleton {
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.table-error-state {
  padding: var(--space-7) var(--space-5);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  text-align: center;
}
.error-icon {
  color: var(--color-danger);
}
.error-message {
  font-size: var(--font-size-base);
  color: var(--color-danger-text);
  max-width: 40ch;
}

.table-empty-state {
  padding: var(--space-7) var(--space-5);
}

/* Pagination */
.table-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  background-color: var(--color-subtle);
  border-top: 1px solid var(--color-line);
}

.pagination-info {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}
.total-count {
  margin-left: var(--space-1);
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

/* Mobile Responsive Transformation: <= 768px rows become cards */
@media (max-width: 768px) {
  .ui-data-table,
  .ui-data-table tbody,
  .table-row,
  .ui-data-table td {
    display: block;
    width: 100%;
  }

  .ui-data-table thead {
    display: none; /* Visually hidden for assistive tech, cards have data-label */
  }

  .table-row {
    padding: var(--space-4);
    border-bottom: 2px solid var(--color-line);
  }

  .ui-data-table td {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-2) 0;
    border: none;
  }

  .mobile-cell-label {
    display: inline-block;
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    font-weight: 500;
  }

  .role-actions {
    margin-top: var(--space-3);
    padding-top: var(--space-2);
    border-top: 1px solid var(--color-line);
    justify-content: flex-end;
  }
}
</style>

