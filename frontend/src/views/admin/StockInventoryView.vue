<template>
  <div class="stock-inventory-page">
    <PageHeader
      title="Gestion des Stocks & Inventaire"
      subtitle="Suivi en temps réel des quantités physiques, réservations de commandes et traçabilité des mouvements."
      :breadcrumbs="[
        { label: 'Administration', to: '/admin/orders' },
        { label: 'Gestion des Stocks' }
      ]"
    >
      <template #actions>
        <Button
          variant="primary"
          icon="plus-circle"
          @click="openAdjustmentModal()"
        >
          Nouvel Ajustement
        </Button>
      </template>
    </PageHeader>

    <!-- KPI Metric Cards Grid -->
    <div class="kpis-grid">
      <Card class="kpi-card">
        <div class="kpi-content">
          <div class="kpi-icon-wrapper tone-neutral">
            <Icon name="boxes" :size="22" />
          </div>
          <div class="kpi-data">
            <span class="kpi-label">Références (SKU)</span>
            <span class="kpi-value font-mono">{{ kpis.totalSkus }}</span>
          </div>
        </div>
      </Card>

      <Card class="kpi-card">
        <div class="kpi-content">
          <div class="kpi-icon-wrapper tone-info">
            <Icon name="package-check" :size="22" />
          </div>
          <div class="kpi-data">
            <span class="kpi-label">Unités Physiques</span>
            <span class="kpi-value font-mono">{{ kpis.totalUnits.toLocaleString('fr-FR') }}</span>
          </div>
        </div>
      </Card>

      <Card v-if="authStore.isAdmin && kpis.totalValuation !== null" class="kpi-card">
        <div class="kpi-content">
          <div class="kpi-icon-wrapper tone-brand">
            <Icon name="coins" :size="22" />
          </div>
          <div class="kpi-data">
            <span class="kpi-label">Valorisation Achat HT</span>
            <div class="kpi-value-money">
              <Money :amount="kpis.totalValuation" />
            </div>
          </div>
        </div>
      </Card>

      <Card class="kpi-card">
        <div class="kpi-content">
          <div class="kpi-icon-wrapper tone-warning">
            <Icon name="alert-triangle" :size="22" />
          </div>
          <div class="kpi-data">
            <span class="kpi-label">Alertes Stock Bas</span>
            <span class="kpi-value font-mono" :class="{ 'text-warning': kpis.lowStockCount > 0 }">
              {{ kpis.lowStockCount }}
            </span>
          </div>
        </div>
      </Card>

      <Card class="kpi-card">
        <div class="kpi-content">
          <div class="kpi-icon-wrapper tone-danger">
            <Icon name="alert-octagon" :size="22" />
          </div>
          <div class="kpi-data">
            <span class="kpi-label">Ruptures Déclarées</span>
            <span class="kpi-value font-mono" :class="{ 'text-danger': kpis.outOfStockCount > 0 }">
              {{ kpis.outOfStockCount }}
            </span>
          </div>
        </div>
      </Card>
    </div>

    <!-- Tab navigation -->
    <div class="tabs-nav-bar">
      <button
        type="button"
        class="tab-btn"
        :class="{ 'is-active': activeTab === 'inventory' }"
        @click="activeTab = 'inventory'"
      >
        <Icon name="package" :size="18" />
        <span>État des Stocks en Magasin</span>
      </button>

      <button
        type="button"
        class="tab-btn"
        :class="{ 'is-active': activeTab === 'movements' }"
        @click="handleSwitchToMovements"
      >
        <Icon name="history" :size="18" />
        <span>Historique des Mouvements</span>
      </button>
    </div>

    <!-- TAB 1: Stock Inventory State -->
    <div v-if="activeTab === 'inventory'" class="tab-content">
      <FilterBar
        v-model:search="searchQuery"
        search-placeholder="Rechercher par référence, désignation, marque..."
        :filters="stockStatusChips"
        show-reset
        @select-chip="handleSelectChip"
        @reset="handleResetFilters"
        @search="fetchStock(1)"
      >
        <template #actions>
          <div class="category-select-wrapper">
            <Select
              v-model="selectedCategory"
              :options="categoryOptions"
              placeholder="Toutes les catégories"
              @change="fetchStock(1)"
            />
          </div>
        </template>
      </FilterBar>

      <div class="table-container">
        <DataTable
          :columns="inventoryColumns"
          :data="stockItems"
          :loading="loading"
          :current-page="meta.page"
          :total-pages="meta.totalPages"
          :total-count="meta.total"
          @page-change="fetchStock"
        >
          <!-- Cell: Image -->
          <template #cell-image="{ row }">
            <div class="product-thumb-container">
              <img
                v-if="row.thumb_url"
                :src="row.thumb_url"
                :alt="row.name"
                class="product-thumb"
              />
              <div v-else class="product-thumb-placeholder">
                <Icon name="package" :size="20" />
              </div>
            </div>
          </template>

          <!-- Cell: Product Info -->
          <template #cell-product="{ row }">
            <div class="product-info-cell">
              <span class="product-ref font-mono">{{ row.reference }}</span>
              <span class="product-name font-medium">{{ row.name }}</span>
              <span v-if="row.brand" class="product-brand text-muted">{{ row.brand }}</span>
            </div>
          </template>

          <!-- Cell: Category -->
          <template #cell-category="{ row }">
            <Badge variant="neutral" size="dense">
              {{ row.category_name || 'Non classé' }}
            </Badge>
          </template>

          <!-- Cell: Physical Stock -->
          <template #cell-physical="{ row }">
            <span class="font-mono font-medium">{{ row.physical_quantity }} {{ row.unit }}</span>
          </template>

          <!-- Cell: Reserved Stock -->
          <template #cell-reserved="{ row }">
            <span
              class="font-mono"
              :class="{ 'text-warning font-medium': row.reserved_quantity > 0, 'text-muted': row.reserved_quantity === 0 }"
            >
              {{ row.reserved_quantity }} {{ row.unit }}
            </span>
          </template>

          <!-- Cell: Available Stock -->
          <template #cell-available="{ row }">
            <span
              class="font-mono font-bold"
              :class="{
                'text-danger': row.available_quantity <= 0,
                'text-warning': row.available_quantity > 0 && row.available_quantity <= row.min_stock_alert,
                'text-success': row.available_quantity > row.min_stock_alert
              }"
            >
              {{ row.available_quantity }} {{ row.unit }}
            </span>
          </template>

          <!-- Cell: Stock Health Status -->
          <template #cell-status="{ row }">
            <StatusPill
              :status="getToneForStatus(row.stock_status)"
              :custom-label="getLabelForStatus(row.stock_status)"
            />
          </template>

          <!-- Cell: Actions -->
          <template #cell-actions="{ row }">
            <Button
              variant="secondary"
              size="dense"
              icon="sliders-horizontal"
              @click.stop="openAdjustmentModal(row)"
            >
              Ajuster
            </Button>
          </template>
        </DataTable>
      </div>
    </div>

    <!-- TAB 2: Movements Log -->
    <div v-else-if="activeTab === 'movements'" class="tab-content">
      <FilterBar
        v-model:search="movementsSearch"
        search-placeholder="Rechercher par référence produit, n° opération, motif..."
        :filters="movementTypeChips"
        show-reset
        @select-chip="handleSelectMovementChip"
        @reset="handleResetMovementFilters"
        @search="fetchMovements(1)"
      />

      <div class="table-container">
        <DataTable
          :columns="movementsColumns"
          :data="movements"
          :loading="movementsLoading"
          :current-page="movementsMeta.page"
          :total-pages="movementsMeta.totalPages"
          :total-count="movementsMeta.total"
          @page-change="fetchMovements"
        >
          <!-- Cell: Date -->
          <template #cell-created_at="{ row }">
            <span class="font-mono text-muted">{{ formatDateTime(row.created_at) }}</span>
          </template>

          <!-- Cell: Reference -->
          <template #cell-reference="{ row }">
            <span class="font-mono font-medium">{{ row.reference }}</span>
          </template>

          <!-- Cell: Product -->
          <template #cell-product="{ row }">
            <div class="product-info-cell">
              <span class="product-ref font-mono">{{ row.product_reference }}</span>
              <span class="product-name font-medium">{{ row.product_name }}</span>
            </div>
          </template>

          <!-- Cell: Movement Type -->
          <template #cell-movement_type="{ row }">
            <Badge :variant="getBadgeVariantForMovement(row.movement_type)" size="dense">
              {{ getMovementTypeLabel(row.movement_type) }}
            </Badge>
          </template>

          <!-- Cell: Quantity Change -->
          <template #cell-quantity_change="{ row }">
            <span
              class="font-mono font-bold"
              :class="row.quantity_change > 0 ? 'text-success' : 'text-danger'"
            >
              {{ row.quantity_change > 0 ? `+${row.quantity_change}` : row.quantity_change }} {{ row.unit || 'U' }}
            </span>
          </template>

          <!-- Cell: Notes -->
          <template #cell-notes="{ row }">
            <span class="text-notes">{{ row.notes || '—' }}</span>
          </template>

          <!-- Cell: User -->
          <template #cell-created_by_name="{ row }">
            <span class="text-muted">{{ row.created_by_name || 'Système' }}</span>
          </template>
        </DataTable>
      </div>
    </div>

    <!-- Modal: Stock Adjustment -->
    <Modal
      :open="showAdjustModal"
      title="Ajustement Manuel du Stock"
      max-width="md"
      @close="showAdjustModal = false"
    >
      <form id="adjustStockForm" class="adjust-form" @submit.prevent="handleConfirmAdjustment">
        <!-- Product selector or summary -->
        <FormField label="Produit concerné" required :error="adjustErrors.productId">
          <Select
            v-model="adjustForm.productId"
            :options="productSelectOptions"
            placeholder="Sélectionner un produit"
            required
            @change="onAdjustProductChange"
          />
        </FormField>

        <!-- Current Stock Display -->
        <div v-if="selectedAdjustProduct" class="stock-preview-box">
          <div class="preview-item">
            <span class="preview-label">Physique Actuel :</span>
            <span class="preview-val font-mono">{{ selectedAdjustProduct.physical_quantity }}</span>
          </div>
          <div class="preview-item">
            <span class="preview-label">Réservé Commandes :</span>
            <span class="preview-val font-mono text-warning">{{ selectedAdjustProduct.reserved_quantity }}</span>
          </div>
          <div class="preview-item">
            <span class="preview-label">Disponible Net :</span>
            <span class="preview-val font-mono text-success">{{ selectedAdjustProduct.available_quantity }}</span>
          </div>
        </div>

        <!-- Operation Category -->
        <FormField label="Type d'opération" required>
          <Select
            v-model="adjustForm.operationType"
            :options="operationTypeOptions"
            required
            @change="onOperationTypeChange"
          />
        </FormField>

        <!-- Quantity variation -->
        <FormField
          label="Variation de Quantité"
          required
          helper="Indiquez la quantité à ajouter (+) ou à déduire (-)"
          :error="adjustErrors.quantityChange"
        >
          <Input
            v-model.number="adjustForm.quantityChange"
            type="number"
            step="1"
            placeholder="Ex: +10 ou -2"
            required
          />
        </FormField>

        <!-- Resulting Stock Preview -->
        <div v-if="selectedAdjustProduct && adjustForm.quantityChange !== 0" class="new-stock-preview">
          <span>Nouveau stock physique calculé :</span>
          <strong class="font-mono" :class="resultingPhysicalStock < 0 ? 'text-danger' : 'text-success'">
            {{ resultingPhysicalStock }} {{ selectedAdjustProduct.unit }}
          </strong>
        </div>

        <!-- Mandatory Reason -->
        <FormField
          label="Motif explicatif"
          required
          helper="Obligatoire pour la conformité et l'audit d'inventaire"
          :error="adjustErrors.reason"
        >
          <Input
            v-model="adjustForm.reason"
            placeholder="Ex: Réception BL Fournisseur 4022, Écart d'inventaire physique..."
            required
          />
        </FormField>

        <!-- Extra notes -->
        <FormField label="Observations / Détails additionnels">
          <Textarea
            v-model="adjustForm.notes"
            placeholder="Commentaires complémentaires éventuels..."
            :rows="2"
          />
        </FormField>
      </form>

      <template #footer>
        <Button variant="secondary" @click="showAdjustModal = false">Annuler</Button>
        <Button
          variant="primary"
          :loading="adjustSubmitting"
          form="adjustStockForm"
          type="submit"
        >
          Enregistrer l'Ajustement
        </Button>
      </template>
    </Modal>

    <!-- Toast Notification -->
    <Toast
      v-if="toastMessage"
      :message="toastMessage"
      :tone="toastTone"
      @close="toastMessage = null"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useAuthStore } from '../../stores/auth.store';
import api from '../../services/api';
import {
  PageHeader,
  FilterBar,
  DataTable,
  Button,
  Card,
  Modal,
  FormField,
  Input,
  Select,
  Textarea,
  Money,
  StatusPill,
  Badge,
  Toast,
  Icon,
} from '../../components/ui';
import type { TableColumn } from '../../components/ui/DataTable.vue';
import type { FilterChip } from '../../components/ui/FilterBar.vue';

const authStore = useAuthStore();

// Tab state
const activeTab = ref<'inventory' | 'movements'>('inventory');

// Inventory state
const loading = ref(false);
const stockItems = ref<any[]>([]);
const categories = ref<any[]>([]);
const allProductsList = ref<any[]>([]);
const searchQuery = ref('');
const selectedCategory = ref('');
const selectedChip = ref('ALL');

const meta = reactive({
  page: 1,
  pageSize: 25,
  total: 0,
  totalPages: 1,
});

const kpis = reactive({
  totalSkus: 0,
  totalUnits: 0,
  totalValuation: null as number | null,
  lowStockCount: 0,
  outOfStockCount: 0,
});

// Movements state
const movementsLoading = ref(false);
const movements = ref<any[]>([]);
const movementsSearch = ref('');
const selectedMovementChip = ref('ALL');

const movementsMeta = reactive({
  page: 1,
  pageSize: 25,
  total: 0,
  totalPages: 1,
});

// Adjustment Modal state
const showAdjustModal = ref(false);
const adjustSubmitting = ref(false);
const selectedAdjustProduct = ref<any>(null);

const adjustForm = reactive({
  productId: null as number | null,
  operationType: 'RECEPTION',
  quantityChange: 1,
  reason: '',
  notes: '',
});

const adjustErrors = reactive<Record<string, string>>({});

// Toast
const toastMessage = ref<string | null>(null);
const toastTone = ref<'success' | 'danger' | 'warning' | 'info'>('success');

function showToast(msg: string, tone: 'success' | 'danger' | 'warning' | 'info' = 'success') {
  toastMessage.value = msg;
  toastTone.value = tone;
  setTimeout(() => {
    if (toastMessage.value === msg) toastMessage.value = null;
  }, 4000);
}

// Columns definition
const inventoryColumns: TableColumn[] = [
  { key: 'image', label: '', width: '56px' },
  { key: 'product', label: 'Réf & Désignation' },
  { key: 'category', label: 'Catégorie' },
  { key: 'physical', label: 'Stock Physique', role: 'numeric' },
  { key: 'reserved', label: 'Réservé (CMD)', role: 'numeric' },
  { key: 'available', label: 'Disponible', role: 'numeric' },
  { key: 'status', label: 'État', role: 'status' },
  { key: 'actions', label: 'Action', role: 'actions' },
];

const movementsColumns: TableColumn[] = [
  { key: 'created_at', label: 'Date / Heure' },
  { key: 'reference', label: 'N° Mouvement' },
  { key: 'product', label: 'Produit' },
  { key: 'movement_type', label: 'Opération' },
  { key: 'quantity_change', label: 'Variation', role: 'numeric' },
  { key: 'notes', label: 'Motif & Détails' },
  { key: 'created_by_name', label: 'Utilisateur' },
];

// Chips definition
const stockStatusChips = computed<FilterChip[]>(() => [
  { id: 'ALL', label: 'Tous les stocks', count: meta.total, active: selectedChip.value === 'ALL' },
  { id: 'IN_STOCK', label: 'En stock', active: selectedChip.value === 'IN_STOCK' },
  { id: 'LOW_STOCK', label: 'Stock bas', count: kpis.lowStockCount, active: selectedChip.value === 'LOW_STOCK' },
  { id: 'OUT_OF_STOCK', label: 'Ruptures', count: kpis.outOfStockCount, active: selectedChip.value === 'OUT_OF_STOCK' },
]);

const movementTypeChips: FilterChip[] = [
  { id: 'ALL', label: 'Tous les flux' },
  { id: 'SALE', label: 'Ventes' },
  { id: 'PURCHASE', label: 'Réceptions' },
  { id: 'ADJUSTMENT', label: 'Ajustements' },
  { id: 'RESERVATION', label: 'Réservations' },
  { id: 'RELEASE', label: 'Libérations' },
];

const categoryOptions = computed(() => [
  { value: '', label: 'Toutes les catégories' },
  ...categories.value.map((c) => ({ value: String(c.id), label: c.name })),
]);

const productSelectOptions = computed(() => [
  { value: '', label: '— Sélectionner un article —' },
  ...allProductsList.value.map((p) => ({
    value: p.id,
    label: `[${p.reference}] ${p.name} (Physique: ${p.physical_quantity})`,
  })),
]);

const operationTypeOptions = [
  { value: 'RECEPTION', label: 'Réception fournisseur / Entrée de stock (+)' },
  { value: 'INVENTORY', label: 'Recalcul d’inventaire physique (+ ou -)' },
  { value: 'DAMAGED', label: 'Casse / Dégradation / Avarie (-)' },
  { value: 'RETURN', label: 'Retour client (+)' },
];

const resultingPhysicalStock = computed(() => {
  if (!selectedAdjustProduct.value) return 0;
  return Number(selectedAdjustProduct.value.physical_quantity) + Number(adjustForm.quantityChange || 0);
});

// Helpers
function getToneForStatus(status: string): string {
  switch (status) {
    case 'IN_STOCK': return 'SUCCESS';
    case 'LOW_STOCK': return 'WARNING';
    case 'OUT_OF_STOCK': return 'DANGER';
    default: return 'NEUTRAL';
  }
}

function getLabelForStatus(status: string): string {
  switch (status) {
    case 'IN_STOCK': return 'En stock';
    case 'LOW_STOCK': return 'Stock bas';
    case 'OUT_OF_STOCK': return 'Épuisé';
    default: return status;
  }
}

function getMovementTypeLabel(type: string): string {
  switch (type) {
    case 'SALE': return 'Vente';
    case 'PURCHASE': return 'Réception';
    case 'ADJUSTMENT': return 'Ajustement';
    case 'RESERVATION': return 'Réservation';
    case 'RELEASE': return 'Libération';
    case 'RETURN': return 'Retour';
    case 'INITIAL': return 'Initial';
    default: return type;
  }
}

function getBadgeVariantForMovement(type: string): 'success' | 'warning' | 'danger' | 'neutral' | 'brand' {
  switch (type) {
    case 'PURCHASE':
    case 'RETURN':
    case 'INITIAL': return 'success';
    case 'SALE': return 'brand';
    case 'ADJUSTMENT': return 'warning';
    case 'RELEASE': return 'neutral';
    case 'RESERVATION': return 'neutral';
    default: return 'neutral';
  }
}

function formatDateTime(val: string): string {
  if (!val) return '—';
  const d = new Date(val);
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Data Fetching
async function fetchCategories() {
  try {
    const res = await api.get('/admin/categories');
    if (res.data.success) {
      categories.value = res.data.data;
    }
  } catch (err) {
    console.warn('Failed to load categories', err);
  }
}

async function fetchAllProductsForSelect() {
  try {
    const res = await api.get('/admin/stock', { params: { pageSize: 100 } });
    if (res.data.success) {
      allProductsList.value = res.data.data;
    }
  } catch (err) {
    console.warn('Failed to preload products', err);
  }
}

async function fetchStock(page = 1) {
  loading.value = true;
  try {
    const params: Record<string, any> = {
      page,
      pageSize: meta.pageSize,
    };

    if (searchQuery.value.trim()) {
      params.search = searchQuery.value.trim();
    }

    if (selectedCategory.value) {
      params.category = selectedCategory.value;
    }

    if (selectedChip.value !== 'ALL') {
      params.status = selectedChip.value;
    }

    const res = await api.get('/admin/stock', { params });
    if (res.data.success) {
      stockItems.value = res.data.data;
      if (res.data.meta) {
        meta.page = res.data.meta.page;
        meta.pageSize = res.data.meta.pageSize;
        meta.total = res.data.meta.total;
        meta.totalPages = res.data.meta.totalPages;
      }
      if (res.data.kpis) {
        kpis.totalSkus = res.data.kpis.totalSkus;
        kpis.totalUnits = res.data.kpis.totalUnits;
        kpis.totalValuation = res.data.kpis.totalValuation;
        kpis.lowStockCount = res.data.kpis.lowStockCount;
        kpis.outOfStockCount = res.data.kpis.outOfStockCount;
      }
    }
  } catch (err: any) {
    showToast('Erreur lors du chargement des stocks', 'danger');
  } finally {
    loading.value = false;
  }
}

async function fetchMovements(page = 1) {
  movementsLoading.value = true;
  try {
    const params: Record<string, any> = {
      page,
      pageSize: movementsMeta.pageSize,
    };

    if (movementsSearch.value.trim()) {
      params.search = movementsSearch.value.trim();
    }

    if (selectedMovementChip.value !== 'ALL') {
      params.movementType = selectedMovementChip.value;
    }

    const res = await api.get('/admin/stock/movements', { params });
    if (res.data.success) {
      movements.value = res.data.data;
      if (res.data.meta) {
        movementsMeta.page = res.data.meta.page;
        movementsMeta.pageSize = res.data.meta.pageSize;
        movementsMeta.total = res.data.meta.total;
        movementsMeta.totalPages = res.data.meta.totalPages;
      }
    }
  } catch (err: any) {
    showToast('Erreur lors du chargement des mouvements', 'danger');
  } finally {
    movementsLoading.value = false;
  }
}

function handleSwitchToMovements() {
  activeTab.value = 'movements';
  fetchMovements(1);
}

function handleSelectChip(val: string) {
  selectedChip.value = val;
  fetchStock(1);
}

function handleResetFilters() {
  searchQuery.value = '';
  selectedCategory.value = '';
  selectedChip.value = 'ALL';
  fetchStock(1);
}

function handleSelectMovementChip(val: string) {
  selectedMovementChip.value = val;
  fetchMovements(1);
}

function handleResetMovementFilters() {
  movementsSearch.value = '';
  selectedMovementChip.value = 'ALL';
  fetchMovements(1);
}

// Adjustments
function openAdjustmentModal(productRow?: any) {
  Object.keys(adjustErrors).forEach((k) => delete adjustErrors[k]);

  if (productRow) {
    adjustForm.productId = productRow.id;
    selectedAdjustProduct.value = productRow;
  } else {
    adjustForm.productId = null;
    selectedAdjustProduct.value = null;
  }

  adjustForm.operationType = 'RECEPTION';
  adjustForm.quantityChange = 5;
  adjustForm.reason = 'Réception marchandise magasin';
  adjustForm.notes = '';

  showAdjustModal.value = true;
}

function onAdjustProductChange() {
  if (!adjustForm.productId) {
    selectedAdjustProduct.value = null;
    return;
  }
  const found = allProductsList.value.find((p) => p.id === adjustForm.productId);
  selectedAdjustProduct.value = found || null;
}

function onOperationTypeChange() {
  if (adjustForm.operationType === 'RECEPTION') {
    adjustForm.quantityChange = Math.abs(adjustForm.quantityChange || 1);
    adjustForm.reason = 'Réception marchandise magasin';
  } else if (adjustForm.operationType === 'DAMAGED') {
    adjustForm.quantityChange = -Math.abs(adjustForm.quantityChange || 1);
    adjustForm.reason = 'Avarie constatée en rayon / Casse';
  } else if (adjustForm.operationType === 'INVENTORY') {
    adjustForm.reason = 'Ajustement inventaire physique contradictoire';
  } else if (adjustForm.operationType === 'RETURN') {
    adjustForm.quantityChange = Math.abs(adjustForm.quantityChange || 1);
    adjustForm.reason = 'Retour outillage client';
  }
}

async function handleConfirmAdjustment() {
  Object.keys(adjustErrors).forEach((k) => delete adjustErrors[k]);

  if (!adjustForm.productId) {
    adjustErrors.productId = 'Veuillez sélectionner un article';
    return;
  }

  if (adjustForm.quantityChange === 0) {
    adjustErrors.quantityChange = 'La variation ne peut pas être nulle';
    return;
  }

  if (!adjustForm.reason.trim() || adjustForm.reason.trim().length < 3) {
    adjustErrors.reason = 'Le motif explicatif est obligatoire (min 3 caractères)';
    return;
  }

  adjustSubmitting.value = true;
  try {
    let movementType = 'ADJUSTMENT';
    if (adjustForm.operationType === 'RECEPTION') movementType = 'PURCHASE';
    else if (adjustForm.operationType === 'RETURN') movementType = 'RETURN';

    const res = await api.post('/admin/stock/adjust', {
      productId: adjustForm.productId,
      quantityChange: adjustForm.quantityChange,
      reason: adjustForm.reason.trim(),
      movementType,
      notes: adjustForm.notes.trim() || undefined,
    });

    if (res.data.success) {
      showToast(`Stock mis à jour pour ${res.data.data.product.name} (Nouveau: ${res.data.data.newPhysical})`);
      showAdjustModal.value = false;
      await Promise.all([fetchStock(meta.page), fetchAllProductsForSelect()]);
      if (activeTab.value === 'movements') {
        await fetchMovements(1);
      }
    }
  } catch (err: any) {
    const errorMsg = err.response?.data?.error?.message || 'Erreur lors de l’ajustement de stock';
    showToast(errorMsg, 'danger');
  } finally {
    adjustSubmitting.value = false;
  }
}

onMounted(async () => {
  await Promise.all([fetchCategories(), fetchStock(1), fetchAllProductsForSelect()]);
});
</script>

<style scoped>
.stock-inventory-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-24, 24px);
}

.kpis-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-16, 16px);
}

.kpi-card {
  padding: var(--space-16, 16px);
}

.kpi-content {
  display: flex;
  align-items: center;
  gap: var(--space-16, 16px);
}

.kpi-icon-wrapper {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-8, 8px);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.kpi-icon-wrapper.tone-neutral {
  background: var(--color-subtle, #f8fafc);
  color: var(--color-ink, #0f172a);
}

.kpi-icon-wrapper.tone-info {
  background: #eff6ff;
  color: #2563eb;
}

.kpi-icon-wrapper.tone-brand {
  background: var(--color-brand, #12161a);
  color: #ffffff;
}

.kpi-icon-wrapper.tone-warning {
  background: var(--color-warning-tint, #fffbeb);
  color: var(--color-warning-text, #b45309);
}

.kpi-icon-wrapper.tone-danger {
  background: var(--color-danger-tint, #fef2f2);
  color: var(--color-danger-text, #b91c1c);
}

.kpi-data {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
}

.kpi-label {
  font-size: 12px;
  color: var(--color-ink-muted, #64748b);
  font-weight: 500;
}

.kpi-value {
  font-size: 22px;
  font-weight: 700;
  color: var(--color-ink, #0f172a);
}

.kpi-value-money {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-ink, #0f172a);
}

.tabs-nav-bar {
  display: flex;
  gap: var(--space-8, 8px);
  border-bottom: 2px solid var(--color-line, #e2e8f0);
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-ink-muted, #64748b);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.tab-btn:hover {
  color: var(--color-ink, #0f172a);
}

.tab-btn.is-active {
  color: var(--color-brand, #12161a);
  border-bottom-color: var(--color-brand, #12161a);
  font-weight: 600;
}

.tab-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-16, 16px);
}

.category-select-wrapper {
  min-width: 220px;
}

.table-container {
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-line, #e2e8f0);
  border-radius: var(--radius-12, 12px);
  overflow: hidden;
}

.product-thumb-container {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-8, 8px);
  background: var(--color-subtle, #f8fafc);
  border: 1px solid var(--color-line, #e2e8f0);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.product-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.product-thumb-placeholder {
  color: var(--color-ink-muted, #64748b);
}

.product-info-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.product-ref {
  font-size: 12px;
  color: var(--color-ink-muted, #64748b);
  letter-spacing: 0.02em;
}

.product-name {
  font-size: 14px;
  color: var(--color-ink, #0f172a);
}

.product-brand {
  font-size: 12px;
}

.text-notes {
  font-size: 13px;
  color: var(--color-ink, #0f172a);
}

.adjust-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-16, 16px);
}

.stock-preview-box {
  display: flex;
  justify-content: space-between;
  padding: 12px;
  border-radius: var(--radius-8, 8px);
  background: var(--color-subtle, #f8fafc);
  border: 1px solid var(--color-line, #e2e8f0);
}

.preview-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.preview-label {
  font-size: 11px;
  color: var(--color-ink-muted, #64748b);
}

.preview-val {
  font-size: 14px;
  font-weight: 600;
}

.new-stock-preview {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-radius: var(--radius-8, 8px);
  background: #f1f5f9;
  font-size: 13px;
}
</style>
