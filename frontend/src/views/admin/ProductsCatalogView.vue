<template>
  <div class="products-catalog-page">
    <PageHeader
      title="Catalogue des Produits"
      subtitle="Gestion de l'outillage industriel, caractéristiques techniques, tarification et publication."
      :breadcrumbs="[
        { label: 'Administration', to: '/admin/orders' },
        { label: 'Catalogue Produits' }
      ]"
    >
      <template #actions>
        <Button
          variant="primary"
          icon="plus"
          size="default"
          @click="openCreateModal"
        >
          Nouveau Produit
        </Button>
      </template>
    </PageHeader>

    <!-- Filters & Search -->
    <FilterBar
      v-model:search="searchQuery"
      search-placeholder="Rechercher par référence, désignation, marque..."
      :filters="filterChips"
      show-reset
      @select-chip="handleSelectChip"
      @reset="handleResetFilters"
      @search="fetchProducts(1)"
    >
      <template #actions>
        <div class="category-select-wrapper">
          <Select
            v-model="selectedCategory"
            :options="categoryOptions"
            placeholder="Toutes les catégories"
            @change="fetchProducts(1)"
          />
        </div>
      </template>
    </FilterBar>

    <!-- Main Data Table -->
    <div class="table-container">
      <DataTable
        :columns="tableColumns"
        :data="products"
        :loading="loading"
        :current-page="meta.page"
        :total-pages="meta.totalPages"
        :total-count="meta.total"
        @page-change="fetchProducts"
      >
        <!-- Custom cell: Image Preview -->
        <template #cell-image="{ row }">
          <div class="product-thumb-container">
            <img
              v-if="row.primary_image || (row.images && row.images[0]?.thumb_url)"
              :src="row.primary_image || row.images[0]?.thumb_url"
              :alt="row.name"
              class="product-thumb"
              @error="handleImageError"
            />
            <div v-else class="product-thumb-placeholder">
              <Icon name="package" :size="20" />
            </div>
          </div>
        </template>

        <!-- Custom cell: Reference & Name -->
        <template #cell-product="{ row }">
          <div class="product-info-cell">
            <span class="product-ref font-mono">{{ row.reference }}</span>
            <span class="product-name font-medium">{{ row.name }}</span>
            <span v-if="row.brand" class="product-brand text-muted">{{ row.brand }}</span>
          </div>
        </template>

        <!-- Custom cell: Category -->
        <template #cell-category="{ row }">
          <Badge variant="neutral" size="dense">
            {{ row.category_name || 'Non classé' }}
          </Badge>
        </template>

        <!-- Custom cell: Stock Status -->
        <template #cell-stock="{ row }">
          <div class="stock-status-cell">
            <StatusPill
              :status="getStockStatusTone(row)"
              :custom-label="getStockStatusLabel(row)"
            />
            <span class="stock-qty-sub text-muted font-mono">
              Disp: {{ row.physical_quantity - row.reserved_quantity }} {{ row.unit || 'U' }}
              <span v-if="row.reserved_quantity > 0" class="reserved-sub">
                ({{ row.reserved_quantity }} rés.)
              </span>
            </span>
          </div>
        </template>

        <!-- Custom cell: Sale Price -->
        <template #cell-sale_price="{ row }">
          <Money :amount="row.sale_price" />
        </template>

        <!-- Custom cell: Purchase Price (Admin Only) -->
        <template #cell-purchase_price="{ row }">
          <Money v-if="authStore.isAdmin" :amount="row.purchase_price || 0" />
          <span v-else class="text-muted">-</span>
        </template>

        <!-- Custom cell: Visibility / Published -->
        <template #cell-published="{ row }">
          <button
            type="button"
            class="publish-toggle-btn"
            :class="{ 'is-published': row.published }"
            :title="row.published ? 'Visible en boutique (cliquer pour masquer)' : 'Masqué (cliquer pour publier)'"
            @click.stop="togglePublish(row)"
          >
            <Icon :name="row.published ? 'eye' : 'eye-off'" :size="16" />
            <span>{{ row.published ? 'Publié' : 'Brouillon' }}</span>
          </button>
        </template>

        <!-- Custom cell: Actions -->
        <template #cell-actions="{ row }">
          <div class="actions-group">
            <Button
              variant="ghost"
              size="dense"
              icon="pencil"
              icon-only
              aria-label="Modifier la fiche produit"
              title="Modifier la fiche produit"
              @click.stop="openEditModal(row)"
            />
            <Button
              variant="ghost"
              size="dense"
              icon="image"
              icon-only
              aria-label="Galerie photos"
              title="Galerie photos"
              @click.stop="openGalleryModal(row)"
            />
            <Button
              v-if="authStore.isAdmin"
              variant="ghost"
              size="dense"
              icon="trash-2"
              icon-only
              aria-label="Archiver le produit"
              title="Archiver le produit"
              @click.stop="confirmArchiveProduct(row)"
            />
          </div>
        </template>
      </DataTable>
    </div>

    <!-- Modal: Add Product -->
    <Modal
      :open="showCreateModal"
      title="Créer un Nouveau Produit"
      max-width="lg"
      @close="showCreateModal = false"
    >
      <form id="createProductForm" class="product-form" @submit.prevent="handleCreateProduct">
        <div class="form-grid-2">
          <FormField label="Référence Unique (Code SKU)" required :error="formErrors.reference">
            <Input
              v-model="createForm.reference"
              placeholder="Ex: PERF-24MM-800W"
              required
            />
          </FormField>

          <FormField label="Marque Fabricant">
            <Input
              v-model="createForm.brand"
              placeholder="Ex: Bosch, Total, Ingco, Makita"
            />
          </FormField>
        </div>

        <FormField label="Désignation Complète du Produit" required :error="formErrors.name">
          <Input
            v-model="createForm.name"
            placeholder="Ex: Perforateur Burineur SDS-Plus 800W 2.7J"
            required
          />
        </FormField>

        <div class="form-grid-2">
          <FormField label="Catégorie Principale">
            <Select
              v-model="createForm.category_id"
              :options="categoryFormOptions"
              placeholder="Sélectionner une catégorie"
            />
          </FormField>

          <FormField label="Unité de Mesure">
            <Select
              v-model="createForm.unit"
              :options="unitOptions"
            />
          </FormField>
        </div>

        <div class="form-grid-3">
          <FormField v-if="authStore.isAdmin" label="Prix d'Achat HT" :error="formErrors.purchase_price">
            <Input
              v-model.number="createForm.purchase_price"
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
            />
          </FormField>

          <FormField label="Prix de Vente HT" required :error="formErrors.sale_price">
            <Input
              v-model.number="createForm.sale_price"
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
              required
            />
          </FormField>

          <FormField label="Taux TVA (%)">
            <Input
              v-model.number="createForm.tva"
              type="number"
              min="0"
              step="0.5"
              placeholder="19.00"
            />
          </FormField>
        </div>

        <div class="form-grid-3">
          <FormField label="Stock Initial à l'Ouverture">
            <Input
              v-model.number="createForm.initial_stock"
              type="number"
              min="0"
              step="1"
              placeholder="0"
            />
          </FormField>

          <FormField label="Seuil d'Alerte Stock Bas">
            <Input
              v-model.number="createForm.min_stock_alert"
              type="number"
              min="0"
              step="1"
              placeholder="5"
            />
          </FormField>

          <FormField label="Colisage (Pcs / Carton)">
            <Input
              v-model.number="createForm.box_size"
              type="number"
              min="0"
              step="1"
              placeholder="1"
            />
          </FormField>
        </div>

        <FormField label="Description Technique & Domaine d'Usage">
          <Textarea
            v-model="createForm.description"
            placeholder="Précisez les caractéristiques, accessoires inclus et applications recommandées..."
            :rows="3"
          />
        </FormField>

        <div class="checkbox-field">
          <label class="custom-checkbox-label">
            <input type="checkbox" v-model="createForm.published" />
            <span>Rendre immédiatement visible dans la boutique en ligne</span>
          </label>
        </div>
      </form>

      <template #footer>
        <Button variant="secondary" @click="showCreateModal = false">Annuler</Button>
        <Button
          variant="primary"
          :loading="submitting"
          form="createProductForm"
          type="submit"
        >
          Enregistrer le Produit
        </Button>
      </template>
    </Modal>

    <!-- Modal: Edit Product -->
    <Modal
      :open="showEditModal"
      title="Modifier la Fiche Produit"
      max-width="lg"
      @close="showEditModal = false"
    >
      <form v-if="editingProduct" id="editProductForm" class="product-form" @submit.prevent="handleUpdateProduct">
        <div class="form-grid-2">
          <FormField label="Référence Unique (Code SKU)" required>
            <Input
              v-model="editForm.reference"
              required
            />
          </FormField>

          <FormField label="Marque Fabricant">
            <Input
              v-model="editForm.brand"
            />
          </FormField>
        </div>

        <FormField label="Désignation Complète" required>
          <Input
            v-model="editForm.name"
            required
          />
        </FormField>

        <div class="form-grid-2">
          <FormField label="Catégorie Principale">
            <Select
              v-model="editForm.category_id"
              :options="categoryFormOptions"
            />
          </FormField>

          <FormField label="Unité de Mesure">
            <Select
              v-model="editForm.unit"
              :options="unitOptions"
            />
          </FormField>
        </div>

        <div class="form-grid-3">
          <FormField v-if="authStore.isAdmin" label="Prix d'Achat HT">
            <Input
              v-model.number="editForm.purchase_price"
              type="number"
              min="0"
              step="0.01"
            />
          </FormField>

          <FormField label="Prix de Vente HT" required>
            <Input
              v-model.number="editForm.sale_price"
              type="number"
              min="0"
              step="0.01"
              required
            />
          </FormField>

          <FormField label="Taux TVA (%)">
            <Input
              v-model.number="editForm.tva"
              type="number"
              min="0"
              step="0.5"
            />
          </FormField>
        </div>

        <div class="form-grid-2">
          <FormField label="Seuil d'Alerte Stock Bas">
            <Input
              v-model.number="editForm.min_stock_alert"
              type="number"
              min="0"
              step="1"
            />
          </FormField>

          <FormField label="Colisage (Pcs / Carton)">
            <Input
              v-model.number="editForm.box_size"
              type="number"
              min="0"
              step="1"
            />
          </FormField>
        </div>

        <FormField label="Description Technique">
          <Textarea
            v-model="editForm.description"
            :rows="3"
          />
        </FormField>

        <div class="checkbox-field">
          <label class="custom-checkbox-label">
            <input type="checkbox" v-model="editForm.published" />
            <span>Visible dans la boutique en ligne</span>
          </label>
        </div>
      </form>

      <template #footer>
        <Button variant="secondary" @click="showEditModal = false">Annuler</Button>
        <Button
          variant="primary"
          :loading="submitting"
          form="editProductForm"
          type="submit"
        >
          Enregistrer les Modifications
        </Button>
      </template>
    </Modal>

    <!-- Modal: Image Gallery Management -->
    <Modal
      :open="showGalleryModal"
      :title="`Galerie Photos : ${galleryProduct?.name || ''}`"
      max-width="lg"
      @close="showGalleryModal = false"
    >
      <div v-if="galleryProduct" class="gallery-management-body">
        <!-- Image Upload Zone -->
        <div class="upload-dropzone">
          <input
            type="file"
            id="productImageUploadInput"
            accept="image/png, image/jpeg, image/webp, image/avif"
            class="hidden-file-input"
            @change="handleFileUpload"
          />
          <label for="productImageUploadInput" class="upload-label">
            <Icon name="upload-cloud" :size="32" class="upload-icon" />
            <span class="upload-title">Cliquez pour ajouter une photo</span>
            <span class="upload-hint text-muted">Format WebP, PNG, JPEG. Traitement automatique des vignettes.</span>
          </label>
        </div>

        <!-- Images Grid -->
        <div v-if="galleryImages.length > 0" class="images-grid">
          <div
            v-for="img in galleryImages"
            :key="img.id"
            class="image-card"
            :class="{ 'is-primary': img.is_primary }"
          >
            <img :src="img.thumb_url || img.url" :alt="img.alt || 'Photo produit'" class="gallery-img" />
            <div class="image-actions">
              <Button
                v-if="!img.is_primary"
                variant="secondary"
                size="dense"
                icon="star"
                title="Définir comme photo principale"
                @click="setPrimaryImage(img.id)"
              >
                Principale
              </Button>
              <Badge v-else variant="success" size="dense">
                Photo Principale
              </Badge>
              <Button
                v-if="authStore.isAdmin"
                variant="danger"
                size="dense"
                icon="trash-2"
                icon-only
                title="Supprimer la photo"
                aria-label="Supprimer la photo"
                @click="deleteImage(img.id)"
              />
            </div>
          </div>
        </div>

        <EmptyState
          v-else
          icon="image"
          title="Aucune image pour ce produit"
          message="Téléversez des photos nettes de l'outillage pour alimenter la vitrine et les fiches techniques."
        />
      </div>

      <template #footer>
        <Button variant="secondary" @click="showGalleryModal = false">Fermer</Button>
      </template>
    </Modal>

    <!-- Confirm Dialog for Archive -->
    <ConfirmDialog
      :open="showArchiveDialog"
      title="Archiver le produit"
      :message="`Êtes-vous certain de vouloir archiver le produit '${productToArchive?.name}' (Réf: ${productToArchive?.reference}) ? Il ne sera plus disponible à la commande.`"
      confirm-label="Archiver"
      :is-destructive="true"
      @confirm="handleArchiveProduct"
      @cancel="showArchiveDialog = false"
    />

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
  Modal,
  FormField,
  Input,
  Select,
  Textarea,
  Money,
  StatusPill,
  Badge,
  ConfirmDialog,
  Toast,
  Icon,
  EmptyState,
} from '../../components/ui';
import type { TableColumn } from '../../components/ui/DataTable.vue';
import type { FilterChip } from '../../components/ui/FilterBar.vue';

const authStore = useAuthStore();

// State
const loading = ref(false);
const submitting = ref(false);
const products = ref<any[]>([]);
const categories = ref<any[]>([]);
const searchQuery = ref('');
const selectedCategory = ref('');
const selectedChip = ref('ALL');

const meta = reactive({
  page: 1,
  pageSize: 25,
  total: 0,
  totalPages: 1,
});

// Modals State
const showCreateModal = ref(false);
const showEditModal = ref(false);
const showGalleryModal = ref(false);
const showArchiveDialog = ref(false);

const editingProduct = ref<any>(null);
const galleryProduct = ref<any>(null);
const galleryImages = ref<any[]>([]);
const productToArchive = ref<any>(null);

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

// Forms
const createForm = reactive({
  reference: '',
  name: '',
  brand: '',
  category_id: null as number | null,
  unit: 'PIECE',
  box_size: 1,
  purchase_price: 0,
  sale_price: 0,
  tva: 19,
  initial_stock: 0,
  min_stock_alert: 5,
  description: '',
  published: true,
});

const editForm = reactive({
  id: 0,
  reference: '',
  name: '',
  brand: '',
  category_id: null as number | null,
  unit: 'PIECE',
  box_size: 1,
  purchase_price: 0,
  sale_price: 0,
  tva: 19,
  min_stock_alert: 5,
  description: '',
  published: true,
});

const formErrors = reactive<Record<string, string>>({});

// Options
const filterChips = computed<FilterChip[]>(() => [
  { id: 'ALL', label: 'Tous les produits', count: meta.total, active: selectedChip.value === 'ALL' },
  { id: 'PUBLISHED', label: 'Publiés en boutique', active: selectedChip.value === 'PUBLISHED' },
  { id: 'DRAFT', label: 'Brouillons', active: selectedChip.value === 'DRAFT' },
]);

const categoryOptions = computed(() => [
  { value: '', label: 'Toutes les catégories' },
  ...categories.value.map((c) => ({ value: String(c.id), label: c.name })),
]);

const categoryFormOptions = computed(() => [
  { value: '', label: 'Aucune catégorie' },
  ...categories.value.map((c) => ({ value: c.id, label: c.name })),
]);

const unitOptions = [
  { value: 'PIECE', label: 'Pièce (U)' },
  { value: 'JEU', label: 'Jeu / Coffret' },
  { value: 'METRE', label: 'Mètre (m)' },
  { value: 'ROULEAU', label: 'Rouleau' },
  { value: 'PAQUET', label: 'Paquet' },
  { value: 'CARTON', label: 'Carton' },
];

const tableColumns = computed<TableColumn[]>(() => {
  const cols: TableColumn[] = [
    { key: 'image', label: '', width: '56px' },
    { key: 'product', label: 'Réf & Désignation' },
    { key: 'category', label: 'Catégorie' },
    { key: 'stock', label: 'Stock Disponible' },
    { key: 'sale_price', label: 'Prix Vente HT', role: 'numeric' },
  ];

  if (authStore.isAdmin) {
    cols.push({ key: 'purchase_price', label: 'Prix Achat HT', role: 'numeric' });
  }

  cols.push(
    { key: 'published', label: 'Visibilité', role: 'status' },
    { key: 'actions', label: 'Actions', role: 'actions' }
  );

  return cols;
});

// Stock status helpers
function getStockStatusTone(row: any): string {
  const physical = Number(row.physical_quantity || 0);
  const reserved = Number(row.reserved_quantity || 0);
  const available = physical - reserved;

  if (physical <= 0) return 'DANGER';
  if (available <= Number(row.min_stock_alert || 1)) return 'WARNING';
  return 'SUCCESS';
}

function getStockStatusLabel(row: any): string {
  const physical = Number(row.physical_quantity || 0);
  const reserved = Number(row.reserved_quantity || 0);
  const available = physical - reserved;

  if (physical <= 0) return 'Épuisé';
  if (available <= Number(row.min_stock_alert || 1)) return 'Stock bas';
  return 'En stock';
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

async function fetchProducts(page = 1) {
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

    if (selectedChip.value === 'PUBLISHED') {
      params.published = true;
    } else if (selectedChip.value === 'DRAFT') {
      params.published = false;
    }

    const res = await api.get('/admin/products', { params });
    if (res.data.success) {
      products.value = res.data.data;
      if (res.data.meta) {
        meta.page = res.data.meta.page;
        meta.pageSize = res.data.meta.pageSize;
        meta.total = res.data.meta.total;
        meta.totalPages = res.data.meta.totalPages;
      }
    }
  } catch (err: any) {
    showToast(err.response?.data?.error?.message || 'Erreur lors du chargement des produits', 'danger');
  } finally {
    loading.value = false;
  }
}

function handleSelectChip(val: string) {
  selectedChip.value = val;
  fetchProducts(1);
}

function handleResetFilters() {
  searchQuery.value = '';
  selectedCategory.value = '';
  selectedChip.value = 'ALL';
  fetchProducts(1);
}

function handleImageError(e: Event) {
  const target = e.target as HTMLElement;
  target.style.display = 'none';
}

// Create Product
function openCreateModal() {
  createForm.reference = '';
  createForm.name = '';
  createForm.brand = '';
  createForm.category_id = null;
  createForm.unit = 'PIECE';
  createForm.box_size = 1;
  createForm.purchase_price = 0;
  createForm.sale_price = 0;
  createForm.tva = 19;
  createForm.initial_stock = 0;
  createForm.min_stock_alert = 5;
  createForm.description = '';
  createForm.published = true;
  Object.keys(formErrors).forEach((k) => delete formErrors[k]);
  showCreateModal.value = true;
}

async function handleCreateProduct() {
  Object.keys(formErrors).forEach((k) => delete formErrors[k]);
  submitting.value = true;

  try {
    const payload = {
      ...createForm,
      category_id: createForm.category_id || null,
      sale_price: Number(createForm.sale_price),
      purchase_price: Number(createForm.purchase_price),
      initial_stock: Number(createForm.initial_stock),
      min_stock_alert: Number(createForm.min_stock_alert),
      box_size: Number(createForm.box_size),
      tva: Number(createForm.tva),
    };

    const res = await api.post('/admin/products', payload);
    if (res.data.success) {
      showToast(`Produit ${res.data.data.reference} créé avec succès !`);
      showCreateModal.value = false;
      await fetchProducts(1);
    }
  } catch (err: any) {
    const errorData = err.response?.data?.error;
    if (errorData?.details) {
      errorData.details.forEach((issue: any) => {
        formErrors[issue.path[0]] = issue.message;
      });
    }
    showToast(errorData?.message || 'Erreur lors de la création du produit', 'danger');
  } finally {
    submitting.value = false;
  }
}

// Edit Product
async function openEditModal(prod: any) {
  try {
    const res = await api.get(`/admin/products/${prod.id}`);
    const data = res.data.data;
    editingProduct.value = data;

    editForm.id = data.id;
    editForm.reference = data.reference;
    editForm.name = data.name;
    editForm.brand = data.brand || '';
    editForm.category_id = data.category_id || null;
    editForm.unit = data.unit || 'PIECE';
    editForm.box_size = data.box_size || 1;
    editForm.purchase_price = Number(data.purchase_price || 0);
    editForm.sale_price = Number(data.sale_price || 0);
    editForm.tva = Number(data.tva || 19);
    editForm.min_stock_alert = Number(data.min_stock_alert || 5);
    editForm.description = data.description || '';
    editForm.published = Boolean(data.published);

    showEditModal.value = true;
  } catch (err: any) {
    showToast('Impossible de charger les détails du produit', 'danger');
  }
}

async function handleUpdateProduct() {
  submitting.value = true;
  try {
    const payload = {
      reference: editForm.reference,
      name: editForm.name,
      brand: editForm.brand || null,
      category_id: editForm.category_id || null,
      unit: editForm.unit,
      box_size: Number(editForm.box_size),
      sale_price: Number(editForm.sale_price),
      purchase_price: authStore.isAdmin ? Number(editForm.purchase_price) : undefined,
      tva: Number(editForm.tva),
      min_stock_alert: Number(editForm.min_stock_alert),
      description: editForm.description || null,
      published: editForm.published,
    };

    const res = await api.put(`/admin/products/${editForm.id}`, payload);
    if (res.data.success) {
      showToast('Fiche produit mise à jour avec succès');
      showEditModal.value = false;
      await fetchProducts(meta.page);
    }
  } catch (err: any) {
    showToast(err.response?.data?.error?.message || 'Erreur lors de la mise à jour', 'danger');
  } finally {
    submitting.value = false;
  }
}

// Toggle Visibility
async function togglePublish(prod: any) {
  try {
    const res = await api.patch(`/admin/products/${prod.id}/publish`);
    if (res.data.success) {
      prod.published = res.data.data.published;
      showToast(prod.published ? 'Produit publié en boutique' : 'Produit retiré de la boutique', 'info');
    }
  } catch (err: any) {
    showToast('Erreur lors du changement de visibilité', 'danger');
  }
}

// Gallery & Images
async function openGalleryModal(prod: any) {
  galleryProduct.value = prod;
  await loadGalleryImages(prod.id);
  showGalleryModal.value = true;
}

async function loadGalleryImages(productId: number) {
  try {
    const res = await api.get(`/admin/products/${productId}`);
    galleryImages.value = res.data.data.images || [];
  } catch (err) {
    galleryImages.value = [];
  }
}

async function handleFileUpload(e: Event) {
  const target = e.target as HTMLInputElement;
  if (!target.files || target.files.length === 0 || !galleryProduct.value) return;

  const file = target.files[0];
  const formData = new FormData();
  formData.append('image', file);
  formData.append('alt', galleryProduct.value.name);

  try {
    const res = await api.post(`/admin/products/${galleryProduct.value.id}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    if (res.data.success) {
      showToast('Image ajoutée et optimisée');
      await loadGalleryImages(galleryProduct.value.id);
      await fetchProducts(meta.page);
    }
  } catch (err: any) {
    showToast(err.response?.data?.error?.message || 'Erreur lors du téléversement', 'danger');
  } finally {
    target.value = '';
  }
}

async function setPrimaryImage(imageId: number) {
  try {
    await api.post(`/admin/products/images/${imageId}/set-primary`);
    showToast('Photo principale définie');
    await loadGalleryImages(galleryProduct.value.id);
    await fetchProducts(meta.page);
  } catch (err: any) {
    showToast('Impossible de définir la photo principale', 'danger');
  }
}

async function deleteImage(imageId: number) {
  try {
    await api.delete(`/admin/products/images/${imageId}`);
    showToast('Photo supprimée');
    await loadGalleryImages(galleryProduct.value.id);
    await fetchProducts(meta.page);
  } catch (err: any) {
    showToast('Erreur lors de la suppression de la photo', 'danger');
  }
}

// Archive
function confirmArchiveProduct(prod: any) {
  productToArchive.value = prod;
  showArchiveDialog.value = true;
}

async function handleArchiveProduct() {
  if (!productToArchive.value) return;
  try {
    await api.delete(`/admin/products/${productToArchive.value.id}`);
    showToast(`Produit ${productToArchive.value.reference} archivé`);
    showArchiveDialog.value = false;
    await fetchProducts(meta.page);
  } catch (err: any) {
    showToast('Erreur lors de l’archivage', 'danger');
  }
}

onMounted(async () => {
  await Promise.all([fetchCategories(), fetchProducts(1)]);
});
</script>

<style scoped>
.products-catalog-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-24, 24px);
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

.stock-status-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stock-qty-sub {
  font-size: 11px;
}

.reserved-sub {
  color: var(--color-warning-text, #b45309);
}

.publish-toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: var(--radius-pill, 999px);
  font-size: 12px;
  font-weight: 500;
  border: 1px solid var(--color-line, #e2e8f0);
  background: var(--color-subtle, #f8fafc);
  color: var(--color-ink-muted, #64748b);
  cursor: pointer;
  transition: all 0.15s ease;
}

.publish-toggle-btn.is-published {
  background: var(--color-success-tint, #f0fdf4);
  color: var(--color-success-text, #15803d);
  border-color: var(--color-success-border, #bbf7d0);
}

.publish-toggle-btn:hover {
  filter: brightness(0.96);
}

.actions-group {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
}

.product-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-16, 16px);
}

.form-grid-2 {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-16, 16px);
}

.form-grid-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-16, 16px);
}

@media (max-width: 640px) {
  .form-grid-2,
  .form-grid-3 {
    grid-template-columns: 1fr;
  }
}

.custom-checkbox-label {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: var(--color-ink, #0f172a);
  cursor: pointer;
}

.gallery-management-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-24, 24px);
}

.upload-dropzone {
  border: 2px dashed var(--color-line, #cbd5e1);
  border-radius: var(--radius-12, 12px);
  padding: var(--space-24, 24px);
  text-align: center;
  background: var(--color-subtle, #f8fafc);
  transition: border-color 0.15s ease;
}

.upload-dropzone:hover {
  border-color: var(--color-brand, #12161a);
}

.hidden-file-input {
  display: none;
}

.upload-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.upload-icon {
  color: var(--color-brand, #12161a);
}

.upload-title {
  font-weight: 600;
  font-size: 14px;
}

.upload-hint {
  font-size: 12px;
}

.images-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: var(--space-16, 16px);
}

.image-card {
  position: relative;
  border-radius: var(--radius-12, 12px);
  border: 1px solid var(--color-line, #e2e8f0);
  background: white;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.image-card.is-primary {
  border-color: var(--color-success-border, #16a34a);
  box-shadow: 0 0 0 2px var(--color-success-border, #bbf7d0);
}

.gallery-img {
  width: 100%;
  height: 140px;
  object-fit: cover;
}

.image-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px;
  background: var(--color-subtle, #f8fafc);
  border-top: 1px solid var(--color-line, #e2e8f0);
}
</style>
