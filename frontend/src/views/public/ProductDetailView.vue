<template>
  <div class="product-detail-view">
    <!-- Breadcrumb -->
    <nav class="breadcrumb">
      <router-link to="/">Accueil</router-link>
      <span class="separator">/</span>
      <span v-if="product?.category_name">
        <a href="#" @click.prevent="filterByCategory(product.category_id)">{{ product.category_name }}</a>
        <span class="separator">/</span>
      </span>
      <span class="current">{{ product?.name || 'Détail Produit' }}</span>
    </nav>

    <!-- Loading State -->
    <div v-if="catalogStore.loading" class="loading-state">
      <p>Chargement de la fiche technique...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="!product" class="error-state">
      <h2>Article Introuvable</h2>
      <p>Le produit demandé n'existe pas ou n'est plus publié.</p>
      <router-link to="/" class="btn-primary">Retour au catalogue</router-link>
    </div>

    <!-- Main Detail Layout -->
    <div v-else class="detail-container">
      <!-- Left Column: High-Res Photo Gallery -->
      <div class="gallery-column">
        <div class="main-photo-wrapper">
          <img
            v-if="selectedImage"
            :src="selectedImage"
            :alt="product.name"
            class="main-photo"
          />
          <div v-else class="photo-placeholder">
            <span class="placeholder-icon">🛠️</span>
            <span>Image non disponible</span>
          </div>

          <div
            class="gallery-stock-badge"
            :class="product.availability === 'IN_STOCK' ? 'in-stock' : 'out-of-stock'"
          >
            {{ product.availability === 'IN_STOCK' ? '✓ En Stock' : '✕ Rupture' }}
          </div>
        </div>

        <!-- Thumbnails Strip -->
        <div v-if="product.images && product.images.length > 1" class="thumbnail-strip">
          <button
            v-for="img in product.images"
            :key="img.id"
            class="thumb-btn"
            :class="{ active: selectedImage === img.url }"
            @click="selectedImage = img.url"
          >
            <img :src="img.thumb_url || img.url" :alt="img.alt || product.name" class="thumb-img" />
          </button>
        </div>
      </div>

      <!-- Right Column: Specs & Commercial Info -->
      <div class="info-column">
        <div class="header-tags">
          <span v-if="product.brand" class="brand-pill">{{ product.brand }}</span>
          <span class="ref-pill">Réf: {{ product.reference }}</span>
          <span v-if="product.unit" class="unit-pill">Unité: {{ product.unit }}</span>
          <span v-if="product.box_size > 1" class="box-pill">Colisage: {{ product.box_size }} pcs</span>
        </div>

        <h1 class="detail-title">{{ product.name }}</h1>

        <!-- Commercial Pricing Block -->
        <div class="pricing-card">
          <!-- Active Client View -->
          <template v-if="authStore.isActiveClient && product.sale_price !== undefined">
            <div class="b2b-price-display">
              <div class="price-row main-price">
                <span class="label">Prix Grossiste HT :</span>
                <span class="value">{{ formatCurrency(product.sale_price) }}</span>
              </div>
              <div class="price-row sub-price">
                <span class="label">TVA ({{ product.tva }}%) :</span>
                <span class="value">{{ formatCurrency((product.sale_price * (product.tva || 19)) / 100) }}</span>
              </div>
              <div v-if="product.price_ttc" class="price-row ttc-price">
                <span class="label">Total TTC :</span>
                <span class="value">{{ formatCurrency(product.price_ttc) }}</span>
              </div>
              <div v-if="product.min_order_qty && product.min_order_qty > 1" class="min-qty-alert">
                ℹ️ Quantité minimale de commande : <strong>{{ product.min_order_qty }} {{ product.unit }}s</strong>
              </div>
            </div>
          </template>

          <!-- Admin View -->
          <template v-else-if="authStore.isAdmin && product.purchase_price !== undefined">
            <div class="admin-price-display">
              <div class="admin-tag">Vue Direction / Administration</div>
              <div class="price-row">
                <span class="label">Coût Achat HT :</span>
                <span class="value">{{ formatCurrency(product.purchase_price) }}</span>
              </div>
              <div class="price-row">
                <span class="label">Prix Vente HT :</span>
                <span class="value">{{ formatCurrency(product.sale_price) }}</span>
              </div>
              <div v-if="product.margin_amount !== undefined" class="price-row margin-row">
                <span class="label">Marge brute unitaire :</span>
                <span class="value positive">{{ formatCurrency(product.margin_amount) }} (+{{ product.margin_percent }}%)</span>
              </div>
            </div>
          </template>

          <!-- Visitor / Unauthenticated Gate -->
          <template v-else>
            <div class="visitor-gate-box">
              <div class="gate-icon">🔒</div>
              <div class="gate-text">
                <h3>Tarifs réservés aux professionnels agréés</h3>
                <p>
                  SARL Outillage Industriel est un distributeur grossiste B2B. Pour consulter les tarifs revendeurs et passer commande, veuillez vous identifier ou ouvrir un compte professionnel.
                </p>
              </div>
              <div class="gate-buttons">
                <router-link :to="`/login?redirect=/products/${product.slug}`" class="btn-primary">
                  Se Connecter
                </router-link>
                <router-link to="/register" class="btn-outline">
                  Demande d'Agrément Pro
                </router-link>
              </div>
            </div>
          </template>
        </div>

        <!-- Description -->
        <div v-if="product.description" class="section-block">
          <h3 class="section-title">Description & Usage</h3>
          <p class="description-text">{{ product.description }}</p>
        </div>

        <!-- Specifications Table -->
        <div v-if="product.specs && Object.keys(product.specs).length > 0" class="section-block">
          <h3 class="section-title">Fiche Technique & Caractéristiques</h3>
          <table class="specs-table">
            <tbody>
              <tr v-for="(val, key) in product.specs" :key="key">
                <td class="spec-name">{{ formatSpecKey(key) }}</td>
                <td class="spec-value">{{ val }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth.store';
import { useCatalogStore } from '../../stores/catalog.store';
import { formatCurrency } from '../../utils/formatters';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const catalogStore = useCatalogStore();

const selectedImage = ref<string | null>(null);

const product = computed(() => catalogStore.currentProduct);

async function loadProduct() {
  const slug = route.params.slug as string;
  if (!slug) return;
  const p = await catalogStore.fetchProductBySlug(slug);
  if (p) {
    selectedImage.value = p.primary_image || (p.images?.[0]?.url ?? null);
  }
}

onMounted(() => {
  loadProduct();
});

watch(
  () => route.params.slug,
  () => {
    loadProduct();
  }
);

function formatSpecKey(key: string | number): string {
  const s = String(key).replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function filterByCategory(categoryId: number | null) {
  if (!categoryId) return;
  const cat = catalogStore.categories.find((c) => c.id === categoryId);
  if (cat) {
    catalogStore.setCategory(cat.slug);
    router.push('/');
  }
}
</script>

<style scoped>
.product-detail-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Breadcrumb */
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.breadcrumb a {
  color: var(--color-text-secondary);
  text-decoration: none;
}

.breadcrumb a:hover {
  color: var(--color-primary);
}

.separator {
  color: var(--color-border-dark);
}

.current {
  color: var(--color-text-primary);
  font-weight: 600;
}

/* Layout */
.detail-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3rem;
  margin-top: 1rem;
}

/* Gallery */
.gallery-column {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.main-photo-wrapper {
  position: relative;
  width: 100%;
  padding-top: 75%;
  background-color: var(--color-bg-subtle);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.main-photo {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 1.5rem;
}

.photo-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  color: var(--color-text-tertiary);
}

.placeholder-icon {
  font-size: 3rem;
}

.gallery-stock-badge {
  position: absolute;
  top: 1rem;
  right: 1rem;
  font-size: 0.8rem;
  font-weight: 700;
  padding: 0.35rem 0.75rem;
  border-radius: var(--radius-sm);
  z-index: 2;
}

.gallery-stock-badge.in-stock {
  background-color: var(--color-success-bg);
  color: var(--color-success);
  border: 1px solid rgba(39, 143, 94, 0.2);
}

.gallery-stock-badge.out-of-stock {
  background-color: var(--color-danger-bg);
  color: var(--color-danger);
  border: 1px solid rgba(204, 41, 41, 0.2);
}

.thumbnail-strip {
  display: flex;
  gap: 0.75rem;
  overflow-x: auto;
  padding-bottom: 0.5rem;
}

.thumb-btn {
  width: 70px;
  height: 70px;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-sm);
  background-color: var(--color-bg);
  cursor: pointer;
  padding: 0.25rem;
  transition: border-color 0.15s;
}

.thumb-btn.active {
  border-color: var(--color-primary);
}

.thumb-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

/* Info Column */
.info-column {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.header-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.brand-pill {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  color: #fff;
  background-color: var(--color-primary);
  padding: 0.2rem 0.6rem;
  border-radius: var(--radius-sm);
}

.ref-pill, .unit-pill, .box-pill {
  font-size: 0.75rem;
  font-family: var(--font-mono);
  color: var(--color-text-secondary);
  background-color: var(--color-surface);
  padding: 0.2rem 0.6rem;
  border-radius: var(--radius-sm);
}

.detail-title {
  font-size: 1.65rem;
  font-weight: 800;
  color: var(--color-primary);
  line-height: 1.3;
  margin: 0;
}

/* Pricing Card */
.pricing-card {
  background-color: var(--color-bg-subtle);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 1.5rem;
}

.b2b-price-display {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.price-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.price-row .label {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}

.price-row.main-price .value {
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--color-primary);
}

.price-row.ttc-price {
  border-top: 1px solid var(--color-border);
  padding-top: 0.5rem;
  margin-top: 0.25rem;
}

.price-row.ttc-price .value {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--color-primary);
}

.min-qty-alert {
  margin-top: 0.75rem;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  background-color: var(--color-surface);
  padding: 0.4rem 0.75rem;
  border-radius: var(--radius-sm);
}

/* Visitor Gate */
.visitor-gate-box {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.gate-icon {
  font-size: 2rem;
}

.gate-text h3 {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--color-primary);
  margin: 0 0 0.4rem 0;
}

.gate-text p {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  line-height: 1.5;
  margin: 0;
}

.gate-buttons {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.btn-primary {
  background-color: var(--color-primary);
  color: #fff;
  border: none;
  padding: 0.6rem 1.25rem;
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  font-weight: 600;
  text-decoration: none;
  display: inline-block;
}

.btn-outline {
  background: none;
  border: 1px solid var(--color-border-dark);
  color: var(--color-text-primary);
  padding: 0.6rem 1.25rem;
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  font-weight: 600;
  text-decoration: none;
  display: inline-block;
}

/* Admin Display */
.admin-price-display {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.admin-tag {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--color-info);
  margin-bottom: 0.25rem;
}

.positive {
  color: var(--color-success);
  font-weight: 700;
}

/* Section Blocks */
.section-block {
  border-top: 1px solid var(--color-border);
  padding-top: 1.25rem;
}

.section-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-primary);
  margin: 0 0 0.75rem 0;
}

.description-text {
  font-size: 0.9rem;
  line-height: 1.6;
  color: var(--color-text-secondary);
  margin: 0;
}

/* Specs Table */
.specs-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.specs-table tr:nth-child(odd) {
  background-color: var(--color-bg-subtle);
}

.specs-table td {
  padding: 0.6rem 0.85rem;
  border: 1px solid var(--color-border);
}

.spec-name {
  font-weight: 600;
  color: var(--color-text-primary);
  width: 40%;
}

.spec-value {
  color: var(--color-text-secondary);
}

@media (max-width: 900px) {
  .detail-container {
    grid-template-columns: 1fr;
  }
}
</style>

