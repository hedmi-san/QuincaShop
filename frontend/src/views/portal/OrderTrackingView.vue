<template>
  <div class="order-tracking-page">
    <div class="container">
      <!-- Breadcrumb -->
      <nav class="breadcrumb">
        <router-link to="/">Accueil</router-link>
        <span>/</span>
        <router-link to="/portal/orders">Mes Commandes</router-link>
        <span>/</span>
        <span class="active">{{ order?.order_number || 'Détail Commande' }}</span>
      </nav>

      <!-- Loading / Error states -->
      <div v-if="orderStore.loading" class="loading-state">
        <div class="spinner"></div>
        <p>Chargement du suivi de votre commande...</p>
      </div>

      <div v-else-if="orderStore.error || !order" class="error-state">
        <div class="error-icon">⚠️</div>
        <h2>Commande introuvable</h2>
        <p>{{ orderStore.error || 'La commande demandée n’existe pas ou vous n’y avez pas accès.' }}</p>
        <router-link to="/portal/orders" class="btn btn-secondary">Retour à mes commandes</router-link>
      </div>

      <div v-else class="tracking-content">
        <!-- Top Banner / Order summary -->
        <div class="order-header-card">
          <div class="header-main">
            <div>
              <div class="order-badge-row">
                <span class="order-id">{{ order.order_number }}</span>
                <span :class="['status-badge', `status-${order.status.toLowerCase()}`]">
                  {{ getStatusLabel(order.status) }}
                </span>
                <span class="payment-badge">{{ getPaymentLabel(order.payment_method) }}</span>
              </div>
              <p class="order-date">
                Passée le {{ formatDate(order.created_at) }} • Mise à disposition : 
                <strong>{{ order.fulfillment_type === 'DELIVERY' ? 'Livraison sur site' : 'Retrait Magasin' }}</strong>
              </p>
            </div>
            <div class="header-actions">
              <button
                v-if="order.status === 'PENDING'"
                @click="showCancelModal = true"
                class="btn btn-outline-danger"
              >
                Annuler la commande
              </button>
              <button @click="handlePrint" class="btn btn-outline">
                🖨️ Imprimer Bon de Commande
              </button>
            </div>
          </div>

          <!-- Cancellation Notice if Cancelled -->
          <div v-if="order.status === 'CANCELLED' || order.status === 'REJECTED'" class="cancellation-alert">
            <span class="alert-icon">🚫</span>
            <div>
              <strong>Commande {{ order.status === 'CANCELLED' ? 'Annulée' : 'Refusée' }}</strong>
              <p v-if="order.cancel_reason">Motif : {{ order.cancel_reason }}</p>
            </div>
          </div>

          <!-- Visual Milestone Stepper (if active / not cancelled) -->
          <div v-if="order.status !== 'CANCELLED' && order.status !== 'REJECTED'" class="stepper-wrapper">
            <div class="stepper">
              <div
                v-for="(step, index) in steps"
                :key="step.key"
                class="step-item"
                :class="{
                  'is-completed': isStepCompleted(step.key),
                  'is-current': order.status === step.key,
                  'is-upcoming': isStepUpcoming(step.key)
                }"
              >
                <div class="step-line" v-if="index > 0"></div>
                <div class="step-circle">
                  <span v-if="isStepCompleted(step.key)">✓</span>
                  <span v-else>{{ index + 1 }}</span>
                </div>
                <div class="step-label">{{ step.label }}</div>
                <div class="step-desc">{{ step.desc }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Two Columns Layout: Items Table & Logistics Details -->
        <div class="details-grid">
          <!-- Left: Order Items & Pricing -->
          <div class="items-card">
            <h3>Articles Commandés ({{ order.items?.length || 0 }})</h3>
            <div class="table-responsive">
              <table class="items-table">
                <thead>
                  <tr>
                    <th>Article</th>
                    <th>Prix HT</th>
                    <th>Quantité</th>
                    <th>TVA</th>
                    <th class="text-right">Total TTC</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in order.items" :key="item.id">
                    <td class="item-name-cell">
                      <div class="item-thumb">
                        <img v-if="item.thumb_url" :src="item.thumb_url" :alt="item.product_name" />
                        <span v-else>📦</span>
                      </div>
                      <div>
                        <div class="item-title">{{ item.product_name }}</div>
                        <div class="item-ref">Réf: {{ item.reference }}</div>
                      </div>
                    </td>
                    <td>{{ formatCurrency(item.unit_price) }}</td>
                    <td>
                      <strong>{{ item.quantity }}</strong> {{ item.unit }}
                    </td>
                    <td>{{ item.tva }}%</td>
                    <td class="text-right font-weight-bold">
                      {{ formatCurrency(calculateLineTtc(item.unit_price, item.quantity, item.tva)) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Financial Totals -->
            <div class="totals-section">
              <div class="totals-row">
                <span>Sous-total HT :</span>
                <span>{{ formatCurrency(order.subtotal_ht) }}</span>
              </div>
              <div class="totals-row">
                <span>TVA (19%) :</span>
                <span>{{ formatCurrency(order.total_tva) }}</span>
              </div>
              <div class="totals-row">
                <span>Frais de livraison :</span>
                <span>{{ order.delivery_fee > 0 ? formatCurrency(order.delivery_fee) : 'Inclus / Gratuit' }}</span>
              </div>
              <div class="totals-divider"></div>
              <div class="totals-row grand-total">
                <span>Total Général TTC :</span>
                <span class="total-price">{{ formatCurrency(order.total_ttc) }}</span>
              </div>
            </div>
          </div>

          <!-- Right Column: Delivery info & Status Timeline -->
          <div class="sidebar-cards">
            <!-- Fulfillment info -->
            <div class="info-card">
              <h4>Informations Logistiques</h4>
              <div class="info-row">
                <span class="label">Mise à disposition :</span>
                <span class="val">{{ order.fulfillment_type === 'DELIVERY' ? 'Livraison sur Site' : 'Retrait au Magasin' }}</span>
              </div>
              <div v-if="order.delivery_address" class="info-row">
                <span class="label">Adresse de livraison :</span>
                <span class="val">{{ order.delivery_address }}</span>
              </div>
              <div class="info-row">
                <span class="label">Règlement :</span>
                <span class="val">{{ getPaymentLabel(order.payment_method) }}</span>
              </div>
              <div v-if="order.client_note" class="info-row">
                <span class="label">Note / Réf client :</span>
                <span class="val italic">{{ order.client_note }}</span>
              </div>
            </div>

            <!-- Status Timeline -->
            <div class="info-card">
              <h4>Historique des Événements</h4>
              <div v-if="!order.history || order.history.length === 0" class="text-muted">
                Aucun historique enregistré.
              </div>
              <ul v-else class="timeline">
                <li v-for="(h, idx) in order.history" :key="idx" class="timeline-item">
                  <div class="timeline-marker"></div>
                  <div class="timeline-body">
                    <div class="timeline-title">
                      <strong>{{ getStatusLabel(h.status) }}</strong>
                    </div>
                    <div class="timeline-time">{{ formatDateTime(h.created_at) }}</div>
                    <div v-if="h.note" class="timeline-note">{{ h.note }}</div>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <!-- Cancel Confirmation Modal -->
      <div v-if="showCancelModal" class="modal-backdrop">
        <div class="modal-dialog">
          <h3>Annuler la commande {{ order?.order_number }}</h3>
          <p>Êtes-vous sûr de vouloir annuler cette commande ? Cette opération est irréversible.</p>
          <div class="form-group">
            <label>Motif d'annulation (facultatif) :</label>
            <input
              type="text"
              v-model="cancelReasonInput"
              placeholder="Ex: Changement d'avis, commande en doublon..."
              class="form-control"
            />
          </div>
          <div class="modal-actions">
            <button @click="showCancelModal = false" class="btn btn-secondary">
              Garder la commande
            </button>
            <button
              @click="handleConfirmCancel"
              class="btn btn-danger"
              :disabled="cancelling"
            >
              <span v-if="cancelling">Annulation en cours...</span>
              <span v-else>Confirmer l'annulation</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useOrderStore, Order } from '../../stores/order.store';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';

const route = useRoute();
const orderStore = useOrderStore();

const showCancelModal = ref(false);
const cancelReasonInput = ref('');
const cancelling = ref(false);

const order = computed<Order | null>(() => orderStore.currentOrder);

const steps = [
  { key: 'PENDING', label: 'Enregistrée', desc: 'Attente validation magasin' },
  { key: 'CONFIRMED', label: 'Confirmée', desc: 'Stock réservé' },
  { key: 'PREPARING', label: 'En Préparation', desc: 'Rayonnage & colisage' },
  { key: 'READY', label: 'Prête', desc: 'Prête pour retrait/départ' },
  { key: 'DELIVERED', label: 'Remise / Livrée', desc: 'Marchandise livrée' },
];

const stepOrder = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED', 'COMPLETED'];

function isStepCompleted(stepKey: string): boolean {
  if (!order.value) return false;
  const currentIdx = stepOrder.indexOf(order.value.status);
  const stepIdx = stepOrder.indexOf(stepKey);
  return currentIdx > stepIdx;
}

function isStepUpcoming(stepKey: string): boolean {
  if (!order.value) return true;
  const currentIdx = stepOrder.indexOf(order.value.status);
  const stepIdx = stepOrder.indexOf(stepKey);
  return currentIdx < stepIdx;
}

function calculateLineTtc(unitPrice: number, quantity: number, tva: number): number {
  const lineHt = Number(unitPrice) * quantity;
  return lineHt + (lineHt * Number(tva || 19)) / 100;
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'PENDING': return 'En Attente de Confirmation';
    case 'CONFIRMED': return 'Confirmée (Stock Réservé)';
    case 'PREPARING': return 'En Préparation';
    case 'READY': return 'Prête pour Retrait';
    case 'DELIVERED': return 'Livrée / Remise';
    case 'COMPLETED': return 'Clôturée';
    case 'CANCELLED': return 'Annulée';
    case 'REJECTED': return 'Refusée';
    default: return status;
  }
}

function getPaymentLabel(pm: string): string {
  switch (pm) {
    case 'ON_CREDIT': return 'À Crédit';
    case 'CASH': return 'Espèces';
    case 'CHECK': return 'Chèque';
    case 'TRANSFER': return 'Virement';
    default: return pm;
  }
}

function handlePrint() {
  window.print();
}

async function handleConfirmCancel() {
  if (!order.value) return;
  cancelling.value = true;
  try {
    await orderStore.cancelPortalOrder(order.value.id, cancelReasonInput.value || undefined);
    showCancelModal.value = false;
  } catch (err: any) {
    alert(err.message || 'Impossible d’annuler la commande.');
  } finally {
    cancelling.value = false;
  }
}

onMounted(async () => {
  const id = parseInt(route.params.id as string, 10);
  if (!isNaN(id)) {
    await orderStore.fetchPortalOrderById(id);
  }
});
</script>

<style scoped>
.order-tracking-page {
  padding: 2rem 0 4rem;
  background-color: var(--color-bg);
  min-height: calc(100vh - 160px);
}

.breadcrumb {
  display: flex;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--color-text-muted);
  margin-bottom: 1.5rem;
}

.breadcrumb a {
  color: var(--color-primary);
  text-decoration: none;
}

.breadcrumb .active {
  color: var(--color-text);
  font-weight: 500;
}

.loading-state,
.error-state {
  text-align: center;
  padding: 4rem 2rem;
  background: white;
  border-radius: 12px;
  border: 1px solid var(--color-border);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(0, 0, 0, 0.1);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Header card */
.order-header-card {
  background: white;
  border-radius: 12px;
  border: 1px solid var(--color-border);
  padding: 1.5rem 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.header-main {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.order-badge-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-bottom: 0.5rem;
}

.order-id {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
}

.status-badge {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
}

.status-pending { background: #fef3c7; color: #b45309; }
.status-confirmed { background: #dbeafe; color: #1e40af; }
.status-preparing { background: #e0e7ff; color: #4338ca; }
.status-ready { background: #dcfce7; color: #15803d; }
.status-delivered,
.status-completed { background: #bbf7d0; color: #166534; }
.status-cancelled,
.status-rejected { background: #fee2e2; color: #b91c1c; }

.payment-badge {
  background: #f1f5f9;
  color: #475569;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 500;
}

.order-date {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.header-actions {
  display: flex;
  gap: 0.75rem;
}

.btn-outline-danger {
  background: transparent;
  border: 1px solid #ef4444;
  color: #ef4444;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
}

.btn-outline-danger:hover {
  background: #fef2f2;
}

/* Cancellation alert */
.cancellation-alert {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #991b1b;
  padding: 1rem;
  border-radius: 8px;
  display: flex;
  gap: 0.75rem;
  align-items: center;
  margin-top: 1rem;
}

/* Stepper */
.stepper-wrapper {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--color-border);
}

.stepper {
  display: flex;
  justify-content: space-between;
  position: relative;
}

.step-item {
  flex: 1;
  text-align: center;
  position: relative;
}

.step-circle {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #e2e8f0;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.875rem;
  margin: 0 auto 0.5rem;
  position: relative;
  z-index: 2;
  transition: all 0.3s ease;
}

.step-line {
  position: absolute;
  top: 18px;
  right: 50%;
  left: -50%;
  height: 3px;
  background: #e2e8f0;
  z-index: 1;
}

.is-completed .step-circle {
  background: #10b981;
  color: white;
}

.is-completed .step-line {
  background: #10b981;
}

.is-current .step-circle {
  background: var(--color-primary);
  color: white;
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.2);
}

.is-current .step-line {
  background: #10b981;
}

.step-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 0.2rem;
}

.step-desc {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

@media (max-width: 768px) {
  .step-desc {
    display: none;
  }
}

/* Two Columns */
.details-grid {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 2rem;
  align-items: start;
}

@media (max-width: 992px) {
  .details-grid {
    grid-template-columns: 1fr;
  }
}

.items-card {
  background: white;
  border-radius: 12px;
  border: 1px solid var(--color-border);
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.items-card h3 {
  font-size: 1.15rem;
  font-weight: 600;
  margin-bottom: 1.25rem;
}

.items-table {
  width: 100%;
  border-collapse: collapse;
}

.items-table th {
  padding: 0.75rem 1rem;
  background: #f8fafc;
  font-size: 0.8rem;
  text-transform: uppercase;
  color: var(--color-text-muted);
  border-bottom: 1px solid var(--color-border);
  text-align: left;
}

.items-table td {
  padding: 1rem;
  border-bottom: 1px solid var(--color-border);
  font-size: 0.9rem;
}

.item-name-cell {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.item-thumb {
  width: 44px;
  height: 44px;
  border-radius: 6px;
  background: #f8fafc;
  border: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
}

.item-thumb img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.item-title {
  font-weight: 600;
  color: var(--color-text);
}

.item-ref {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.text-right {
  text-align: right;
}

.font-weight-bold {
  font-weight: 700;
}

/* Totals */
.totals-section {
  max-width: 350px;
  margin-left: auto;
  margin-top: 1.5rem;
}

.totals-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
  color: var(--color-text-muted);
}

.totals-divider {
  height: 1px;
  background: var(--color-border);
  margin: 0.75rem 0;
}

.grand-total {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--color-text);
}

.total-price {
  color: var(--color-primary);
  font-size: 1.25rem;
}

/* Sidebar cards */
.sidebar-cards {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.info-card {
  background: white;
  border-radius: 12px;
  border: 1px solid var(--color-border);
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.info-card h4 {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

.info-row {
  display: flex;
  flex-direction: column;
  margin-bottom: 0.75rem;
  font-size: 0.875rem;
}

.info-row .label {
  color: var(--color-text-muted);
  font-size: 0.8rem;
  margin-bottom: 0.2rem;
}

.info-row .val {
  font-weight: 500;
  color: var(--color-text);
}

.italic {
  font-style: italic;
}

/* Timeline */
.timeline {
  list-style: none;
  padding: 0;
  margin: 0;
  position: relative;
}

.timeline::before {
  content: '';
  position: absolute;
  top: 6px;
  bottom: 6px;
  left: 7px;
  width: 2px;
  background: #e2e8f0;
}

.timeline-item {
  position: relative;
  padding-left: 24px;
  margin-bottom: 1.25rem;
}

.timeline-marker {
  position: absolute;
  left: 2px;
  top: 4px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--color-primary);
  border: 2px solid white;
}

.timeline-title {
  font-size: 0.875rem;
  color: var(--color-text);
}

.timeline-time {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-top: 0.15rem;
}

.timeline-note {
  font-size: 0.8rem;
  background: #f8fafc;
  padding: 0.4rem 0.6rem;
  border-radius: 4px;
  margin-top: 0.35rem;
  color: var(--color-text-muted);
}

/* Modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-dialog {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  max-width: 480px;
  width: 90%;
}

.modal-dialog h3 {
  margin-top: 0;
  font-size: 1.25rem;
}

.modal-dialog p {
  color: var(--color-text-muted);
  font-size: 0.9rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
}
</style>

