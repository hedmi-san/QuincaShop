<template>
  <div class="catalog-view">
    <!-- Guest Notification Strip under Categories (Guests Only) -->
    <section v-if="!authStore.isAuthenticated" class="guest-banner-strip" aria-label="Tarifs professionnels">
      <div class="guest-banner-content">
        <div class="guest-banner-info">
          <Icon name="lock" :size="16" class="guest-lock-icon" />
          <span class="guest-banner-text">Connectez-vous pour voir les prix et commander</span>
        </div>
        <router-link to="/login" class="guest-banner-cta">
          Connexion
        </router-link>
      </div>
    </section>

    <!-- Toolbar: Counter, Brand Filter, Sort, View Toggle -->
    <div class="catalog-toolbar">
      <div class="toolbar-left">
        <h1 class="catalog-heading">
          {{ currentCategoryName }}
        </h1>
        <span class="catalog-count-pill font-mono">
          {{ articleCountText }}
        </span>
      </div>

      <div class="toolbar-right">
        <!-- Brand Filter Dropdown -->
        <div class="toolbar-filter-item">
          <span class="filter-caption">Marque</span>
          <Select
            v-model="selectedBrandModel"
            :options="brandOptions"
            size="dense"
            class="brand-select-field"
            @update:model-value="onBrandSelect"
          />
        </div>

        <!-- Sort Dropdown -->
        <div class="toolbar-filter-item">
          <span class="filter-caption">Tri</span>
          <Select
            v-model="sortBy"
            :options="sortOptions"
            size="dense"
            class="sort-select-field"
          />
        </div>

        <!-- Grid / List View Toggle -->
        <div class="view-toggle-group" role="group" aria-label="Mode d'affichage">
          <Button
            variant="ghost"
            size="dense"
            icon-only
            icon="layout-grid"
            :class="{ 'is-selected': viewMode === 'grid' }"
            aria-label="Affichage en grille"
            title="Affichage en grille"
            @click="setViewMode('grid')"
          />
          <Button
            variant="ghost"
            size="dense"
            icon-only
            icon="list"
            :class="{ 'is-selected': viewMode === 'list' }"
            aria-label="Affichage en liste"
            title="Affichage en liste"
            @click="setViewMode('list')"
          />
        </div>

        <!-- Reset Button -->
        <Button
          v-if="hasActiveFilters"
          variant="ghost"
          size="dense"
          icon="x"
          class="btn-reset-filters"
          @click="resetAllFilters"
        >
          Réinitialiser
        </Button>
      </div>
    </div>

    <!-- Active Search Filter Pill -->
    <div v-if="catalogStore.searchQuery" class="active-query-strip">
      <div class="query-chip">
        <Icon name="search" :size="14" />
        <span>Recherche : <strong>{{ catalogStore.searchQuery }}</strong></span>
        <Button
          variant="ghost"
          size="dense"
          icon-only
          icon="x"
          class="chip-clear-btn"
          aria-label="Effacer la recherche"
          @click="catalogStore.setSearch('')"
        />
      </div>
    </div>

    <!-- Loading State Skeleton -->
    <div v-if="catalogStore.loading" class="product-grid loading-state">
      <div v-for="n in 10" :key="n" class="skeleton-card">
        <div class="skeleton-thumb"></div>
        <div class="skeleton-meta"></div>
        <div class="skeleton-title"></div>
        <div class="skeleton-price"></div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="sortedProducts.length === 0" class="catalog-empty-state">
      <EmptyState
        icon="package-open"
        title="Aucun article trouvé"
        description="Aucun produit ne correspond à vos critères de recherche ou de filtre."
        action-label="Afficher tout le catalogue"
        @action="resetAllFilters"
      />
    </div>

    <!-- View Mode 1: Product Grid (5 cols >=1440, 4 >=1100, 3 >=800, 2 mobile) -->
    <div v-else-if="viewMode === 'grid'" class="product-grid">
      <article
        v-for="product in sortedProducts"
        :key="product.id"
        class="product-card"
        @click="goToDetail(product.slug)"
      >
        <!-- 4:3 Neutral Tile / Image -->
        <div class="card-tile">
          <img
            v-if="product.primary_image"
            :src="product.primary_image"
            :alt="product.name"
            class="card-img"
            loading="lazy"
          />
          <div v-else class="brand-initials-tile" aria-hidden="true">
            <span class="brand-initials">{{ getBrandInitials(product.brand) }}</span>
          </div>

          <!-- Stock badge ONLY when NOT In Stock -->
          <Badge
            v-if="product.availability !== 'IN_STOCK'"
            tone="danger"
            class="stock-alert-badge"
          >
            Rupture
          </Badge>
        </div>

        <!-- Card Body -->
        <div class="card-content">
          <!-- Brand + Stock as a small dot-text -->
          <div class="brand-stock-dot">
            <span class="product-brand">{{ product.brand || 'Outillage B2B' }}</span>
            <span class="dot-separator" aria-hidden="true">•</span>
            <span
              class="stock-text"
              :class="product.availability === 'IN_STOCK' ? 'stock-ok' : 'stock-out'"
            >
              {{ product.availability === 'IN_STOCK' ? 'En stock' : 'Rupture' }}
            </span>
          </div>

          <!-- Product Name (max 2 lines) -->
          <h2 class="product-name" :title="product.name">
            {{ product.name }}
          </h2>

          <!-- Réf. (monospace) + Category (muted) -->
          <div class="sku-category-row">
            <span class="sku-code font-mono">Réf. {{ product.reference }}</span>
            <span v-if="product.category_name" class="dot-separator" aria-hidden="true">•</span>
            <span v-if="product.category_name" class="category-name">{{ product.category_name }}</span>
          </div>

          <!-- Price Row at the bottom -->
          <div class="card-price-bottom">
            <!-- Logged-in Active Client View: Prix HT + Ajouter -->
            <template v-if="authStore.isActiveClient && product.sale_price !== undefined">
              <div class="pro-price-group">
                <span class="price-ht-value">
                  <Money :amount="product.sale_price" />
                  <span class="ht-suffix">HT</span>
                </span>
                <Button
                  variant="secondary"
                  size="dense"
                  class="btn-quick-add"
                  :loading="addingMap[product.id]"
                  :disabled="product.availability !== 'IN_STOCK'"
                  @click.stop="quickAddToCart(product)"
                >
                  <Icon name="plus" :size="14" />
                  <span>Ajouter</span>
                </Button>
              </div>
            </template>

            <!-- Guest / Unauthenticated Visitor View: Quiet 'Prix pro' with SVG lock -->
            <template v-else>
              <div class="quiet-pro-price">
                <Icon name="lock" :size="14" />
                <span>Prix pro</span>
              </div>
            </template>
          </div>
        </div>
      </article>
    </div>

    <!-- View Mode 2: Wholesale List Mode -->
    <div v-else class="wholesale-list-container">
      <table class="wholesale-table" aria-label="Catalogue en liste pour grossiste">
        <thead>
          <tr>
            <th class="col-thumb" scope="col">Article</th>
            <th class="col-ref" scope="col">Référence</th>
            <th class="col-desc" scope="col">Désignation</th>
            <th class="col-stock" scope="col">Disponibilité</th>
            <th class="col-price" scope="col">Prix HT</th>
            <th class="col-action" scope="col">Action</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="product in sortedProducts"
            :key="product.id"
            class="wholesale-row"
            @click="goToDetail(product.slug)"
          >
            <!-- 4:3 Mini Thumbnail / Initials -->
            <td class="col-thumb">
              <div class="list-thumb-box">
                <img
                  v-if="product.primary_image"
                  :src="product.primary_image"
                  :alt="product.name"
                  class="list-thumb-img"
                  loading="lazy"
                />
                <span v-else class="list-thumb-initials">
                  {{ getBrandInitials(product.brand) }}
                </span>
              </div>
            </td>

            <!-- Reference (Monospace only) -->
            <td class="col-ref font-mono">
              {{ product.reference }}
            </td>

            <!-- Designation -->
            <td class="col-desc">
              <div class="list-product-name">{{ product.name }}</div>
              <div class="list-product-sub">
                <span v-if="product.brand" class="list-sub-brand">{{ product.brand }}</span>
                <span v-if="product.brand && product.category_name" class="dot-separator">•</span>
                <span v-if="product.category_name" class="list-sub-cat">{{ product.category_name }}</span>
              </div>
            </td>

            <!-- Stock -->
            <td class="col-stock">
              <span
                class="stock-status-pill"
                :class="product.availability === 'IN_STOCK' ? 'is-in-stock' : 'is-out-of-stock'"
              >
                <span class="stock-dot"></span>
                {{ product.availability === 'IN_STOCK' ? 'En stock' : 'Rupture' }}
              </span>
            </td>

            <!-- Price HT or Quiet Pro Price -->
            <td class="col-price tabular-nums">
              <template v-if="authStore.isActiveClient && product.sale_price !== undefined">
                <div class="list-price-ht">
                  <Money :amount="product.sale_price" />
                  <span class="ht-suffix">HT</span>
                </div>
              </template>
              <template v-else>
                <div class="quiet-pro-price inline">
                  <Icon name="lock" :size="13" />
                  <span>Prix pro</span>
                </div>
              </template>
            </td>

            <!-- Action & Quantity -->
            <td class="col-action" @click.stop>
              <template v-if="authStore.isActiveClient && product.sale_price !== undefined">
                <div class="list-order-action">
                  <Input
                    type="number"
                    size="dense"
                    :model-value="getQty(product.id, product.min_order_qty)"
                    class="list-qty-control"
                    aria-label="Quantité de commande"
                    @update:model-value="onQtyChangeVal(product.id, $event)"
                  />
                  <Button
                    variant="primary"
                    size="dense"
                    :loading="addingMap[product.id]"
                    :disabled="product.availability !== 'IN_STOCK'"
                    class="btn-list-add"
                    @click="handleAddToCart(product, getQty(product.id, product.min_order_qty))"
                  >
                    Ajouter
                  </Button>
                </div>
              </template>
              <template v-else>
                <Button
                  variant="secondary"
                  size="dense"
                  @click="goToDetail(product.slug)"
                >
                  Fiche
                </Button>
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="catalogStore.meta.totalPages > 1" class="catalog-pagination">
      <Button
        variant="secondary"
        size="dense"
        :disabled="catalogStore.meta.page <= 1"
        icon="chevron-left"
        @click="changePage(catalogStore.meta.page - 1)"
      >
        Précédent
      </Button>

      <div class="page-indicators">
        <Button
          v-for="p in catalogStore.meta.totalPages"
          :key="p"
          :variant="p === catalogStore.meta.page ? 'primary' : 'ghost'"
          size="dense"
          class="page-indicator-btn"
          @click="changePage(p)"
        >
          {{ p }}
        </Button>
      </div>

      <Button
        variant="secondary"
        size="dense"
        :disabled="catalogStore.meta.page >= catalogStore.meta.totalPages"
        icon="chevron-right"
        @click="changePage(catalogStore.meta.page + 1)"
      >
        Suivant
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../../stores/auth.store';
import { useCatalogStore, Product } from '../../stores/catalog.store';
import { useCartStore } from '../../stores/cart.store';
import { Icon, Button, Select, Money, EmptyState, Input, Badge } from '../../components/ui';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const catalogStore = useCatalogStore();
const cartStore = useCartStore();

// View Mode (Grid vs List, remembered in localStorage)
const viewMode = ref<'grid' | 'list'>(
  typeof localStorage !== 'undefined' && localStorage.getItem('quinca_catalog_view') === 'list'
    ? 'list'
    : 'grid'
);

function setViewMode(mode: 'grid' | 'list') {
  viewMode.value = mode;
  try {
    localStorage.setItem('quinca_catalog_view', mode);
  } catch (e) {}
}

// Brand Selection Model
const selectedBrandModel = computed({
  get: () => catalogStore.selectedBrand,
  set: (val: string | number | null) => {
    catalogStore.setBrand(val != null ? String(val) : '');
  },
});

function onBrandSelect(val: string | number | null) {
  catalogStore.setBrand(val != null ? String(val) : '');
}

const brandOptions = computed(() => [
  { value: '', label: 'Toutes les marques' },
  ...catalogStore.brands.map((b) => ({ value: b, label: b })),
]);

// Sorting (Pertinence / Référence / Prix)
const sortBy = ref<'relevance' | 'reference' | 'price_asc' | 'price_desc'>('relevance');

const sortOptions = [
  { value: 'relevance', label: 'Pertinence' },
  { value: 'reference', label: 'Référence' },
  { value: 'price_asc', label: 'Prix croissant' },
  { value: 'price_desc', label: 'Prix décroissant' },
];

const sortedProducts = computed(() => {
  const prods = [...catalogStore.products];
  if (sortBy.value === 'reference') {
    return prods.sort((a, b) => a.reference.localeCompare(b.reference));
  }
  if (sortBy.value === 'price_asc') {
    return prods.sort((a, b) => (Number(a.sale_price) || 0) - (Number(b.sale_price) || 0));
  }
  if (sortBy.value === 'price_desc') {
    return prods.sort((a, b) => (Number(b.sale_price) || 0) - (Number(a.sale_price) || 0));
  }
  return prods;
});

// Proper French plural: "0 article", "1 article", "7 articles"
const articleCountText = computed(() => {
  const count = sortedProducts.value.length;
  if (count === 0) return '0 article';
  if (count === 1) return '1 article';
  return `${count} articles`;
});

const currentCategoryName = computed(() => {
  if (!catalogStore.activeCategory) return 'Tous les produits';
  const found = catalogStore.categories.find((c) => c.slug === catalogStore.activeCategory);
  if (!found) return 'Catalogue';
  return found.name.charAt(0).toUpperCase() + found.name.slice(1);
});

const hasActiveFilters = computed(() => {
  return !!catalogStore.activeCategory || !!catalogStore.searchQuery || !!catalogStore.selectedBrand;
});

function resetAllFilters() {
  catalogStore.resetFilters();
}

// 4:3 Brand Initials Generator (e.g. Bosch -> BO, Makita -> MA, Stanley -> ST)
function getBrandInitials(brand?: string | null): string {
  if (!brand || !brand.trim()) return 'OI';
  const clean = brand.trim();
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

// Wholesale Order Quantities & Cart Addition
const itemQuantities = ref<Record<number, number>>({});
const addingMap = ref<Record<number, boolean>>({});

function getQty(productId: number, minOrder = 1): number {
  return itemQuantities.value[productId] || minOrder || 1;
}

function onQtyChangeVal(productId: number, val: string | number | null) {
  const num = typeof val === 'number' ? val : parseInt(String(val), 10);
  itemQuantities.value[productId] = isNaN(num) || num < 1 ? 1 : num;
}

async function quickAddToCart(product: Product) {
  await handleAddToCart(product, product.min_order_qty || 1);
}

async function handleAddToCart(product: Product, quantity: number) {
  if (!authStore.isActiveClient) {
    router.push(`/login?redirect=${encodeURIComponent(route.fullPath)}`);
    return;
  }
  addingMap.value[product.id] = true;
  try {
    await cartStore.addItem(product.id, quantity);
  } finally {
    addingMap.value[product.id] = false;
  }
}

function changePage(page: number) {
  catalogStore.fetchProducts(page);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goToDetail(slug: string) {
  router.push(`/products/${slug}`);
}

onMounted(() => {
  catalogStore.fetchProducts();
});
</script>

<style scoped>
.catalog-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

/* Guest Notification Strip under Categories */
.guest-banner-strip {
  background-color: var(--color-subtle);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-control);
  padding: var(--space-3) var(--space-4);
}

.guest-banner-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.guest-banner-info {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  font-weight: 500;
}

.guest-lock-icon {
  color: var(--color-accent);
}

.guest-banner-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: var(--height-control-dense);
  padding: 0 var(--space-4);
  background-color: var(--color-brand);
  color: var(--color-text-inverse);
  border-radius: var(--radius-control);
  font-size: var(--font-size-sm);
  font-weight: 500;
  text-decoration: none;
  transition: background-color 0.15s ease;
}

.guest-banner-cta:hover {
  background-color: var(--color-brand-hover, var(--color-ink));
}

/* Toolbar */
.catalog-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--color-line);
  flex-wrap: wrap;
}

.toolbar-left {
  display: flex;
  align-items: baseline;
  gap: var(--space-3);
}

.catalog-heading {
  font-family: var(--font-sans);
  font-size: var(--font-size-lg);
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--color-ink);
  margin: 0;
}

.catalog-count-pill {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.toolbar-filter-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.filter-caption {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  font-weight: 500;
}

.brand-select-field {
  width: 170px;
}

.sort-select-field {
  width: 155px;
}

.view-toggle-group {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  background-color: var(--color-subtle);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-control);
  padding: 2px;
}

.view-toggle-group :deep(.ui-button) {
  border-radius: calc(var(--radius-control) - 2px);
  color: var(--color-text-secondary);
}

.view-toggle-group :deep(.ui-button.is-selected) {
  background-color: var(--color-surface);
  color: var(--color-ink);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

/* Active Search Filter Pill */
.active-query-strip {
  display: flex;
  align-items: center;
}

.query-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  background-color: var(--color-subtle);
  border: 1px solid var(--color-line);
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-pill);
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.chip-clear-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--color-text-muted);
  display: inline-flex;
  align-items: center;
  padding: 0;
}

.chip-clear-btn:hover {
  color: var(--color-ink);
}

/* Product Grid (5 cols >=1440, 4 >=1100, 3 >=800, 2 mobile) */
.product-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: var(--space-4);
}

@media (max-width: 1439px) {
  .product-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (max-width: 1099px) {
  .product-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 799px) {
  .product-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-3);
  }
}

/* Product Card */
.product-card {
  display: flex;
  flex-direction: column;
  background-color: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-card);
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.product-card:hover {
  border-color: var(--color-line-strong);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

/* 4:3 Neutral Tile / Image */
.card-tile {
  position: relative;
  aspect-ratio: 4 / 3;
  width: 100%;
  background-color: var(--color-subtle);
  border-bottom: 1px solid var(--color-line);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.card-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.2s ease;
}

.product-card:hover .card-img {
  transform: scale(1.02);
}

.brand-initials-tile {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background-color: var(--color-subtle);
}

.brand-initials {
  font-family: var(--font-sans);
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--color-text-muted);
  letter-spacing: 0.08em;
}

/* Stock Alert Badge (shown ONLY when NOT In Stock) */
.stock-alert-badge {
  position: absolute;
  top: var(--space-2);
  right: var(--space-2);
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  background-color: var(--color-danger-tint);
  border: 1px solid var(--color-danger-border);
  color: var(--color-danger-text);
  padding: 2px 6px;
  border-radius: var(--radius-control);
  font-size: var(--font-size-xs);
  font-weight: 600;
}

[dir="rtl"] .stock-alert-badge {
  right: auto;
  left: var(--space-2);
}

/* Card Content */
.card-content {
  display: flex;
  flex-direction: column;
  padding: var(--space-3);
  flex: 1;
}

/* Brand + Stock as a small dot-text */
.brand-stock-dot {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--font-size-xs);
  margin-bottom: var(--space-1);
}

.product-brand {
  font-weight: 600;
  color: var(--color-ink);
}

.dot-separator {
  color: var(--color-line-strong);
}

.stock-text {
  font-weight: 500;
}

.stock-text.stock-ok {
  color: var(--color-success);
}

.stock-text.stock-out {
  color: var(--color-danger);
}

/* Product Name (max 2 lines) */
.product-name {
  font-family: var(--font-sans);
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-ink);
  line-height: 1.35;
  height: 2.7em;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin: 0 0 var(--space-1) 0;
}

/* SKU + Category Muted */
.sku-category-row {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  margin-bottom: var(--space-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sku-code {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.category-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Price Row at Bottom */
.card-price-bottom {
  margin-top: auto;
  padding-top: var(--space-2);
  border-top: 1px solid var(--color-line);
}

.pro-price-group {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.price-ht-value {
  display: inline-flex;
  align-items: baseline;
  gap: 3px;
  font-weight: 700;
  color: var(--color-ink);
  font-size: var(--font-size-sm);
}

.ht-suffix {
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-text-muted);
}

.btn-quick-add {
  height: var(--height-control-dense);
  padding: 0 var(--space-2);
  font-size: var(--font-size-xs);
}

/* Quiet 'Prix pro' for guests */
.quiet-pro-price {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
  font-weight: 500;
  padding: var(--space-1) 0;
}

.quiet-pro-price.inline {
  padding: 0;
}

/* Wholesale List Mode */
.wholesale-list-container {
  background-color: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-card);
  overflow-x: auto;
}

.wholesale-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
  text-align: left;
}

[dir="rtl"] .wholesale-table {
  text-align: right;
}

.wholesale-table thead {
  background-color: var(--color-subtle);
  border-bottom: 1px solid var(--color-line);
}

.wholesale-table th {
  padding: var(--space-3) var(--space-4);
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-text-muted);
  white-space: nowrap;
}

.wholesale-row {
  border-bottom: 1px solid var(--color-line);
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.wholesale-row:hover {
  background-color: var(--color-subtle);
}

.wholesale-row td {
  padding: var(--space-3) var(--space-4);
  vertical-align: middle;
}

.col-thumb {
  width: 60px;
}

.list-thumb-box {
  width: 48px;
  height: 36px;
  background-color: var(--color-subtle);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-control);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.list-thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.list-thumb-initials {
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--color-text-muted);
}

.col-ref {
  width: 140px;
  white-space: nowrap;
  font-size: var(--font-size-xs);
  color: var(--color-ink);
}

.list-product-name {
  font-weight: 600;
  color: var(--color-ink);
}

.list-product-sub {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  margin-top: 2px;
}

.stock-status-pill {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  font-size: var(--font-size-xs);
  font-weight: 500;
}

.stock-status-pill.is-in-stock {
  background-color: var(--color-success-tint);
  color: var(--color-success-text);
  border: 1px solid var(--color-success-border);
}

.stock-status-pill.is-out-of-stock {
  background-color: var(--color-danger-tint);
  color: var(--color-danger-text);
  border: 1px solid var(--color-danger-border);
}

.stock-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: currentColor;
}

.col-price {
  width: 150px;
  white-space: nowrap;
}

.list-price-ht {
  font-weight: 700;
  color: var(--color-ink);
}

.col-action {
  width: 160px;
  text-align: right;
}

[dir="rtl"] .col-action {
  text-align: left;
}

.list-order-action {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

.list-qty-control {
  width: 60px;
  height: var(--height-control-dense);
  padding: 0 var(--space-2);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-control);
  font-family: var(--font-mono);
  font-size: var(--font-size-sm);
  text-align: center;
  background-color: var(--color-surface);
  color: var(--color-ink);
  outline: none;
}

.list-qty-control:focus {
  border-color: var(--color-brand);
}

/* Pagination */
.catalog-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  margin-top: var(--space-5);
}

.page-indicators {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.page-indicator-btn {
  min-width: 36px;
}

/* Skeleton Loading */
.loading-state {
  pointer-events: none;
}

.skeleton-card {
  background-color: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-card);
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.skeleton-thumb {
  aspect-ratio: 4 / 3;
  width: 100%;
  background-color: var(--color-subtle);
  border-radius: var(--radius-control);
}

.skeleton-meta {
  height: 12px;
  width: 50%;
  background-color: var(--color-subtle);
  border-radius: var(--radius-control);
}

.skeleton-title {
  height: 32px;
  width: 90%;
  background-color: var(--color-subtle);
  border-radius: var(--radius-control);
}

.skeleton-price {
  height: 20px;
  width: 40%;
  background-color: var(--color-subtle);
  border-radius: var(--radius-control);
  margin-top: var(--space-2);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .catalog-toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-3);
  }

  .toolbar-right {
    justify-content: space-between;
  }

  .brand-select-field,
  .sort-select-field {
    width: 130px;
  }

  .wholesale-table {
    display: block;
  }

  .wholesale-table thead {
    display: none;
  }

  .wholesale-table tbody,
  .wholesale-row {
    display: block;
  }

  .wholesale-row {
    padding: var(--space-3);
    margin-bottom: var(--space-3);
    border: 1px solid var(--color-line);
    border-radius: var(--radius-card);
  }

  .wholesale-row td {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-1) 0;
    width: 100% !important;
  }

  .col-thumb {
    display: none !important;
  }
}
</style>
