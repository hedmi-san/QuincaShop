<template>
  <div class="catalog-view">
    <!-- Filter and Status Bar -->
    <div class="catalog-toolbar">
      <div class="toolbar-left">
        <h1 class="catalog-title">
          {{ currentCategoryName }}
        </h1>
        <span class="catalog-counter">
          {{ catalogStore.meta.total }} article(s) trouvé(s)
        </span>
      </div>

      <div class="toolbar-right">
        <!-- Brand Filter Dropdown -->
        <div class="filter-group">
          <label for="brand-select" class="filter-label">Marque :</label>
          <select
            id="brand-select"
            :value="catalogStore.selectedBrand"
            class="filter-select"
            @change="onBrandChange"
          >
            <option value="">Toutes les marques</option>
            <option v-for="b in catalogStore.brands" :key="b" :value="b">
              {{ b }}
            </option>
          </select>
        </div>

        <!-- Reset Button -->
        <button
          v-if="hasActiveFilters"
          class="btn-reset-filters"
          @click="catalogStore.resetFilters()"
        >
          Réinitialiser filtres ✕
        </button>
      </div>
    </div>

    <!-- Active Search Keyword Notice -->
    <div v-if="catalogStore.searchQuery" class="search-active-pill">
      Résultats pour le terme : "<strong>{{ catalogStore.searchQuery }}</strong>"
      <button class="clear-pill" @click="catalogStore.setSearch('')">✕</button>
    </div>

    <!-- Loading State -->
    <div v-if="catalogStore.loading" class="loading-grid">
      <div v-for="n in 6" :key="n" class="skeleton-card">
        <div class="skeleton-img"></div>
        <div class="skeleton-line line-sm"></div>
        <div class="skeleton-line line-lg"></div>
        <div class="skeleton-line line-md"></div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="catalogStore.products.length === 0" class="empty-state">
      <div class="empty-icon">📦</div>
      <h3>Aucun produit trouvé</h3>
      <p>Aucun article ne correspond à vos critères de recherche ou de filtre.</p>
      <button class="btn-primary" @click="catalogStore.resetFilters()">
        Afficher tout le catalogue
      </button>
    </div>

    <!-- Product Grid -->
    <div v-else class="product-grid">
      <div
        v-for="product in catalogStore.products"
        :key="product.id"
        class="product-card"
        @click="goToDetail(product.slug)"
      >
        <!-- Product Thumbnail Image -->
        <div class="card-image-wrapper">
          <img
            v-if="product.primary_image"
            :src="product.primary_image"
            :alt="product.name"
            class="card-img"
            loading="lazy"
          />
          <div v-else class="card-placeholder-img">
            <span class="placeholder-icon">⚙️</span>
            <span class="placeholder-text">{{ product.brand || 'OUTILLAGE B2B' }}</span>
          </div>

          <!-- Stock Badge -->
          <div
            class="stock-badge"
            :class="product.availability === 'IN_STOCK' ? 'in-stock' : 'out-of-stock'"
          >
            <span class="stock-dot"></span>
            {{ product.availability === 'IN_STOCK' ? 'EN STOCK' : 'RUPTURE' }}
          </div>
        </div>

        <!-- Card Body -->
        <div class="card-body">
          <div class="card-meta">
            <span v-if="product.brand" class="brand-tag">{{ product.brand }}</span>
            <span class="reference-tag">{{ product.reference }}</span>
          </div>

          <h3 class="product-name" :title="product.name">
            {{ product.name }}
          </h3>

          <p v-if="product.category_name" class="category-tag">
            {{ product.category_name }}
          </p>

          <!-- Price & Access Area -->
          <div class="card-pricing">
            <!-- Active Client View -->
            <template v-if="authStore.isActiveClient && product.sale_price !== undefined">
              <div class="price-block">
                <span class="price-ht">{{ formatCurrency(product.sale_price) }} <small>HT</small></span>
                <span v-if="product.price_ttc" class="price-ttc">
                  {{ formatCurrency(product.price_ttc) }} TTC
                </span>
              </div>
            </template>

            <!-- Admin View -->
            <template v-else-if="authStore.isAdmin && product.purchase_price !== undefined">
              <div class="admin-price-box">
                <div class="admin-price-row">
                  <span>Achat HT:</span>
                  <strong>{{ formatCurrency(product.purchase_price) }}</strong>
                </div>
                <div class="admin-price-row">
                  <span>Vente HT:</span>
                  <strong>{{ formatCurrency(product.sale_price) }}</strong>
                </div>
                <div v-if="product.margin_percent !== undefined" class="margin-row">
                  <span>Marge:</span>
                  <span class="margin-val">+{{ product.margin_percent }}%</span>
                </div>
              </div>
            </template>

            <!-- Visitor / Unauthenticated / Pending Notice -->
            <template v-else>
              <div class="b2b-price-gate">
                <router-link
                  :to="`/login?redirect=/products/${product.slug}`"
                  class="price-gate-link"
                  @click.stop
                >
                  🔒 Connectez-vous pour voir les prix
                </router-link>
              </div>
            </template>
          </div>
        </div>

        <!-- Card Footer -->
        <div class="card-footer">
          <button class="btn-detail" @click.stop="goToDetail(product.slug)">
            Fiche Technique →
          </button>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="catalogStore.meta.totalPages > 1" class="pagination-bar">
      <button
        class="page-btn"
        :disabled="catalogStore.meta.page <= 1"
        @click="changePage(catalogStore.meta.page - 1)"
      >
        ← Précédent
      </button>

      <div class="page-numbers">
        <button
          v-for="p in catalogStore.meta.totalPages"
          :key="p"
          class="page-num-btn"
          :class="{ active: p === catalogStore.meta.page }"
          @click="changePage(p)"
        >
          {{ p }}
        </button>
      </div>

      <button
        class="page-btn"
        :disabled="catalogStore.meta.page >= catalogStore.meta.totalPages"
        @click="changePage(catalogStore.meta.page + 1)"
      >
        Suivant →
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth.store';
import { useCatalogStore } from '../../stores/catalog.store';
import { formatCurrency } from '../../utils/formatters';

const router = useRouter();
const authStore = useAuthStore();
const catalogStore = useCatalogStore();

onMounted(() => {
  catalogStore.fetchProducts();
});

const currentCategoryName = computed(() => {
  if (!catalogStore.activeCategory) return 'Tous les Produits';
  const found = catalogStore.categories.find((c) => c.slug === catalogStore.activeCategory);
  return found ? found.name : 'Catalogue';
});

const hasActiveFilters = computed(() => {
  return !!catalogStore.activeCategory || !!catalogStore.searchQuery || !!catalogStore.selectedBrand;
});

function onBrandChange(e: Event) {
  const target = e.target as HTMLSelectElement;
  catalogStore.setBrand(target.value);
}

function changePage(page: number) {
  catalogStore.fetchProducts(page);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goToDetail(slug: string) {
  router.push(`/products/${slug}`);
}
</script>

<style scoped>
.catalog-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Toolbar */
.catalog-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 1rem;
}

.catalog-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--color-primary);
  margin: 0 0 0.25rem 0;
}

.catalog-counter {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.filter-label {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.filter-select {
  padding: 0.4rem 0.75rem;
  font-size: 0.85rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background-color: var(--color-bg);
  outline: none;
  cursor: pointer;
}

.filter-select:focus {
  border-color: var(--color-primary);
}

.btn-reset-filters {
  background: none;
  border: none;
  color: var(--color-danger);
  font-size: 0.8rem;
  cursor: pointer;
  padding: 0.4rem 0.6rem;
  border-radius: var(--radius-sm);
}

.btn-reset-filters:hover {
  background-color: var(--color-danger-bg);
}

/* Search active pill */
.search-active-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background-color: var(--color-surface);
  padding: 0.35rem 0.85rem;
  border-radius: var(--radius-full);
  font-size: 0.8rem;
  width: fit-content;
}

.clear-pill {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-text-secondary);
  font-weight: bold;
}

/* Product Grid */
.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}

.product-card {
  background-color: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast), transform var(--transition-fast);
  cursor: pointer;
}

.product-card:hover {
  transform: translateY(-1px);
  border-color: var(--color-amber);
  box-shadow: 0 3px 8px rgba(18, 22, 26, 0.08);
}

/* Image */
.card-image-wrapper {
  position: relative;
  width: 100%;
  padding-top: 75%; /* 4:3 aspect ratio */
  background-color: var(--color-bg-subtle);
  overflow: hidden;
  border-bottom: 1px solid var(--color-border-subtle);
}

.card-img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 0.75rem;
  transition: transform 0.2s ease;
}

.product-card:hover .card-img {
  transform: scale(1.03);
}

.card-placeholder-img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: var(--color-text-tertiary);
}

.placeholder-icon {
  font-size: 2.2rem;
}

.placeholder-text {
  font-family: var(--font-display);
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stock-badge {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  font-family: var(--font-mono);
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  padding: 0.15rem 0.45rem;
  border-radius: var(--radius-xs);
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  text-transform: uppercase;
}

.stock-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background-color: currentColor;
}

.stock-badge.in-stock {
  background-color: var(--color-success-bg);
  color: var(--color-success);
  border: 1px solid var(--color-success-border);
}

.stock-badge.out-of-stock {
  background-color: var(--color-danger-bg);
  color: var(--color-danger);
  border: 1px solid var(--color-danger-border);
}

/* Body */
.card-body {
  padding: 1rem;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.card-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.4rem;
}

.brand-tag {
  font-family: var(--font-display);
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-primary);
  background-color: var(--color-surface);
  padding: 0.1rem 0.45rem;
  border-radius: var(--radius-xs);
  border: 1px solid var(--color-border);
}

.reference-tag {
  font-size: 0.72rem;
  font-family: var(--font-mono);
  font-weight: 600;
  color: var(--color-text-secondary);
  background-color: var(--color-bg-subtle);
  padding: 0.1rem 0.4rem;
  border-radius: var(--radius-xs);
  border: 1px solid var(--color-border-subtle);
}

.product-name {
  font-family: var(--font-sans);
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-text-primary);
  line-height: 1.35;
  margin: 0 0 0.4rem 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  height: 2.7em;
}

.category-tag {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  margin-bottom: 0.75rem;
}

/* Pricing */
.card-pricing {
  margin-top: auto;
  padding-top: 0.75rem;
  border-top: 1px dashed var(--color-border);
}

.price-block {
  display: flex;
  flex-direction: column;
}

.price-ht {
  font-family: var(--font-mono);
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--color-primary);
}

.price-ht small {
  font-size: 0.75rem;
  font-weight: normal;
  color: var(--color-text-secondary);
}

.price-ttc {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.b2b-price-gate {
  background-color: var(--color-amber-subtle);
  border: 1px dashed var(--color-amber-border);
  padding: 0.45rem 0.6rem;
  border-radius: var(--radius-xs);
  text-align: center;
}

.price-gate-link {
  font-family: var(--font-sans);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-amber-text);
  text-decoration: none;
  display: block;
}

.price-gate-link:hover {
  color: var(--color-primary);
  text-decoration: underline;
}

.admin-price-box {
  font-size: 0.75rem;
  background-color: var(--color-surface);
  padding: 0.5rem;
  border-radius: var(--radius-sm);
}

.admin-price-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.2rem;
}

.margin-row {
  display: flex;
  justify-content: space-between;
  border-top: 1px solid var(--color-border);
  padding-top: 0.2rem;
  margin-top: 0.2rem;
}

.margin-val {
  color: var(--color-success);
  font-weight: 700;
}

/* Card Footer */
.card-footer {
  padding: 0.65rem 0.85rem;
  background-color: var(--color-bg-subtle);
  border-top: 1px solid var(--color-border-subtle);
}

.btn-detail {
  width: 100%;
  background-color: var(--color-bg);
  border: 1px solid var(--color-border-dark);
  padding: 0.45rem;
  border-radius: var(--radius-xs);
  font-family: var(--font-display);
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: var(--color-primary);
  cursor: pointer;
  transition: background-color var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast);
}

.btn-detail:hover {
  background-color: var(--color-primary);
  color: #fff;
  border-color: var(--color-primary);
}

/* Pagination */
.pagination-bar {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 2rem;
}

.page-btn {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  padding: 0.4rem 0.85rem;
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  cursor: pointer;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-numbers {
  display: flex;
  gap: 0.35rem;
}

.page-num-btn {
  background: none;
  border: 1px solid var(--color-border);
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  cursor: pointer;
}

.page-num-btn.active {
  background-color: var(--color-primary);
  color: #fff;
  border-color: var(--color-primary);
  font-weight: 700;
}

/* Empty & Skeleton */
.empty-state {
  text-align: center;
  padding: 4rem 1rem;
  background-color: var(--color-bg-subtle);
  border-radius: var(--radius-md);
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.btn-primary {
  background-color: var(--color-primary);
  color: #fff;
  border: none;
  padding: 0.6rem 1.25rem;
  border-radius: var(--radius-sm);
  font-weight: 600;
  cursor: pointer;
  margin-top: 1rem;
}

.loading-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}

.skeleton-card {
  height: 380px;
  background-color: var(--color-bg-subtle);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.skeleton-img {
  width: 100%;
  height: 180px;
  background-color: var(--color-surface);
  border-radius: var(--radius-sm);
}

.skeleton-line {
  background-color: var(--color-surface);
  height: 12px;
  border-radius: 4px;
}

.line-sm { width: 35%; }
.line-md { width: 60%; }
.line-lg { width: 90%; }
</style>

