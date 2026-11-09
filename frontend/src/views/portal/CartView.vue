<template>
  <div class="cart-page">
    <div class="container">
      <!-- Breadcrumb & Header -->
      <div class="page-header">
        <nav class="breadcrumb">
          <router-link to="/">Accueil</router-link>
          <span>/</span>
          <router-link to="/catalog">Catalogue</router-link>
          <span>/</span>
          <span class="active">Mon Panier B2B</span>
        </nav>
        <h1 class="page-title">Mon Panier Professionnel</h1>
      </div>

      <!-- Empty Cart State -->
      <div v-if="!cartStore.loading && cartStore.isEmpty" class="empty-cart-card">
        <div class="empty-icon">🛒</div>
        <h2>Votre panier est actuellement vide</h2>
        <p>Découvrez notre vaste sélection d'articles de quincaillerie industrielle et outillage professionnel.</p>
        <router-link to="/catalog" class="btn btn-primary btn-lg">
          Accéder au Catalogue
        </router-link>
      </div>

      <!-- Cart Content -->
      <div v-else class="cart-layout">
        <!-- Main items list -->
        <div class="cart-items-section">
          <!-- Stock Issue Alert -->
          <div v-if="cartStore.summary.hasStockIssue" class="alert-box alert-warning">
            <span class="alert-icon">⚠️</span>
            <div class="alert-body">
              <strong>Attention aux disponibilités de stock</strong>
              <p>Certains articles dans votre panier dépassent le stock actuellement disponible. Veuillez ajuster les quantités avant de confirmer.</p>
            </div>
          </div>

          <div v-if="submitError" class="alert-box alert-error">
            <span class="alert-icon">❌</span>
            <div class="alert-body">
              <strong>Erreur lors de la validation</strong>
              <p>{{ submitError }}</p>
            </div>
          </div>

          <div class="cart-card">
            <div class="card-header">
              <h2>Articles sélectionnés ({{ cartStore.summary.itemCount }})</h2>
              <button @click="handleClearCart" class="btn-text text-danger" :disabled="cartStore.loading">
                Vider le panier
              </button>
            </div>

            <div class="table-responsive">
              <table class="cart-table">
                <thead>
                  <tr>
                    <th>Article</th>
                    <th>Prix Unit. HT</th>
                    <th style="width: 140px;">Quantité</th>
                    <th>Total TTC</th>
                    <th style="width: 50px;"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in cartStore.items" :key="item.productId" :class="{ 'row-warning': !item.isAvailable }">
                    <td class="product-cell">
                      <div class="product-img">
                        <img v-if="item.thumbUrl" :src="item.thumbUrl" :alt="item.name" />
                        <span v-else class="img-placeholder">📦</span>
                      </div>
                      <div class="product-details">
                        <router-link :to="`/catalog/${item.slug || item.productId}`" class="product-name">
                          {{ item.name }}
                        </router-link>
                        <div class="product-meta">
                          <span class="ref">Réf: {{ item.reference }}</span>
                          <span v-if="item.brand" class="brand">• {{ item.brand }}</span>
                          <span class="unit">• {{ item.unit }}</span>
                          <span v-if="item.boxSize && item.boxSize > 1" class="box-badge">Colis: {{ item.boxSize }}</span>
                        </div>
                        <!-- Stock warning badge -->
                        <div v-if="!item.isAvailable" class="stock-warning">
                          Dispo: <strong>{{ item.availableQuantity }} {{ item.unit }}</strong> (Demandé: {{ item.quantity }})
                        </div>
                      </div>
                    </td>
                    <td class="price-cell">
                      <div class="price-ht">{{ formatCurrency(item.unitPrice) }}</div>
                      <div class="tva-label">+{{ item.tvaRate }}% TVA</div>
                    </td>
                    <td class="qty-cell">
                      <div class="qty-stepper">
                        <button
                          type="button"
                          class="stepper-btn"
                          @click="updateQty(item, item.quantity - 1)"
                          :disabled="item.quantity <= (item.minOrderQty || 1) || cartStore.loading"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          class="stepper-input"
                          :value="item.quantity"
                          :min="item.minOrderQty || 1"
                          @change="onQtyInputChange(item, $event)"
                          :disabled="cartStore.loading"
                        />
                        <button
                          type="button"
                          class="stepper-btn"
                          @click="updateQty(item, item.quantity + 1)"
                          :disabled="cartStore.loading"
                        >
                          +
                        </button>
                      </div>
                      <div v-if="item.minOrderQty > 1" class="min-qty-hint">
                        Min: {{ item.minOrderQty }}
                      </div>
                    </td>
                    <td class="total-cell">
                      <div class="line-ttc">{{ formatCurrency(item.lineTtc) }}</div>
                      <div class="line-ht-sub">HT: {{ formatCurrency(item.lineHt) }}</div>
                    </td>
                    <td class="action-cell">
                      <button
                        @click="handleRemove(item.productId)"
                        class="delete-btn"
                        title="Supprimer cet article"
                        :disabled="cartStore.loading"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Sidebar / Checkout Panel -->
        <div class="cart-sidebar">
          <!-- Financial credit badge for client -->
          <div v-if="authStore.client" class="credit-summary-card">
            <div class="credit-header">
              <span class="credit-icon">💳</span>
              <strong>Facilité de Crédit Client</strong>
            </div>
            <div class="credit-row">
              <span>Code Client :</span>
              <strong>{{ authStore.client.code || 'N/A' }}</strong>
            </div>
            <div class="credit-row">
              <span>Plafond accordé :</span>
              <strong>{{ formatCurrency(authStore.client.creditLimit) }}</strong>
            </div>
            <div class="credit-row">
              <span>Encours actuel :</span>
              <span :class="{ 'text-danger': authStore.client.currentBalance > 0 }">
                {{ formatCurrency(authStore.client.currentBalance) }}
              </span>
            </div>
            <div class="credit-divider"></div>
            <div class="credit-row available">
              <span>Crédit restant disponible :</span>
              <strong :class="availableCreditColor">
                {{ formatCurrency(availableCredit) }}
              </strong>
            </div>

            <div v-if="isCreditExceeded && form.paymentMethod === 'ON_CREDIT'" class="credit-alert">
              ⚠️ Le montant de cette commande dépasse votre plafond disponible de {{ formatCurrency(availableCredit) }}. Veuillez choisir un autre mode de paiement ou contacter le service commercial.
            </div>
          </div>

          <!-- Summary card -->
          <div class="summary-card">
            <h3>Récapitulatif de Commande</h3>

            <div class="summary-row">
              <span>Total Articles HT :</span>
              <span>{{ formatCurrency(cartStore.summary.subtotalHt) }}</span>
            </div>
            <div class="summary-row">
              <span>TVA (estimée 19%) :</span>
              <span>{{ formatCurrency(cartStore.summary.totalTva) }}</span>
            </div>
            <div class="summary-row">
              <span>Frais de logistique :</span>
              <span class="text-success">Offert</span>
            </div>
            <div class="summary-divider"></div>
            <div class="summary-row total-ttc-row">
              <span>Total Général TTC :</span>
              <span class="total-amount">{{ formatCurrency(cartStore.summary.totalTtc) }}</span>
            </div>

            <!-- Checkout options form -->
            <form @submit.prevent="handleSubmitOrder" class="checkout-form">
              <div class="form-group">
                <label>Mode de mise à disposition *</label>
                <div class="radio-group">
                  <label class="radio-label">
                    <input type="radio" value="PICKUP" v-model="form.fulfillmentType" />
                    <span>Retrait direct au Magasin (Comptoir)</span>
                  </label>
                  <label class="radio-label">
                    <input type="radio" value="DELIVERY" v-model="form.fulfillmentType" />
                    <span>Livraison sur Chantier / Dépôt</span>
                  </label>
                </div>
              </div>

              <div v-if="form.fulfillmentType === 'DELIVERY'" class="form-group">
                <label for="address">Adresse exacte de livraison *</label>
                <textarea
                  id="address"
                  v-model="form.deliveryAddress"
                  required
                  placeholder="Wilaya, commune, adresse détaillée et contact sur place..."
                  rows="2"
                  class="form-control"
                ></textarea>
              </div>

              <div class="form-group">
                <label>Mode de règlement convenu *</label>
                <select v-model="form.paymentMethod" class="form-control">
                  <option value="ON_CREDIT">À Crédit (Encours selon plafond conventionné)</option>
                  <option value="CASH">Espèces (Au comptoir)</option>
                  <option value="CHECK">Chèque d'Entreprise</option>
                  <option value="TRANSFER">Virement Bancaire</option>
                </select>
              </div>

              <div class="form-group">
                <label for="note">Instructions ou Référence Interne (optionnel)</label>
                <input
                  id="note"
                  type="text"
                  v-model="form.clientNote"
                  placeholder="Ex: N° Bon de commande interne BC-9942"
                  class="form-control"
                />
              </div>

              <button
                type="submit"
                class="btn btn-primary btn-checkout"
                :disabled="cartStore.loading || submitting || cartStore.summary.hasStockIssue || (isCreditExceeded && form.paymentMethod === 'ON_CREDIT')"
              >
                <span v-if="submitting">Enregistrement en cours...</span>
                <span v-else>Confirmer & Valider la Commande →</span>
              </button>

              <div class="terms-note">
                En confirmant, vous générez un bon de commande officiel soumis à nos conditions générales de vente B2B.
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useCartStore, CartItem } from '../../stores/cart.store';
import { useAuthStore } from '../../stores/auth.store';
import { useOrderStore } from '../../stores/order.store';
import { formatCurrency } from '../../utils/formatters';

const router = useRouter();
const cartStore = useCartStore();
const authStore = useAuthStore();
const orderStore = useOrderStore();

const submitting = ref(false);
const submitError = ref<string | null>(null);

const form = ref({
  fulfillmentType: 'PICKUP' as 'PICKUP' | 'DELIVERY',
  deliveryAddress: authStore.client?.address || '',
  paymentMethod: 'ON_CREDIT' as 'CASH' | 'CHECK' | 'TRANSFER' | 'ON_CREDIT',
  clientNote: '',
});

const availableCredit = computed(() => {
  if (!authStore.client) return 0;
  const limit = Number(authStore.client.creditLimit || 0);
  const bal = Number(authStore.client.currentBalance || 0);
  return Math.max(0, limit - bal);
});

const isCreditExceeded = computed(() => {
  return cartStore.summary.totalTtc > availableCredit.value;
});

const availableCreditColor = computed(() => {
  if (isCreditExceeded.value) return 'text-danger';
  if (availableCredit.value < 50000) return 'text-warning';
  return 'text-success';
});

onMounted(async () => {
  await cartStore.fetchCart();
  if (authStore.token) {
    await authStore.fetchMe();
  }
});

async function updateQty(item: CartItem, newQty: number) {
  if (newQty < (item.minOrderQty || 1)) return;
  try {
    await cartStore.updateQuantity(item.productId, newQty);
  } catch (err: any) {
    // handled by store
  }
}

function onQtyInputChange(item: CartItem, event: Event) {
  const target = event.target as HTMLInputElement;
  const val = parseInt(target.value, 10);
  if (!isNaN(val) && val >= (item.minOrderQty || 1)) {
    updateQty(item, val);
  } else {
    target.value = String(item.quantity);
  }
}

async function handleRemove(productId: number) {
  if (confirm('Voulez-vous retirer cet article de votre panier ?')) {
    await cartStore.removeItem(productId);
  }
}

async function handleClearCart() {
  if (confirm('Êtes-vous sûr de vouloir vider l’intégralité de votre panier ?')) {
    await cartStore.clearCart();
  }
}

async function handleSubmitOrder() {
  submitError.value = null;
  submitting.value = true;

  try {
    const order = await orderStore.placeOrder({
      fulfillmentType: form.value.fulfillmentType,
      deliveryAddress: form.value.fulfillmentType === 'DELIVERY' ? form.value.deliveryAddress : undefined,
      paymentMethod: form.value.paymentMethod,
      clientNote: form.value.clientNote || undefined,
    });

    // Refresh cart in store
    await cartStore.fetchCart();

    // Redirect to visual order tracking page
    router.push(`/portal/orders/${order.id}`);
  } catch (err: any) {
    submitError.value = err.message || 'Une erreur est survenue lors de la validation.';
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.cart-page {
  padding: 2rem 0 4rem;
  background-color: var(--color-bg);
  min-height: calc(100vh - 160px);
}

.page-header {
  margin-bottom: 2rem;
}

.breadcrumb {
  display: flex;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--color-text-muted);
  margin-bottom: 0.5rem;
}

.breadcrumb a {
  color: var(--color-primary);
  text-decoration: none;
}

.breadcrumb .active {
  color: var(--color-text);
  font-weight: 500;
}

.page-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-text);
}

/* Empty state */
.empty-cart-card {
  background: white;
  border-radius: 12px;
  padding: 4rem 2rem;
  text-align: center;
  border: 1px solid var(--color-border);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  max-width: 600px;
  margin: 2rem auto;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.empty-cart-card h2 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.empty-cart-card p {
  color: var(--color-text-muted);
  margin-bottom: 1.5rem;
}

/* Cart layout */
.cart-layout {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 2rem;
  align-items: start;
}

@media (max-width: 992px) {
  .cart-layout {
    grid-template-columns: 1fr;
  }
}

.cart-card {
  background: white;
  border-radius: 12px;
  border: 1px solid var(--color-border);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--color-border);
}

.card-header h2 {
  font-size: 1.15rem;
  font-weight: 600;
  margin: 0;
}

.btn-text {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.875rem;
  padding: 0;
}

.text-danger {
  color: var(--color-danger, #e53935);
}

.text-warning {
  color: var(--color-warning, #f59e0b);
}

.text-success {
  color: var(--color-success, #10b981);
}

/* Table styles */
.table-responsive {
  overflow-x: auto;
}

.cart-table {
  width: 100%;
  border-collapse: collapse;
}

.cart-table th {
  background: #f8fafc;
  padding: 0.875rem 1.25rem;
  font-size: 0.8125rem;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--color-text-muted);
  text-align: left;
  border-bottom: 1px solid var(--color-border);
}

.cart-table td {
  padding: 1.25rem;
  border-bottom: 1px solid var(--color-border);
  vertical-align: middle;
}

.row-warning {
  background-color: #fffbeb;
}

.product-cell {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.product-img {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
  flex-shrink: 0;
}

.product-img img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.img-placeholder {
  font-size: 1.5rem;
}

.product-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.product-name {
  font-weight: 600;
  color: var(--color-text);
  text-decoration: none;
  font-size: 0.95rem;
}

.product-name:hover {
  color: var(--color-primary);
}

.product-meta {
  display: flex;
  gap: 0.35rem;
  font-size: 0.8rem;
  color: var(--color-text-muted);
  flex-wrap: wrap;
}

.box-badge {
  background: #e2e8f0;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 500;
}

.stock-warning {
  font-size: 0.75rem;
  color: #b45309;
  font-weight: 500;
  margin-top: 2px;
}

.price-cell {
  font-size: 0.95rem;
}

.price-ht {
  font-weight: 600;
}

.tva-label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

/* Stepper */
.qty-stepper {
  display: flex;
  align-items: center;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  overflow: hidden;
  width: 110px;
}

.stepper-btn {
  background: #f1f5f9;
  border: none;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  cursor: pointer;
}

.stepper-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.stepper-input {
  width: 46px;
  height: 32px;
  border: none;
  text-align: center;
  font-weight: 600;
  font-size: 0.9rem;
}

.min-qty-hint {
  font-size: 0.7rem;
  color: var(--color-text-muted);
  margin-top: 2px;
}

.line-ttc {
  font-weight: 700;
  font-size: 1rem;
  color: var(--color-primary);
}

.line-ht-sub {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.delete-btn {
  background: none;
  border: none;
  color: var(--color-text-muted);
  font-size: 1.1rem;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
}

.delete-btn:hover {
  background: #fee2e2;
  color: #ef4444;
}

/* Alerts */
.alert-box {
  display: flex;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border-radius: 8px;
  margin-bottom: 1.25rem;
}

.alert-warning {
  background: #fffbeb;
  border: 1px solid #fef3c7;
  color: #92400e;
}

.alert-error {
  background: #fef2f2;
  border: 1px solid #fee2e2;
  color: #991b1b;
}

.alert-icon {
  font-size: 1.25rem;
}

.alert-body p {
  margin: 0.25rem 0 0;
  font-size: 0.875rem;
}

/* Sidebar cards */
.cart-sidebar {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.credit-summary-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1.25rem;
}

.credit-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.95rem;
  margin-bottom: 0.875rem;
  color: #1e293b;
}

.credit-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  margin-bottom: 0.4rem;
  color: var(--color-text-muted);
}

.credit-divider {
  height: 1px;
  background: #e2e8f0;
  margin: 0.6rem 0;
}

.credit-row.available {
  font-size: 0.9rem;
  color: var(--color-text);
  font-weight: 500;
}

.credit-alert {
  margin-top: 0.75rem;
  font-size: 0.8rem;
  background: #fee2e2;
  color: #b91c1c;
  padding: 0.5rem;
  border-radius: 6px;
}

.summary-card {
  background: white;
  border-radius: 12px;
  border: 1px solid var(--color-border);
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.summary-card h3 {
  font-size: 1.15rem;
  font-weight: 600;
  margin-bottom: 1.25rem;
  color: var(--color-text);
}

.summary-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
  margin-bottom: 0.6rem;
  color: var(--color-text-muted);
}

.summary-divider {
  height: 1px;
  background: var(--color-border);
  margin: 1rem 0;
}

.total-ttc-row {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 1.5rem;
}

.total-amount {
  color: var(--color-primary);
  font-size: 1.35rem;
}

/* Checkout Form */
.checkout-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 0.4rem;
}

.radio-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  font-weight: normal;
  cursor: pointer;
}

.form-control {
  width: 100%;
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 0.875rem;
  outline: none;
}

.form-control:focus {
  border-color: var(--color-primary);
}

.btn-checkout {
  width: 100%;
  padding: 0.875rem;
  font-size: 1rem;
  font-weight: 600;
  margin-top: 0.5rem;
}

.terms-note {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  text-align: center;
  margin-top: 0.5rem;
}
</style>
