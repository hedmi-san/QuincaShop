<template>
  <div class="pos-counter-page">
    <PageHeader
      title="Vente au comptoir"
      subtitle="Encaissement direct en magasin pour clients passagers et comptes professionnels agréés."
      :breadcrumbs="[
        { label: 'Administration', to: '/admin/orders' },
        { label: 'Vente au comptoir' }
      ]"
    >
      <template #actions>
        <div class="pos-header-actions">
          <Badge variant="neutral" size="dense">
            Caisse magasin ouverte
          </Badge>
          <Button
            v-if="cartItems.length > 0"
            variant="ghost"
            size="dense"
            icon="trash-2"
            @click="showClearCartDialog = true"
          >
            Vider le panier
          </Button>
        </div>
      </template>
    </PageHeader>

    <div class="pos-layout">
      <!-- LEFT PANE: Catalog & Quick Search -->
      <section class="catalog-pane" aria-label="Sélection des articles">
        <div class="catalog-filter-bar">
          <!-- Search input primitive -->
          <div class="search-wrapper">
            <Input
              ref="searchInputRef"
              v-model="productSearch"
              prefix-icon="search"
              placeholder="Rechercher par référence, désignation, marque..."
              :clearable="true"
              size="default"
              @keydown.esc="productSearch = ''"
            />
          </div>

          <!-- Category Chips -->
          <div class="category-chips-scroll" role="tablist" aria-label="Catégories d'outillage">
            <Button
              variant="secondary"
              size="dense"
              :class="{ 'is-chip-active': selectedCategory === '' }"
              @click="selectedCategory = ''"
            >
              Tous
            </Button>
            <Button
              v-for="cat in categories"
              :key="cat.id"
              variant="secondary"
              size="dense"
              :class="{ 'is-chip-active': selectedCategory === String(cat.id) }"
              @click="selectedCategory = String(cat.id)"
            >
              {{ cat.name }}
            </Button>
          </div>
        </div>

        <!-- Catalog Loading Skeleton -->
        <div v-if="loadingCatalog" class="products-grid">
          <Card v-for="i in 6" :key="i" class="product-skeleton-card">
            <Skeleton height="120px" width="100%" />
            <div class="skeleton-content">
              <Skeleton height="14px" width="50%" />
              <Skeleton height="18px" width="90%" />
              <Skeleton height="16px" width="40%" />
            </div>
          </Card>
        </div>

        <!-- Catalog Empty State -->
        <div v-else-if="filteredProducts.length === 0" class="catalog-empty">
          <EmptyState
            icon="search"
            title="Aucun article correspondant"
            message="Modifiez votre recherche ou sélectionnez une autre catégorie d'outillage."
            action-label="Réinitialiser la recherche"
            @action="resetCatalogSearch"
          />
        </div>

        <!-- Catalog Product Grid -->
        <div v-else class="products-grid">
          <div
            v-for="prod in filteredProducts"
            :key="prod.id"
            class="pos-product-card"
            :class="{ 'is-disabled': prod.available_quantity <= 0 }"
            role="button"
            :tabindex="prod.available_quantity > 0 ? 0 : -1"
            :aria-disabled="prod.available_quantity <= 0"
            @click="addToCart(prod)"
            @keydown.enter="addToCart(prod)"
          >
            <div class="card-thumb-wrapper">
              <img
                v-if="prod.thumb_url"
                :src="prod.thumb_url"
                :alt="prod.name"
                class="card-thumb"
              />
              <div v-else class="card-thumb-placeholder">
                <Icon name="package" :size="24" />
              </div>

              <!-- Available Stock Pill -->
              <div class="stock-pill-wrapper">
                <StatusPill
                  :status="getStockStatusTone(prod)"
                  :custom-label="getStockStatusLabel(prod)"
                />
              </div>
            </div>

            <div class="card-info">
              <span class="card-ref font-mono">{{ prod.reference }}</span>
              <h3 class="card-name" :title="prod.name">{{ prod.name }}</h3>
              <div class="card-price-row">
                <Money :amount="prod.sale_price" class="card-price" />
                <span class="tax-tag text-muted">HT</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- RIGHT PANE: Cart & Checkout -->
      <aside class="checkout-pane" aria-label="Ticket de caisse">
        <Card class="checkout-card" no-padding>
          <!-- Customer Selection Header -->
          <div class="customer-selection-header">
            <div class="customer-mode-tabs" role="tablist">
              <Button
                :variant="customerMode === 'WALKIN' ? 'primary' : 'secondary'"
                size="dense"
                icon="user"
                class="mode-btn"
                @click="setCustomerMode('WALKIN')"
              >
                Client passager
              </Button>
              <Button
                :variant="customerMode === 'ACCOUNT' ? 'primary' : 'secondary'"
                size="dense"
                icon="briefcase"
                class="mode-btn"
                @click="setCustomerMode('ACCOUNT')"
              >
                Compte B2B agréé
              </Button>
            </div>

            <!-- Walk-in display -->
            <div v-if="customerMode === 'WALKIN'" class="client-badge walkin-badge">
              <Icon name="check-circle-2" :size="16" class="tone-success" />
              <div class="client-badge-text">
                <span class="client-badge-title">{{ defaultClient?.name || 'Client comptoir' }}</span>
                <span class="text-muted">Règlement comptant au comptoir</span>
              </div>
            </div>

            <!-- B2B Account dropdown -->
            <div v-else class="client-b2b-box">
              <FormField label="Client professionnel agréé" required>
                <Select
                  v-model="selectedClientId"
                  :options="b2bClientOptions"
                  placeholder="Rechercher par raison sociale ou code..."
                />
              </FormField>

              <!-- Client balance summary -->
              <div v-if="activeClient" class="client-credit-meta">
                <div class="credit-metric">
                  <span class="text-muted">Encours de dette :</span>
                  <Money :amount="activeClient.current_balance || 0" />
                </div>
                <div class="credit-metric">
                  <span class="text-muted">Plafond autorisé :</span>
                  <Money :amount="activeClient.credit_limit || 0" />
                </div>
                <div class="credit-metric credit-highlight">
                  <span class="font-medium">Crédit disponible :</span>
                  <Money
                    :amount="remainingCredit"
                    :highlight-negative="remainingCredit < 0"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Cart Items Scroll Area -->
          <div class="cart-items-container">
            <div v-if="cartItems.length === 0" class="empty-cart-view">
              <EmptyState
                icon="shopping-cart"
                title="Ticket de caisse vide"
                message="Cliquez sur des articles du catalogue pour les ajouter à la vente."
              />
            </div>

            <div v-else class="cart-items-list">
              <div
                v-for="item in cartItems"
                :key="item.productId"
                class="cart-line-item"
              >
                <div class="item-primary-info">
                  <span class="item-ref font-mono">{{ item.reference }}</span>
                  <span class="item-name font-medium">{{ item.name }}</span>
                  <div class="item-unit-price text-muted">
                    <Money :amount="item.unitPrice" /> HT / {{ item.unit || 'U' }}
                  </div>
                </div>

                <div class="item-controls-col">
                  <!-- Stepper with Button primitives -->
                  <div class="stepper-group" role="group" aria-label="Quantité">
                    <Button
                      variant="secondary"
                      size="dense"
                      icon="minus"
                      icon-only
                      aria-label="Diminuer la quantité"
                      class="stepper-btn"
                      @click="decreaseQty(item)"
                    />
                    <span class="stepper-value font-mono">{{ item.quantity }}</span>
                    <Button
                      variant="secondary"
                      size="dense"
                      icon="plus"
                      icon-only
                      aria-label="Augmenter la quantité"
                      class="stepper-btn"
                      :disabled="item.quantity >= item.maxAvailable"
                      @click="increaseQty(item)"
                    />
                  </div>

                  <!-- Line Total -->
                  <div class="item-line-total">
                    <Money :amount="item.unitPrice * item.quantity" />
                  </div>

                  <!-- Remove Line -->
                  <Button
                    variant="ghost"
                    size="dense"
                    icon="trash-2"
                    icon-only
                    aria-label="Supprimer la ligne"
                    class="remove-line-btn"
                    @click="removeFromCart(item.productId)"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Payment & Totals Section -->
          <div class="checkout-footer">
            <!-- Totals Breakdown -->
            <div class="totals-breakdown">
              <div class="total-row subtotal-row">
                <span class="text-muted">Total hors taxes (HT)</span>
                <Money :amount="totals.subtotalHt" />
              </div>
              <div class="total-row tva-row">
                <span class="text-muted">TVA (19%)</span>
                <Money :amount="totals.totalTva" />
              </div>
              <div v-if="totals.timbre > 0" class="total-row timbre-row">
                <span class="text-muted">Droit de timbre fiscal (1% espèces)</span>
                <Money :amount="totals.timbre" />
              </div>
              <div class="total-row net-total-row">
                <span class="net-total-label font-bold">Net à payer (TTC)</span>
                <Money :amount="totals.grandTotal" class="net-total-amount font-bold" />
              </div>
            </div>

            <!-- Payment Method Selection via Buttons -->
            <div class="payment-methods-grid">
              <Button
                :variant="paymentMethod === 'CASH' ? 'primary' : 'secondary'"
                size="dense"
                icon="banknote"
                class="pay-btn"
                @click="paymentMethod = 'CASH'"
              >
                Espèces
              </Button>

              <Button
                :variant="paymentMethod === 'CHECK' ? 'primary' : 'secondary'"
                size="dense"
                icon="file-check"
                class="pay-btn"
                @click="paymentMethod = 'CHECK'"
              >
                Chèque
              </Button>

              <Button
                :variant="paymentMethod === 'TRANSFER' ? 'primary' : 'secondary'"
                size="dense"
                icon="arrow-left-right"
                class="pay-btn"
                @click="paymentMethod = 'TRANSFER'"
              >
                Virement
              </Button>

              <Button
                :variant="paymentMethod === 'ON_CREDIT' ? 'primary' : 'secondary'"
                size="dense"
                icon="clock"
                class="pay-btn"
                :disabled="customerMode === 'WALKIN'"
                :title="customerMode === 'WALKIN' ? 'Crédit réservé aux comptes B2B agréés' : ''"
                @click="customerMode !== 'WALKIN' && (paymentMethod = 'ON_CREDIT')"
              >
                À crédit
              </Button>
            </div>

            <!-- Cash tendered & change calculation -->
            <div v-if="paymentMethod === 'CASH'" class="cash-calculator-box">
              <FormField label="Espèces remises par le client">
                <Input
                  v-model.number="amountTendered"
                  type="number"
                  step="50"
                  placeholder="0,00"
                  size="dense"
                />
              </FormField>

              <div v-if="amountTendered > totals.grandTotal" class="change-due-row">
                <span class="change-label">Monnaie à rendre :</span>
                <Money :amount="amountTendered - totals.grandTotal" class="tone-success font-bold" />
              </div>
            </div>

            <!-- Checkbox: Facture Fiscale -->
            <div class="invoice-option-row">
              <label class="custom-checkbox-wrapper">
                <input
                  type="checkbox"
                  v-model="issueFacture"
                  class="ui-checkbox"
                />
                <span>Émettre une facture officielle immédiate</span>
              </label>
            </div>

            <!-- Checkout Action Button -->
            <Button
              variant="primary"
              size="default"
              icon="check-circle"
              :loading="submitting"
              :disabled="cartItems.length === 0 || isCreditExceeded"
              class="validate-sale-btn"
              @click="submitSale"
            >
              Encaisser la vente
            </Button>

            <span v-if="isCreditExceeded" class="credit-error-notice tone-danger">
              Le montant de cette commande dépasse le plafond de crédit autorisé.
            </span>
          </div>
        </Card>
      </aside>
    </div>

    <!-- Confirm Clear Cart Dialog -->
    <ConfirmDialog
      :open="showClearCartDialog"
      title="Vider le panier"
      message="Êtes-vous certain de vouloir vider le panier en cours ? Tous les articles ajoutés seront retirés."
      confirm-label="Vider"
      :is-destructive="true"
      @confirm="handleClearCart"
      @cancel="showClearCartDialog = false"
    />

    <!-- Modal: Sale Success & Printable Receipt -->
    <Modal
      :open="showSuccessModal"
      title="Vente enregistrée avec succès"
      max-width="md"
      @close="resetForNextSale"
    >
      <div v-if="completedSale" class="receipt-preview-container">
        <!-- Printable Area -->
        <div id="printableReceipt" class="printable-receipt">
          <div class="receipt-header">
            <h2 class="receipt-company">SARL Outillage Industriel Algérie</h2>
            <p class="receipt-sub">Comptoir vente directe • Zone Industrielle Oued Smar, Alger</p>
            <p class="receipt-sub">Tél : +213 (0) 23 92 11 22</p>
            <div class="receipt-divider" />
            <div class="receipt-meta-row">
              <span>Ticket / Bon N° : <strong class="font-mono">{{ completedSale.order.order_number }}</strong></span>
              <span>Date : {{ formatCurrentDate() }}</span>
            </div>
            <div class="receipt-meta-row">
              <span>Client : <strong>{{ completedSale.client.name }}</strong></span>
              <span>Mode : {{ getPaymentMethodLabel(completedSale.payment.method) }}</span>
            </div>
            <div v-if="completedSale.facture" class="receipt-facture-tag">
              Facture fiscale N° {{ completedSale.facture.facture_number }}
            </div>
          </div>

          <div class="receipt-divider" />

          <!-- Items Table -->
          <table class="receipt-items-table">
            <thead>
              <tr>
                <th class="cell-start">Article</th>
                <th class="cell-center">Qté</th>
                <th class="cell-end">P.U. HT</th>
                <th class="cell-end">Total TTC</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="it in completedSale.items" :key="it.productId">
                <td class="cell-start">
                  <div>{{ it.name }}</div>
                  <div class="font-mono text-muted receipt-ref">{{ it.reference }}</div>
                </td>
                <td class="cell-center font-mono">{{ it.quantity }}</td>
                <td class="cell-end">
                  <Money :amount="it.unitPrice" />
                </td>
                <td class="cell-end font-bold">
                  <Money :amount="it.lineTotalTtc" />
                </td>
              </tr>
            </tbody>
          </table>

          <div class="receipt-divider" />

          <div class="receipt-totals-block">
            <div class="r-total-row">
              <span class="text-muted">Total HT :</span>
              <Money :amount="completedSale.order.subtotal_ht" />
            </div>
            <div class="r-total-row">
              <span class="text-muted">TVA (19%) :</span>
              <Money :amount="completedSale.order.total_tva" />
            </div>
            <div v-if="completedSale.facture && completedSale.facture.timbre > 0" class="r-total-row">
              <span class="text-muted">Droit de timbre :</span>
              <Money :amount="completedSale.facture.timbre" />
            </div>
            <div class="r-total-row r-net">
              <span class="font-bold">Total net TTC :</span>
              <Money :amount="completedSale.order.total_ttc" class="font-bold" />
            </div>
            <div v-if="completedSale.payment.changeAmount > 0" class="r-total-row text-muted">
              <span>Monnaie rendue :</span>
              <Money :amount="completedSale.payment.changeAmount" />
            </div>
          </div>

          <div class="receipt-footer">
            <p>Merci pour votre visite</p>
            <p class="receipt-guarantee">Matériel professionnel garanti conforme aux normes industrielles</p>
          </div>
        </div>
      </div>

      <template #footer>
        <Button variant="secondary" icon="printer" @click="printReceipt">
          Imprimer le ticket
        </Button>
        <Button variant="primary" icon="plus" @click="resetForNextSale">
          Nouvelle vente
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
import { ref, computed, onMounted } from 'vue';
import api from '../../services/api';
import {
  PageHeader,
  Button,
  Card,
  Modal,
  FormField,
  Input,
  Select,
  Money,
  Badge,
  StatusPill,
  ConfirmDialog,
  Toast,
  Icon,
  EmptyState,
  Skeleton,
} from '../../components/ui';

// Data state
const loadingCatalog = ref(false);
const submitting = ref(false);
const products = ref<any[]>([]);
const categories = ref<any[]>([]);
const defaultClient = ref<any>(null);
const b2bClients = ref<any[]>([]);

// Filter & search
const productSearch = ref('');
const selectedCategory = ref('');
const searchInputRef = ref<any>(null);

// Customer mode
const customerMode = ref<'WALKIN' | 'ACCOUNT'>('WALKIN');
const selectedClientId = ref<number | null>(null);

// Cart
interface CartItem {
  productId: number;
  reference: string;
  name: string;
  unit: string;
  unitPrice: number;
  tva: number;
  quantity: number;
  maxAvailable: number;
}
const cartItems = ref<CartItem[]>([]);

// Payment
const paymentMethod = ref<'CASH' | 'CHECK' | 'TRANSFER' | 'ON_CREDIT'>('CASH');
const amountTendered = ref<number>(0);
const issueFacture = ref(false);

// Modals
const showClearCartDialog = ref(false);
const showSuccessModal = ref(false);
const completedSale = ref<any>(null);

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

// Computed
const b2bClientOptions = computed(() => [
  { value: '', label: '— Sélectionner un client agréé —' },
  ...b2bClients.value.map((c) => ({
    value: c.id,
    label: `[${c.code}] ${c.name} (${c.wilaya || 'N/A'})`,
  })),
]);

const activeClient = computed(() => {
  if (customerMode.value === 'WALKIN') return defaultClient.value;
  return b2bClients.value.find((c) => c.id === selectedClientId.value) || null;
});

const remainingCredit = computed(() => {
  if (!activeClient.value) return 0;
  const limit = Number(activeClient.value.credit_limit || 0);
  const bal = Number(activeClient.value.current_balance || 0);
  return limit - bal;
});

const isCreditExceeded = computed(() => {
  if (paymentMethod.value !== 'ON_CREDIT') return false;
  return totals.value.grandTotal > remainingCredit.value;
});

const filteredProducts = computed(() => {
  return products.value.filter((p) => {
    if (selectedCategory.value && String(p.category_id) !== selectedCategory.value) {
      return false;
    }
    if (productSearch.value.trim()) {
      const q = productSearch.value.trim().toLowerCase();
      const matchName = (p.name || '').toLowerCase().includes(q);
      const matchRef = (p.reference || '').toLowerCase().includes(q);
      const matchBrand = (p.brand || '').toLowerCase().includes(q);
      return matchName || matchRef || matchBrand;
    }
    return true;
  });
});

const totals = computed(() => {
  let subtotalHt = 0;
  let totalTva = 0;

  for (const item of cartItems.value) {
    const lineHt = item.unitPrice * item.quantity;
    const lineTva = (lineHt * (item.tva || 19)) / 100;
    subtotalHt += lineHt;
    totalTva += lineTva;
  }

  subtotalHt = Math.round(subtotalHt * 100) / 100;
  totalTva = Math.round(totalTva * 100) / 100;

  let timbre = 0;
  if (paymentMethod.value === 'CASH' && issueFacture.value) {
    const raw = (subtotalHt + totalTva) * 0.01;
    timbre = Math.min(Math.max(Math.round(raw), 5), 10000);
  }

  const grandTotal = Math.round((subtotalHt + totalTva + timbre) * 100) / 100;

  return {
    subtotalHt,
    totalTva,
    timbre,
    grandTotal,
  };
});

function getStockStatusTone(prod: any): string {
  if (prod.available_quantity <= 0) return 'DANGER';
  if (prod.available_quantity <= (prod.min_stock_alert || 1)) return 'WARNING';
  return 'SUCCESS';
}

function getStockStatusLabel(prod: any): string {
  if (prod.available_quantity <= 0) return 'Épuisé';
  return `${prod.available_quantity} ${prod.unit || 'U'}`;
}

// Cart Actions
function addToCart(prod: any) {
  if (prod.available_quantity <= 0) {
    showToast(`L'article ${prod.name} est en rupture de stock`, 'warning');
    return;
  }

  const existing = cartItems.value.find((i) => i.productId === prod.id);
  if (existing) {
    if (existing.quantity < existing.maxAvailable) {
      existing.quantity += 1;
    } else {
      showToast(`Stock maximum disponible atteint (${existing.maxAvailable})`, 'warning');
    }
  } else {
    cartItems.value.push({
      productId: prod.id,
      reference: prod.reference,
      name: prod.name,
      unit: prod.unit || 'PIECE',
      unitPrice: Number(prod.sale_price || 0),
      tva: Number(prod.tva || 19),
      quantity: 1,
      maxAvailable: Number(prod.available_quantity),
    });
  }
}

function increaseQty(item: CartItem) {
  if (item.quantity < item.maxAvailable) {
    item.quantity += 1;
  }
}

function decreaseQty(item: CartItem) {
  if (item.quantity > 1) {
    item.quantity -= 1;
  } else {
    removeFromCart(item.productId);
  }
}

function removeFromCart(productId: number) {
  cartItems.value = cartItems.value.filter((i) => i.productId !== productId);
}

function handleClearCart() {
  cartItems.value = [];
  showClearCartDialog.value = false;
  showToast('Panier vidé', 'info');
}

function resetCatalogSearch() {
  productSearch.value = '';
  selectedCategory.value = '';
}

// Customer Mode
function setCustomerMode(mode: 'WALKIN' | 'ACCOUNT') {
  customerMode.value = mode;
  if (mode === 'WALKIN') {
    selectedClientId.value = defaultClient.value?.id || null;
    if (paymentMethod.value === 'ON_CREDIT') {
      paymentMethod.value = 'CASH';
    }
  } else {
    selectedClientId.value = null;
  }
}

// Submit Sale
async function submitSale() {
  if (cartItems.value.length === 0) return;

  if (customerMode.value === 'ACCOUNT' && !selectedClientId.value) {
    showToast('Veuillez sélectionner un compte client agréé', 'warning');
    return;
  }

  submitting.value = true;
  try {
    const payload = {
      clientId: customerMode.value === 'ACCOUNT' ? selectedClientId.value : undefined,
      paymentMethod: paymentMethod.value,
      amountTendered: paymentMethod.value === 'CASH' && amountTendered.value > 0 ? amountTendered.value : undefined,
      issueFacture: issueFacture.value,
      items: cartItems.value.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
    };

    const res = await api.post('/admin/pos/sale', payload);
    if (res.data.success) {
      completedSale.value = res.data.data;
      showSuccessModal.value = true;
      showToast(`Vente ${res.data.data.order.order_number} enregistrée`);
      await reloadCatalog();
    }
  } catch (err: any) {
    const msg = err.response?.data?.error?.message || 'Erreur lors de la validation de la vente';
    showToast(msg, 'danger');
  } finally {
    submitting.value = false;
  }
}

function resetForNextSale() {
  cartItems.value = [];
  customerMode.value = 'WALKIN';
  selectedClientId.value = defaultClient.value?.id || null;
  paymentMethod.value = 'CASH';
  amountTendered.value = 0;
  issueFacture.value = false;
  completedSale.value = null;
  showSuccessModal.value = false;
}

function printReceipt() {
  window.print();
}

function formatCurrentDate(): string {
  return new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getPaymentMethodLabel(method: string): string {
  switch (method) {
    case 'CASH': return 'Espèces';
    case 'CHECK': return 'Chèque';
    case 'TRANSFER': return 'Virement bancaire';
    case 'ON_CREDIT': return 'À crédit (Compte)';
    default: return method;
  }
}

// Data loaders
async function loadInitData() {
  try {
    const res = await api.get('/admin/pos/init');
    if (res.data.success) {
      defaultClient.value = res.data.data.defaultClient;
      b2bClients.value = res.data.data.clients || [];
      categories.value = res.data.data.categories || [];
    }
  } catch (err) {
    console.warn('Failed to load POS init data', err);
  }
}

async function reloadCatalog() {
  loadingCatalog.value = true;
  try {
    const res = await api.get('/admin/stock', { params: { pageSize: 100 } });
    if (res.data.success) {
      products.value = res.data.data;
    }
  } catch (err) {
    console.warn('Failed to load catalog products', err);
  } finally {
    loadingCatalog.value = false;
  }
}

onMounted(async () => {
  await Promise.all([loadInitData(), reloadCatalog()]);
});
</script>

<style scoped>
.pos-counter-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-4, 16px);
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.pos-header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-3, 12px);
}

.pos-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 380px;
  gap: var(--space-4, 16px);
  align-items: start;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.pos-layout > * {
  min-width: 0;
  max-width: 100%;
}

@media (max-width: 1024px) {
  .pos-layout {
    display: flex;
    flex-direction: column;
    gap: var(--space-4, 16px);
  }
}

/* LEFT PANE: Catalog */
.catalog-pane {
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-card);
  padding: var(--space-4, 16px);
  display: flex;
  flex-direction: column;
  gap: var(--space-4, 16px);
  min-height: 560px;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
}

.catalog-filter-bar {
  display: flex;
  flex-direction: column;
  gap: var(--space-3, 12px);
  width: 100%;
  min-width: 0;
}

.search-wrapper {
  width: 100%;
  min-width: 0;
}

.category-chips-scroll {
  display: flex;
  gap: var(--space-2, 8px);
  overflow-x: auto;
  max-width: 100%;
  min-width: 0;
  padding-bottom: var(--space-1, 4px);
  -webkit-overflow-scrolling: touch;
}

.category-chips-scroll :deep(.ui-button) {
  border-radius: var(--radius-pill);
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .category-chips-scroll :deep(.ui-button) {
    min-height: 44px;
    padding: 0 var(--space-3, 12px);
  }
}

.category-chips-scroll :deep(.is-chip-active) {
  background: var(--color-brand);
  color: var(--color-text-inverse);
  border-color: var(--color-brand);
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: var(--space-3, 12px);
}

.product-skeleton-card {
  padding: var(--space-3, 12px);
  display: flex;
  flex-direction: column;
  gap: var(--space-2, 8px);
}

.skeleton-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-2, 8px);
  margin-top: var(--space-2, 8px);
}

.catalog-empty {
  min-height: 280px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pos-product-card {
  border: 1px solid var(--color-line);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  padding: var(--space-3, 12px);
  display: flex;
  flex-direction: column;
  gap: var(--space-2, 8px);
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  user-select: none;
}

.pos-product-card:hover:not(.is-disabled) {
  border-color: var(--color-brand);
  box-shadow: 0 4px 12px rgba(18, 22, 26, 0.08);
}

.pos-product-card.is-disabled {
  opacity: 0.55;
  cursor: not-allowed;
  filter: grayscale(0.5);
}

.card-thumb-wrapper {
  position: relative;
  width: 100%;
  height: 120px;
  border-radius: var(--radius-control);
  background: var(--color-subtle);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card-thumb-placeholder {
  color: var(--color-text-muted);
}

.stock-pill-wrapper {
  position: absolute;
  top: var(--space-1, 4px);
  right: var(--space-1, 4px);
}

.card-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.card-ref {
  font-size: var(--font-size-xs, 12px);
  color: var(--color-text-muted);
}

.card-name {
  font-size: var(--font-size-sm, 13px);
  color: var(--color-ink);
  margin: 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 36px;
}

.card-price-row {
  display: flex;
  align-items: baseline;
  gap: var(--space-1, 4px);
  margin-top: var(--space-1, 4px);
}

.card-price {
  font-size: var(--font-size-md, 14px);
  font-weight: 600;
  color: var(--color-brand);
}

.tax-tag {
  font-size: var(--font-size-xs, 12px);
}

/* RIGHT PANE: Checkout */
.checkout-pane {
  display: flex;
  flex-direction: column;
}

.checkout-card {
  display: flex;
  flex-direction: column;
}

.customer-selection-header {
  display: flex;
  flex-direction: column;
  gap: var(--space-3, 12px);
  padding: var(--space-4, 16px);
  border-bottom: 1px solid var(--color-line);
}

.customer-mode-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-2, 8px);
}

.mode-btn {
  width: 100%;
}

.client-badge {
  display: flex;
  align-items: center;
  gap: var(--space-2, 8px);
  padding: var(--space-2, 8px) var(--space-3, 12px);
  border-radius: var(--radius-control);
  background: var(--color-subtle);
  border: 1px solid var(--color-line);
}

.client-badge-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: var(--font-size-xs, 12px);
}

.client-badge-title {
  font-weight: 600;
  color: var(--color-ink);
}

.client-b2b-box {
  display: flex;
  flex-direction: column;
  gap: var(--space-2, 8px);
}

.client-credit-meta {
  display: flex;
  flex-direction: column;
  gap: var(--space-1, 4px);
  padding: var(--space-2, 8px) var(--space-3, 12px);
  border-radius: var(--radius-control);
  background: var(--color-subtle);
  border: 1px solid var(--color-line);
  font-size: var(--font-size-xs, 12px);
}

.credit-metric {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.credit-highlight {
  padding-top: var(--space-1, 4px);
  margin-top: var(--space-1, 4px);
  border-top: 1px dashed var(--color-line);
}

.cart-items-container {
  min-height: 220px;
  max-height: 360px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  padding: var(--space-4, 16px);
}

.empty-cart-view {
  margin: auto;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cart-items-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2, 8px);
}

.cart-line-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2, 8px) var(--space-3, 12px);
  border-radius: var(--radius-control);
  border: 1px solid var(--color-line);
  background: var(--color-subtle);
  gap: var(--space-2, 8px);
}

.item-primary-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
  flex: 1;
}

.item-ref {
  font-size: var(--font-size-xs, 12px);
  color: var(--color-text-muted);
}

.item-name {
  font-size: var(--font-size-sm, 13px);
  color: var(--color-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-unit-price {
  font-size: var(--font-size-xs, 12px);
}

.item-controls-col {
  display: flex;
  align-items: center;
  gap: var(--space-2, 8px);
  flex-shrink: 0;
}

.stepper-group {
  display: flex;
  align-items: center;
  gap: var(--space-1, 4px);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  padding: 2px;
}

.stepper-btn {
  height: 32px;
  width: 32px;
}

@media (max-width: 768px) {
  .stepper-btn {
    min-height: 44px;
    min-width: 44px;
    height: 44px;
    width: 44px;
  }
}

.stepper-value {
  min-width: 28px;
  text-align: center;
  font-size: var(--font-size-sm, 13px);
}

.item-line-total {
  min-width: 76px;
  text-align: right;
  font-size: var(--font-size-sm, 13px);
  font-weight: 600;
}

.checkout-footer {
  display: flex;
  flex-direction: column;
  gap: var(--space-3, 12px);
  padding: var(--space-4, 16px);
  border-top: 1px solid var(--color-line);
  background: var(--color-surface);
}

.totals-breakdown {
  display: flex;
  flex-direction: column;
  gap: var(--space-1, 4px);
  font-size: var(--font-size-sm, 13px);
}

.total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.net-total-row {
  margin-top: var(--space-2, 8px);
  padding-top: var(--space-2, 8px);
  border-top: 1px dashed var(--color-line);
}

.net-total-label {
  font-size: var(--font-size-base, 16px);
  color: var(--color-ink);
}

.net-total-amount {
  font-size: var(--font-size-xl, 20px);
  color: var(--color-brand);
}

.payment-methods-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-2, 8px);
}

.pay-btn {
  width: 100%;
}

@media (max-width: 768px) {
  .mode-btn,
  .pay-btn {
    min-height: 44px;
  }
}

.cash-calculator-box {
  display: flex;
  flex-direction: column;
  gap: var(--space-2, 8px);
  padding: var(--space-3, 12px);
  border-radius: var(--radius-control);
  background: var(--color-subtle);
  border: 1px solid var(--color-line);
}

.change-due-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--font-size-sm, 13px);
  font-weight: 500;
}

.invoice-option-row {
  font-size: var(--font-size-sm, 13px);
}

.custom-checkbox-wrapper {
  display: flex;
  align-items: center;
  gap: var(--space-2, 8px);
  cursor: pointer;
  user-select: none;
}

.ui-checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: var(--color-brand);
}

.validate-sale-btn {
  width: 100%;
  height: var(--height-control-touch, 44px);
  font-size: var(--font-size-base, 16px);
  font-weight: 600;
}

.credit-error-notice {
  font-size: var(--font-size-xs, 12px);
  text-align: center;
}

/* Tone Helpers */
.tone-success {
  color: var(--color-success-text);
}

.tone-danger {
  color: var(--color-danger-text);
}

/* Printable Receipt */
.receipt-preview-container {
  display: flex;
  justify-content: center;
}

.printable-receipt {
  width: 100%;
  max-width: 380px;
  background: var(--color-surface);
  padding: var(--space-4, 16px);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-control);
  font-family: monospace;
}

.receipt-header {
  text-align: center;
}

.receipt-company {
  font-size: var(--font-size-base, 16px);
  font-weight: 600;
  margin: 0 0 var(--space-1, 4px);
}

.receipt-sub {
  font-size: var(--font-size-xs, 12px);
  color: var(--color-text-muted);
  margin: 2px 0;
}

.receipt-divider {
  border-top: 1px dashed var(--color-line);
  margin: var(--space-3, 12px) 0;
}

.receipt-meta-row {
  display: flex;
  justify-content: space-between;
  font-size: var(--font-size-xs, 12px);
  margin-bottom: 2px;
}

.receipt-facture-tag {
  margin-top: var(--space-2, 8px);
  font-weight: 600;
  font-size: var(--font-size-xs, 12px);
  color: var(--color-ink);
}

.receipt-items-table {
  width: 100%;
  font-size: var(--font-size-xs, 12px);
  border-collapse: collapse;
}

.receipt-items-table th,
.receipt-items-table td {
  padding: var(--space-1, 4px) 2px;
}

.cell-start {
  text-align: start;
}

.cell-center {
  text-align: center;
}

.cell-end {
  text-align: end;
}

.receipt-ref {
  font-size: var(--font-size-xs, 12px);
}

.receipt-totals-block {
  display: flex;
  flex-direction: column;
  gap: var(--space-1, 4px);
  font-size: var(--font-size-xs, 12px);
}

.r-total-row {
  display: flex;
  justify-content: space-between;
}

.r-total-row.r-net {
  font-size: var(--font-size-sm, 13px);
  border-top: 1px solid var(--color-line);
  padding-top: var(--space-1, 4px);
}

.receipt-footer {
  text-align: center;
  margin-top: var(--space-4, 16px);
  font-size: var(--font-size-xs, 12px);
  color: var(--color-text-muted);
}

.receipt-guarantee {
  font-size: var(--font-size-xs, 12px);
}

@media print {
  body * {
    visibility: hidden;
  }
  #printableReceipt, #printableReceipt * {
    visibility: visible;
  }
  #printableReceipt {
    position: absolute;
    left: 0;
    top: 0;
    width: 80mm;
    border: none;
  }
}
</style>
