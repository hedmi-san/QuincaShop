<template>
  <div class="admin-orders-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Gestion des Commandes B2B</h1>
        <p class="page-subtitle">Suivi du flux des ventes, réservations de stock et préparation des colis.</p>
      </div>
    </div>

    <!-- Filters Bar -->
    <div class="filters-card">
      <div class="search-box">
        <input
          type="text"
          v-model="searchQuery"
          placeholder="Rechercher N° commande, client..."
          class="form-control"
          @keyup.enter="handleSearch"
        />
        <button class="btn btn-secondary" @click="handleSearch">Rechercher</button>
      </div>

      <div class="status-filters">
        <button
          v-for="st in statusFilters"
          :key="st.value"
          :class="['filter-pill', { active: selectedStatus === st.value }]"
          @click="setStatusFilter(st.value)"
        >
          {{ st.label }}
        </button>
      </div>
    </div>

    <!-- Error notice -->
    <div v-if="actionError" class="alert alert-danger">
      {{ actionError }}
    </div>

    <!-- Orders Table -->
    <div class="orders-card">
      <div v-if="orderStore.loading" class="loading-state">
        <div class="spinner"></div>
        <p>Chargement des commandes...</p>
      </div>

      <div v-else-if="orderStore.orders.length === 0" class="empty-state">
        <div class="empty-icon">📋</div>
        <h3>Aucune commande trouvée</h3>
        <p>Modifiez vos critères de recherche ou réinitialisez les filtres.</p>
      </div>

      <div v-else class="table-responsive">
        <table class="orders-table">
          <thead>
            <tr>
              <th>N° Commande</th>
              <th>Date</th>
              <th>Client</th>
              <th>Règlement</th>
              <th>Mise à disposition</th>
              <th>Total TTC</th>
              <th>Statut</th>
              <th style="min-width: 220px;">Actions État</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="order in orderStore.orders" :key="order.id">
              <td>
                <div class="order-num">{{ order.order_number }}</div>
                <div class="channel-tag">{{ order.channel === 'STAFF' ? 'Comptoir' : 'En ligne' }}</div>
              </td>
              <td>
                <div>{{ formatDate(order.created_at) }}</div>
                <div class="time-sub">{{ formatTime(order.created_at) }}</div>
              </td>
              <td>
                <div class="client-name">{{ order.client_name }}</div>
                <div class="client-meta">{{ order.client_code }} • {{ order.client_wilaya || 'N/A' }}</div>
              </td>
              <td>
                <span class="payment-badge">{{ getPaymentLabel(order.payment_method) }}</span>
              </td>
              <td>
                <span class="fulfillment-badge">
                  {{ order.fulfillment_type === 'DELIVERY' ? 'Livraison' : 'Retrait' }}
                </span>
              </td>
              <td class="price-cell">
                {{ formatCurrency(order.total_ttc) }}
              </td>
              <td>
                <span :class="['status-badge', `status-${order.status.toLowerCase()}`]">
                  {{ getStatusLabel(order.status) }}
                </span>
              </td>
              <td>
                <div class="action-btn-group">
                  <!-- PENDING -> CONFIRMED (Reserves stock) -->
                  <button
                    v-if="order.status === 'PENDING'"
                    @click="transitionOrder(order, 'CONFIRMED')"
                    class="btn btn-sm btn-primary"
                    :disabled="processingId === order.id"
                    title="Confirmer la commande et réserver le stock physique"
                  >
                    Confirmer
                  </button>

                  <!-- CONFIRMED -> PREPARING -->
                  <button
                    v-if="order.status === 'CONFIRMED'"
                    @click="transitionOrder(order, 'PREPARING')"
                    class="btn btn-sm btn-warning"
                    :disabled="processingId === order.id"
                  >
                    En Préparation
                  </button>

                  <!-- PREPARING -> READY -->
                  <button
                    v-if="order.status === 'PREPARING'"
                    @click="transitionOrder(order, 'READY')"
                    class="btn btn-sm btn-success"
                    :disabled="processingId === order.id"
                  >
                    Marquer Prête
                  </button>

                  <!-- READY -> DELIVERED (Commits stock sale) -->
                  <button
                    v-if="order.status === 'READY'"
                    @click="transitionOrder(order, 'DELIVERED')"
                    class="btn btn-sm btn-delivered"
                    :disabled="processingId === order.id"
                    title="Valider la livraison et déstocker définitivement"
                  >
                    Livrer / Remettre
                  </button>

                  <!-- DELIVERED -> COMPLETED -->
                  <button
                    v-if="order.status === 'DELIVERED'"
                    @click="transitionOrder(order, 'COMPLETED')"
                    class="btn btn-sm btn-outline"
                    :disabled="processingId === order.id"
                  >
                    Clôturer
                  </button>

                  <!-- Cancel Button (Available for PENDING, CONFIRMED, PREPARING, READY) -->
                  <button
                    v-if="['PENDING', 'CONFIRMED', 'PREPARING', 'READY'].includes(order.status)"
                    @click="openCancelModal(order)"
                    class="btn btn-sm btn-outline-danger"
                    :disabled="processingId === order.id"
                  >
                    Annuler
                  </button>

                  <!-- Details Modal button -->
                  <button
                    @click="openDetailsModal(order)"
                    class="btn btn-sm btn-ghost"
                    title="Voir le détail et les articles"
                  >
                    👁️
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="orderStore.meta.totalPages > 1" class="pagination">
        <button
          class="btn btn-sm"
          :disabled="orderStore.meta.page <= 1"
          @click="changePage(orderStore.meta.page - 1)"
        >
          ← Précédent
        </button>
        <span>Page {{ orderStore.meta.page }} sur {{ orderStore.meta.totalPages }}</span>
        <button
          class="btn btn-sm"
          :disabled="orderStore.meta.page >= orderStore.meta.totalPages"
          @click="changePage(orderStore.meta.page + 1)"
        >
          Suivant →
        </button>
      </div>
    </div>

    <!-- Order Detail Modal -->
    <div v-if="activeDetailOrder" class="modal-backdrop" @click.self="activeDetailOrder = null">
      <div class="modal-dialog modal-lg">
        <div class="modal-header">
          <div>
            <h3>Commande {{ activeDetailOrder.order_number }}</h3>
            <span :class="['status-badge', `status-${activeDetailOrder.status.toLowerCase()}`]">
              {{ getStatusLabel(activeDetailOrder.status) }}
            </span>
          </div>
          <button @click="activeDetailOrder = null" class="modal-close">✕</button>
        </div>

        <div class="modal-body">
          <div class="order-meta-grid">
            <div>
              <strong>Client :</strong> {{ activeDetailOrder.client_name }} ({{ activeDetailOrder.client_code }})<br />
              <strong>Téléphone :</strong> {{ activeDetailOrder.client_phone || 'N/A' }}<br />
              <strong>Wilaya / Adresse :</strong> {{ activeDetailOrder.client_wilaya || 'N/A' }} - {{ activeDetailOrder.client_address || '' }}
            </div>
            <div>
              <strong>Date :</strong> {{ formatDate(activeDetailOrder.created_at) }}<br />
              <strong>Mode Règlement :</strong> {{ getPaymentLabel(activeDetailOrder.payment_method) }}<br />
              <strong>Mise à disposition :</strong> {{ activeDetailOrder.fulfillment_type === 'DELIVERY' ? 'Livraison sur Chantier' : 'Retrait Magasin' }}
            </div>
          </div>

          <div v-if="activeDetailOrder.delivery_address" class="delivery-address-box">
            <strong>Adresse de livraison spécifiée :</strong>
            <p>{{ activeDetailOrder.delivery_address }}</p>
          </div>

          <div v-if="activeDetailOrder.client_note" class="client-note-box">
            <strong>Note du client :</strong>
            <p>{{ activeDetailOrder.client_note }}</p>
          </div>

          <!-- Items list -->
          <h4 style="margin: 1.5rem 0 0.5rem;">Articles ({{ activeDetailOrder.items?.length || 0 }})</h4>
          <div class="table-responsive">
            <table class="modal-table">
              <thead>
                <tr>
                  <th>Article</th>
                  <th>Prix Unit. HT</th>
                  <th>Quantité</th>
                  <th>TVA</th>
                  <th class="text-right">Total TTC</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="it in activeDetailOrder.items" :key="it.id">
                  <td>
                    <strong>{{ it.product_name }}</strong>
                    <div class="text-muted" style="font-size: 0.75rem;">Réf: {{ it.reference }}</div>
                  </td>
                  <td>{{ formatCurrency(it.unit_price) }}</td>
                  <td>{{ it.quantity }} {{ it.unit }}</td>
                  <td>{{ it.tva }}%</td>
                  <td class="text-right font-weight-bold">
                    {{ formatCurrency(calculateLineTtc(it.unit_price, it.quantity, it.tva)) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="modal-totals">
            <div><span>Sous-total HT :</span> <strong>{{ formatCurrency(activeDetailOrder.subtotal_ht) }}</strong></div>
            <div><span>Total TVA :</span> <strong>{{ formatCurrency(activeDetailOrder.total_tva) }}</strong></div>
            <div class="grand-total-row"><span>Total Général TTC :</span> <strong>{{ formatCurrency(activeDetailOrder.total_ttc) }}</strong></div>
          </div>

          <!-- History -->
          <h4 style="margin: 1.5rem 0 0.5rem;">Historique d'avancement</h4>
          <ul class="history-list">
            <li v-for="(h, idx) in activeDetailOrder.history" :key="idx">
              <span class="history-status">{{ getStatusLabel(h.status) }}</span>
              <span class="history-time">{{ formatDateTime(h.created_at) }}</span>
              <span v-if="h.changed_by_name" class="history-user">par {{ h.changed_by_name }}</span>
              <div v-if="h.note" class="history-note">{{ h.note }}</div>
            </li>
          </ul>
        </div>

        <div class="modal-footer">
          <button @click="activeDetailOrder = null" class="btn btn-secondary">Fermer</button>
        </div>
      </div>
    </div>

    <!-- Cancellation Modal -->
    <div v-if="orderToCancel" class="modal-backdrop" @click.self="orderToCancel = null">
      <div class="modal-dialog">
        <div class="modal-header">
          <h3>Annuler la commande {{ orderToCancel.order_number }}</h3>
          <button @click="orderToCancel = null" class="modal-close">✕</button>
        </div>
        <div class="modal-body">
          <p>La commande sera passée au statut <strong>ANNULÉE</strong>. Si du stock avait été réservé, il sera immédiatement libéré.</p>
          <div class="form-group">
            <label>Motif d'annulation obligatoire :</label>
            <input
              type="text"
              v-model="cancelReasonInput"
              placeholder="Ex: Demande client, rupture de stock, client injoignable..."
              class="form-control"
              required
            />
          </div>
        </div>
        <div class="modal-footer">
          <button @click="orderToCancel = null" class="btn btn-secondary">Annuler</button>
          <button
            @click="handleConfirmCancel"
            class="btn btn-danger"
            :disabled="!cancelReasonInput.trim() || processingId === orderToCancel.id"
          >
            Confirmer l'annulation
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useOrderStore, Order } from '../../stores/order.store';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';

const orderStore = useOrderStore();

const searchQuery = ref('');
const selectedStatus = ref('ALL');
const processingId = ref<number | null>(null);
const actionError = ref<string | null>(null);

const activeDetailOrder = ref<Order | null>(null);
const orderToCancel = ref<Order | null>(null);
const cancelReasonInput = ref('');

const statusFilters = [
  { value: 'ALL', label: 'Toutes' },
  { value: 'PENDING', label: 'En attente' },
  { value: 'CONFIRMED', label: 'Confirmées' },
  { value: 'PREPARING', label: 'En préparation' },
  { value: 'READY', label: 'Prêtes' },
  { value: 'DELIVERED', label: 'Livrées' },
  { value: 'CANCELLED', label: 'Annulées' },
];

function getStatusLabel(status: string): string {
  switch (status) {
    case 'PENDING': return 'En Attente';
    case 'CONFIRMED': return 'Confirmée (Stock Réservé)';
    case 'PREPARING': return 'En Préparation';
    case 'READY': return 'Prête';
    case 'DELIVERED': return 'Livrée';
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

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function calculateLineTtc(price: number, qty: number, tva: number): number {
  const lineHt = Number(price) * qty;
  return lineHt + (lineHt * Number(tva || 19)) / 100;
}

async function loadOrders(page = 1) {
  await orderStore.fetchAdminOrders({
    page,
    pageSize: 25,
    status: selectedStatus.value === 'ALL' ? undefined : selectedStatus.value,
    search: searchQuery.value || undefined,
  });
}

function handleSearch() {
  loadOrders(1);
}

function setStatusFilter(status: string) {
  selectedStatus.value = status;
  loadOrders(1);
}

function changePage(page: number) {
  loadOrders(page);
}

async function transitionOrder(order: Order, nextStatus: string) {
  actionError.value = null;
  processingId.value = order.id;

  try {
    await orderStore.updateAdminOrderStatus(order.id, nextStatus, {
      note: `Statut passé à ${nextStatus} par le personnel`,
      visibleToClient: true,
    });
    await loadOrders(orderStore.meta.page);
  } catch (err: any) {
    actionError.value = err.message || 'Impossible de mettre à jour le statut.';
  } finally {
    processingId.value = null;
  }
}

async function openDetailsModal(order: Order) {
  activeDetailOrder.value = null;
  try {
    const full = await orderStore.fetchAdminOrderById(order.id);
    activeDetailOrder.value = full;
  } catch (err: any) {
    alert('Impossible de charger le détail de la commande.');
  }
}

function openCancelModal(order: Order) {
  orderToCancel.value = order;
  cancelReasonInput.value = '';
}

async function handleConfirmCancel() {
  if (!orderToCancel.value || !cancelReasonInput.value.trim()) return;
  processingId.value = orderToCancel.value.id;

  try {
    await orderStore.cancelAdminOrder(orderToCancel.value.id, cancelReasonInput.value.trim());
    orderToCancel.value = null;
    await loadOrders(orderStore.meta.page);
  } catch (err: any) {
    alert(err.message || 'Erreur lors de l’annulation.');
  } finally {
    processingId.value = null;
  }
}

onMounted(() => {
  loadOrders();
});
</script>

<style scoped>
.admin-orders-page {
  padding: 1.5rem;
}

.page-header {
  margin-bottom: 1.5rem;
}

.page-title {
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0;
}

.page-subtitle {
  color: var(--color-text-muted);
  font-size: 0.9rem;
  margin: 0.25rem 0 0;
}

.filters-card {
  background: white;
  border-radius: 12px;
  border: 1px solid var(--color-border);
  padding: 1.25rem;
  margin-bottom: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.search-box {
  display: flex;
  gap: 0.5rem;
  max-width: 400px;
  width: 100%;
}

.status-filters {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.filter-pill {
  background: #f1f5f9;
  border: none;
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  font-size: 0.825rem;
  color: var(--color-text-muted);
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
}

.filter-pill.active {
  background: var(--color-primary);
  color: white;
}

.alert-danger {
  background: #fee2e2;
  border: 1px solid #fecaca;
  color: #991b1b;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  font-size: 0.875rem;
}

.orders-card {
  background: white;
  border-radius: 12px;
  border: 1px solid var(--color-border);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.orders-table {
  width: 100%;
  border-collapse: collapse;
}

.orders-table th {
  padding: 0.875rem 1rem;
  background: #f8fafc;
  font-size: 0.8rem;
  text-transform: uppercase;
  color: var(--color-text-muted);
  border-bottom: 1px solid var(--color-border);
  text-align: left;
}

.orders-table td {
  padding: 1rem;
  border-bottom: 1px solid var(--color-border);
  font-size: 0.9rem;
  vertical-align: middle;
}

.order-num {
  font-weight: 700;
  color: var(--color-text);
}

.channel-tag {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.time-sub {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.client-name {
  font-weight: 600;
  color: var(--color-text);
}

.client-meta {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.payment-badge,
.fulfillment-badge {
  font-size: 0.8rem;
  background: #f1f5f9;
  padding: 3px 8px;
  border-radius: 4px;
  color: #475569;
}

.price-cell {
  font-weight: 700;
  color: var(--color-primary);
}

.status-badge {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  display: inline-block;
}

.status-pending { background: #fef3c7; color: #b45309; }
.status-confirmed { background: #dbeafe; color: #1e40af; }
.status-preparing { background: #e0e7ff; color: #4338ca; }
.status-ready { background: #dcfce7; color: #15803d; }
.status-delivered,
.status-completed { background: #bbf7d0; color: #166534; }
.status-cancelled,
.status-rejected { background: #fee2e2; color: #b91c1c; }

.action-btn-group {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.btn-warning {
  background: #f59e0b;
  color: white;
}

.btn-warning:hover {
  background: #d97706;
}

.btn-delivered {
  background: #10b981;
  color: white;
}

.btn-delivered:hover {
  background: #059669;
}

.btn-outline-danger {
  border: 1px solid #ef4444;
  color: #ef4444;
  background: transparent;
}

.btn-outline-danger:hover {
  background: #fef2f2;
}

.btn-ghost {
  background: transparent;
  border: none;
  font-size: 1.1rem;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 4px;
}

.btn-ghost:hover {
  background: #f1f5f9;
}

/* Modals */
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
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-lg {
  max-width: 800px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--color-border);
}

.modal-header h3 {
  margin: 0 0 0.25rem;
  font-size: 1.25rem;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
}

.modal-body {
  padding: 1.5rem;
}

.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.order-meta-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  font-size: 0.875rem;
  background: #f8fafc;
  padding: 1rem;
  border-radius: 8px;
}

.delivery-address-box,
.client-note-box {
  margin-top: 1rem;
  font-size: 0.875rem;
  background: #f1f5f9;
  padding: 0.75rem 1rem;
  border-radius: 6px;
}

.delivery-address-box p,
.client-note-box p {
  margin: 0.25rem 0 0;
}

.modal-table {
  width: 100%;
  border-collapse: collapse;
}

.modal-table th {
  padding: 0.6rem 0.75rem;
  background: #f8fafc;
  font-size: 0.75rem;
  text-transform: uppercase;
  color: var(--color-text-muted);
  border-bottom: 1px solid var(--color-border);
  text-align: left;
}

.modal-table td {
  padding: 0.75rem;
  border-bottom: 1px solid var(--color-border);
  font-size: 0.85rem;
}

.modal-totals {
  max-width: 300px;
  margin-left: auto;
  margin-top: 1rem;
  font-size: 0.9rem;
}

.modal-totals div {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.35rem;
}

.grand-total-row {
  font-weight: 700;
  color: var(--color-primary);
  border-top: 1px solid var(--color-border);
  padding-top: 0.5rem;
}

.history-list {
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: 0.85rem;
}

.history-list li {
  padding: 0.5rem 0;
  border-bottom: 1px solid #f1f5f9;
}

.history-status {
  font-weight: 600;
  margin-right: 0.5rem;
}

.history-time {
  color: var(--color-text-muted);
  font-size: 0.75rem;
  margin-right: 0.5rem;
}

.history-user {
  font-size: 0.75rem;
  color: var(--color-primary);
}

.history-note {
  font-size: 0.8rem;
  color: #475569;
  margin-top: 0.2rem;
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
}

.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--color-border);
  font-size: 0.875rem;
}
</style>

