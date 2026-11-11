<template>
  <header class="ui-page-header">
    <div class="header-main">
      <nav v-if="$slots.breadcrumb || breadcrumbs?.length" class="header-breadcrumbs" aria-label="Fil d'Ariane">
        <slot name="breadcrumb">
          <ol class="breadcrumb-list">
            <li v-for="(b, idx) in breadcrumbs" :key="idx" class="breadcrumb-item">
              <router-link v-if="b.to" :to="b.to" class="breadcrumb-link">{{ b.label }}</router-link>
              <span v-else class="breadcrumb-current">{{ b.label }}</span>
              <span v-if="breadcrumbs && idx < breadcrumbs.length - 1" class="breadcrumb-separator" aria-hidden="true">/</span>
            </li>
          </ol>
        </slot>
      </nav>

      <div class="title-row">
        <h1 class="page-title">{{ title }}</h1>
        <slot name="title-extra" />
      </div>

      <p v-if="subtitle" class="page-subtitle">{{ subtitle }}</p>
    </div>

    <div v-if="$slots.actions" class="header-actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<script setup lang="ts">
export interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface Props {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
}

defineProps<Props>();
</script>

<style scoped>
.ui-page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-5);
  min-height: 48px;
  max-height: 96px;
}

.header-main {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.header-breadcrumbs {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.breadcrumb-list {
  display: flex;
  align-items: center;
  list-style: none;
  padding: 0;
  margin: 0;
  gap: var(--space-1);
}

.breadcrumb-link {
  color: var(--color-text-muted);
  text-decoration: none;
}
.breadcrumb-link:hover {
  color: var(--color-ink);
  text-decoration: underline;
}

.breadcrumb-current {
  color: var(--color-ink);
  font-weight: 500;
}

.breadcrumb-separator {
  color: var(--color-text-tertiary);
  margin: 0 2px;
}

.title-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.page-title {
  font-family: var(--font-sans);
  font-size: var(--font-size-2xl);
  font-weight: 600;
  line-height: var(--line-height-tight);
  color: var(--color-ink);
  margin: 0;
}

.page-subtitle {
  font-size: var(--font-size-base);
  color: var(--color-text-muted);
  line-height: var(--line-height-normal);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 80ch;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .ui-page-header {
    flex-direction: column;
    align-items: stretch;
    max-height: none;
  }
  .header-actions {
    margin-top: var(--space-2);
    justify-content: flex-start;
  }
}
</style>
