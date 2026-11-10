<template>
  <div class="orders-management-page">
    <PageHeader
      title="Commandes B2B"
      subtitle="Suivi du flux des ventes, réservations de stock et préparation des colis"
    >
      <template #actions>
        <Button
          variant="secondary"
          size="dense"
          icon="rotate-ccw"
          :loading="orderStore.loading"
          @click="loadOrders(orderStore.meta.page)"
        >
          Actualiser
        </Button>
      </template>
    </PageHeader>

    <!-- Filters Bar -->
    <FilterBar
      :search="searchQuery"
      search-placeholder="Rechercher par N° commande, client..."
      :filters="statusFilterChips"
      :show-reset="Boolean(searchQuery || selectedStatus !== 'ALL')"
      @update:search="onSearchChange"
      @select-chip="setStatusFilter"
      @reset="resetFilters"
    />

    <!-- Main Orders Data Table -->
    <DataTable
      :columns="columns"
      :data="orderStore.orders"
      :loading="orderStore.loading"
      :error="tableError"
      :current-page="orderStore.meta.page"
      :total-pages="orderStore.meta.totalPages"
      :total-count="orderStore.meta.total"
      empty-title="Aucune commande trouvée"
      empty-message="Modifiez vos critères de recherche ou réinitialisez les filtres."
      empty-action-label="Réinitialiser les filtres"
      @page-change="changePage"
      @retry="loadOrders(1)"
      @empty-action="resetFilters"
    >
      <!-- Order Number & Origin Channel -->
      <template #cell-order_number="{ row }">
        <div class="order-id-cell">
          <span class="font-mono font-bold">{{ row.order_number }}</span>
          <Badge :tone="row.channel === 'STAFF' ? 'neutral' : 'brand'" size="sm">
            {{ row.channel === 'STAFF' ? 'Comptoir' : 'En ligne' }}
          </Badge>
        </div>
      </template>

      <!-- Date & Time -->
      <template #cell-created_at="{ row }">
        <div class="date-cell">
          <DateTime :value="row.created_at" format="date" />
          <span class="text-sub font-mono">{{ formatTime(row.created_at) }}</span>
        </div>
      </template>

      <!-- Client Details -->
      <template #cell-client="{ row }">
        <div class="client-cell">
          <span class="client-name font-semibold">{{ row.client_name }}</span>
          <span class="client-sub font-mono">{{ row.client_code }} • {{ row.client_wilaya || 'N/A' }}</span>
        </div>
      </template>

      <!-- Payment Method -->
      <template #cell-payment_method="{ row }">
        <Badge tone="neutral">
          {{ getPaymentLabel(row.payment_method) }}
        </Badge>
      </template>

      <!-- Fulfillment Type -->
      <template #cell-fulfillment_type="{ row }">
        <Badge :tone="row.fulfillment_type === 'DELIVERY' ? 'accent' : 'neutral'">
          {{ row.fulfillment_type === 'DELIVERY' ? 'Livraison' : 'Retrait' }}
        </Badge>
      </template>

      <!-- Total TTC -->
      <template #cell-total_ttc="{ row }">
        <Money :amount="row.total_ttc" class="font-bold price-highlight" />
      </template>

      <!-- Order Status Pill -->
      <template #cell-status="{ row }">
        <StatusPill :status="row.status" />
      </template>

      <!-- Row Actions -->
      <template #cell-actions="{ row }">
        <div class="row-actions">
          <!-- PENDING -> CONFIRMED (Reserves stock) -->
          <Button
            v-if="row.status === 'PENDING'"
            variant="primary"
            size="dense"
            :loading="processingId === row.id"
            @click.stop="transitionOrder(row, 'CONFIRMED')"
          >
            Confirmer
          </Button>

          <!-- CONFIRMED -> PREPARING -->
          <Button
            v-else-if="row.status === 'CONFIRMED'"
            variant="secondary"
            size="dense"
            :loading="processingId === row.id"
            @click.stop="transitionOrder(row, 'PREPARING')"
          >
            En préparation
          </Button>

          <!-- PREPARING -> READY -->
          <Button
            v-else-if="row.status === 'PREPARING'"
            variant="secondary"
            size="dense"
            :loading="processingId === row.id"
            @click.stop="transitionOrder(row, 'READY')"
          >
            Marquer prête
          </Button>

          <!-- READY -> DELIVERED (Commits stock sale) -->
          <Button
            v-else-if="row.status === 'READY'"
            variant="primary"
            size="dense"
            :loading="processingId === row.id"
            @click.stop="transitionOrder(row, 'DELIVERED')"
          >
            Livrer
          </Button>

          <!-- DELIVERED -> COMPLETED -->
          <Button
            v-else-if="row.status === 'DELIVERED'"
            variant="secondary"
            size="dense"
            :loading="processingId === row.id"
            @click.stop="transitionOrder(row, 'COMPLETED')"
          >
            Clôturer
          </Button>

          <!-- View Details Button -->
          <Button
            variant="ghost"
            size="dense"
            icon="eye"
            icon-only
            aria-label="Voir le détail"
            title="Voir le détail"
            @click.stop="openDetailsModal(row)"
          />

          <!-- Cancel Button with ConfirmDialog -->
          <Button
            v-if="['PENDING', 'CONFIRMED', 'PREPARING', 'READY'].includes(row.status)"
            variant="ghost"
            size="dense"
            icon="x"
            icon-only
            aria-label="Annuler la commande"
            title="Annuler la commande"
            class="action-cancel-btn"
            :disabled="processingId === row.id"
            @click.stop="openCancelModal(row)"
          />
        </div>
      </template>
    </DataTable>

    <!-- Order Detail Modal -->
    <Modal
      :open="Boolean(activeDetailOrder)"
      max-width="lg"
      :title="activeDetailOrder ? `Commande ${activeDetailOrder.order_number}` : ''"
      @close="activeDetailOrder = null"
    >
      <div v-if="activeDetailOrder" class="detail-container">
        <!-- Top Meta Banner -->
        <div class="detail-banner">
          <div class="detail-status">
            <StatusPill :status="activeDetailOrder.status" />
            <Badge :tone="activeDetailOrder.channel === 'STAFF' ? 'neutral' : 'brand'">
              {{ activeDetailOrder.channel === 'STAFF' ? 'Comptoir' : 'En ligne' }}
            </Badge>
          </div>
          <div class="detail-date text-muted">
            Créée le <DateTime :value="activeDetailOrder.created_at" />
          </div>
        </div>

        <!-- Client & Fulfillment Information -->
        <div class="detail-cards-grid">
          <div class="info-block">
            <div class="info-title">Client</div>
            <div class="info-row">
              <span class="info-label">Raison sociale :</span>
              <span class="info-val font-semibold">{{ activeDetailOrder.client_name }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Code compte :</span>
              <span class="info-val font-mono">{{ activeDetailOrder.client_code }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Téléphone :</span>
              <span class="info-val font-mono">{{ activeDetailOrder.client_phone || 'Non renseigné' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Wilaya :</span>
              <span class="info-val">{{ activeDetailOrder.client_wilaya || 'Non renseigné' }}</span>
            </div>
            <div v-if="activeDetailOrder.client_address" class="info-row">
              <span class="info-label">Adresse :</span>
              <span class="info-val">{{ activeDetailOrder.client_address }}</span>
            </div>
          </div>

          <div class="info-block">
            <div class="info-title">Modalités de commande</div>
            <div class="info-row">
              <span class="info-label">Règlement :</span>
              <span class="info-val">{{ getPaymentLabel(activeDetailOrder.payment_method) }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Mise à disposition :</span>
              <span class="info-val">{{ activeDetailOrder.fulfillment_type === 'DELIVERY' ? 'Livraison sur Chantier' : 'Retrait Magasin' }}</span>
            </div>
            <div v-if="activeDetailOrder.delivery_address" class="info-row">
              <span class="info-label">Adresse de livraison :</span>
              <span class="info-val">{{ activeDetailOrder.delivery_address }}</span>
            </div>
            <div v-if="activeDetailOrder.client_note" class="info-row">
              <span class="info-label">Note client :</span>
              <span class="info-val">{{ activeDetailOrder.client_note }}</span>
            </div>
          </div>
        </div>

        <!-- Articles Table -->
        <div class="items-section">
          <div class="section-title">Articles ({{ activeDetailOrder.items?.length || 0 }})</div>
          <div class="table-scroll-container">
            <table class="items-table">
              <thead>
                <tr>
                  <th>Désignation</th>
                  <th class="cell-num">Prix Unit. HT</th>
                  <th class="cell-num">Quantité</th>
                  <th class="cell-num">TVA</th>
                  <th class="cell-num">Total TTC</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="it in activeDetailOrder.items" :key="it.id">
                  <td>
                    <div class="font-semibold">{{ it.product_name }}</div>
                    <div class="text-muted font-mono font-xs">Réf: {{ it.reference }}</div>
                  </td>
                  <td class="cell-num font-mono">
                    <Money :amount="it.unit_price" />
                  </td>
                  <td class="cell-num font-mono">
                    {{ it.quantity }} {{ it.unit || 'U' }}
                  </td>
                  <td class="cell-num font-mono">
                    {{ it.tva }}%
                  </td>
                  <td class="cell-num font-mono font-bold">
                    <Money :amount="calculateLineTtc(it.unit_price, it.quantity, it.tva)" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="order-totals-box">
            <div class="totals-line">
              <span class="text-muted">Sous-total HT :</span>
              <Money :amount="activeDetailOrder.subtotal_ht" />
            </div>
            <div class="totals-line">
              <span class="text-muted">Total TVA (19%) :</span>
              <Money :amount="activeDetailOrder.total_tva" />
            </div>
            <div class="totals-line line-net font-bold">
              <span>Total net TTC :</span>
              <Money :amount="activeDetailOrder.total_ttc" class="price-brand" />
            </div>
          </div>
        </div>

        <!-- Order Timeline / History -->
        <div v-if="activeDetailOrder.history?.length" class="history-section">
          <div class="section-title">Historique d'avancement</div>
          <div class="timeline-list">
            <div v-for="(h, idx) in activeDetailOrder.history" :key="idx" class="timeline-item">
              <div class="timeline-dot" />
              <div class="timeline-body">
                <div class="timeline-header">
                  <StatusPill :status="h.status" />
                  <span class="timeline-time font-mono">
                    <DateTime :value="h.created_at" />
                  </span>
                  <span v-if="h.changed_by_name" class="timeline-user">par {{ h.changed_by_name }}</span>
                </div>
                <div v-if="h.note" class="timeline-note">{{ h.note }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <Button variant="secondary" size="dense" @click="activeDetailOrder = null">
          Fermer
        </Button>
      </template>
    </Modal>

    <!-- Cancellation Dialog with Mandatory Reason -->
    <ConfirmDialog
      :open="Boolean(orderToCancel)"
      title="Annuler la commande"
      :message="`La commande sera passée au statut ANNULÉE. Si du stock physique avait été réservé, il sera immédiatement restitué à l'inventaire disponible.`"
      :entity-name="orderToCancel?.order_number"
      require-reason
      confirm-label="Confirmer l'annulation"
      is-destructive
      :loading="processingId === orderToCancel?.id"
      @confirm="handleConfirmCancel"
      @cancel="orderToCancel = null"
    />

    <!-- Toast Notifications -->
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
import { useOrderStore, Order } from '../../stores/order.store';
import {
  PageHeader,
  FilterBar,
  DataTable,
  Button,
  StatusPill,
  Badge,
  Money,
  DateTime,
  Modal,
  ConfirmDialog,
  Toast,
  type TableColumn,
  type FilterChip,
} from '../../components/ui';

const orderStore = useOrderStore();

// Filter & Search states
const searchQuery = ref('');
const selectedStatus = ref('ALL');
const processingId = ref<number | null>(null);
const tableError = ref<string | null>(null);

// Modal states
const activeDetailOrder = ref<Order | null>(null);
const orderToCancel = ref<Order | null>(null);

// Toast notification state
const toastMessage = ref<string | null>(null);
const toastTone = ref<'success' | 'danger' | 'warning' | 'info'>('success');

function showToast(msg: string, tone: 'success' | 'danger' | 'warning' | 'info' = 'success') {
  toastMessage.value = msg;
  toastTone.value = tone;
  setTimeout(() => {
    if (toastMessage.value === msg) {
      toastMessage.value = null;
    }
  }, 4000);
}

// Columns definition for DataTable
const columns: TableColumn[] = [
  { key: 'order_number', label: 'N° commande', role: 'id', width: '160px', sortable: false },
  { key: 'created_at', label: 'Date', role: 'text', width: '140px' },
  { key: 'client', label: 'Client', role: 'text' },
  { key: 'payment_method', label: 'Règlement', role: 'text', width: '130px' },
  { key: 'fulfillment_type', label: 'Mise à disposition', role: 'text', width: '140px' },
  { key: 'total_ttc', label: 'Total TTC', role: 'numeric', width: '140px' },
  { key: 'status', label: 'Statut', role: 'status', width: '150px' },
  { key: 'actions', label: 'Actions', role: 'actions', width: '210px' },
];

// Status filters chips
const statusFilterChips = computed<FilterChip[]>(() => [
  { id: 'ALL', label: 'Toutes', active: selectedStatus.value === 'ALL' },
  { id: 'PENDING', label: 'En attente', active: selectedStatus.value === 'PENDING' },
  { id: 'CONFIRMED', label: 'Confirmées', active: selectedStatus.value === 'CONFIRMED' },
  { id: 'PREPARING', label: 'En préparation', active: selectedStatus.value === 'PREPARING' },
  { id: 'READY', label: 'Prêtes', active: selectedStatus.value === 'READY' },
  { id: 'DELIVERED', label: 'Livrées', active: selectedStatus.value === 'DELIVERED' },
  { id: 'CANCELLED', label: 'Annulées', active: selectedStatus.value === 'CANCELLED' },
]);

function getPaymentLabel(pm: string): string {
  switch (pm) {
    case 'ON_CREDIT': return 'À crédit';
    case 'CASH': return 'Espèces';
    case 'CHECK': return 'Chèque';
    case 'TRANSFER': return 'Virement';
    default: return pm || 'Non renseigné';
  }
}

function formatTime(iso: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function calculateLineTtc(price: number, qty: number, tva: number): number {
  const lineHt = Number(price || 0) * (qty || 1);
  return lineHt + (lineHt * Number(tva || 19)) / 100;
}

async function loadOrders(page = 1) {
  tableError.value = null;
  try {
    await orderStore.fetchAdminOrders({
      page,
      pageSize: 25,
      status: selectedStatus.value === 'ALL' ? undefined : selectedStatus.value,
      search: searchQuery.value || undefined,
    });
  } catch (err: any) {
    tableError.value = err.message || 'Impossible de charger la liste des commandes.';
  }
}

let searchDebounceTimer: any = null;
function onSearchChange(val: string) {
  searchQuery.value = val;
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    loadOrders(1);
  }, 300);
}

function setStatusFilter(statusId: string) {
  selectedStatus.value = statusId;
  loadOrders(1);
}

function resetFilters() {
  searchQuery.value = '';
  selectedStatus.value = 'ALL';
  loadOrders(1);
}

function changePage(page: number) {
  loadOrders(page);
}

async function transitionOrder(order: Order, nextStatus: string) {
  processingId.value = order.id;

  try {
    await orderStore.updateAdminOrderStatus(order.id, nextStatus, {
      note: `Statut passé à ${nextStatus} par le personnel`,
      visibleToClient: true,
    });
    showToast(`Commande ${order.order_number} mise à jour avec succès.`, 'success');
    await loadOrders(orderStore.meta.page);
  } catch (err: any) {
    showToast(err.message || 'Impossible de mettre à jour le statut.', 'danger');
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
    showToast('Impossible de charger le détail de la commande.', 'danger');
  }
}

function openCancelModal(order: Order) {
  orderToCancel.value = order;
}

async function handleConfirmCancel(reason: string) {
  if (!orderToCancel.value || !reason) return;
  const targetId = orderToCancel.value.id;
  const targetNum = orderToCancel.value.order_number;
  processingId.value = targetId;

  try {
    await orderStore.cancelAdminOrder(targetId, reason);
    orderToCancel.value = null;
    showToast(`Commande ${targetNum} annulée avec succès.`, 'warning');
    await loadOrders(orderStore.meta.page);
  } catch (err: any) {
    showToast(err.message || 'Erreur lors de l’annulation de la commande.', 'danger');
  } finally {
    processingId.value = null;
  }
}

onMounted(() => {
  loadOrders(1);
});
</script>

<style scoped>
.orders-management-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-4, 16px);
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.order-id-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: flex-start;
}

.date-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.text-sub {
  font-size: var(--font-size-xs, 12px);
  color: var(--color-text-muted);
}

.client-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
}

.client-name {
  color: var(--color-ink);
  font-size: var(--font-size-sm, 13px);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.client-sub {
  font-size: var(--font-size-xs, 12px);
  color: var(--color-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.price-highlight {
  color: var(--color-brand);
  font-size: var(--font-size-sm, 13px);
}

.row-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-2, 8px);
  white-space: nowrap;
}

.action-cancel-btn {
  color: var(--color-danger-text);
}

.action-cancel-btn:hover {
  background-color: var(--color-danger-subtle);
}

/* Detail Modal Styles */
.detail-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-4, 16px);
}

.detail-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-2, 8px);
  padding: var(--space-3, 12px) var(--space-4, 16px);
  border-radius: var(--radius-control);
  background: var(--color-subtle);
  border: 1px solid var(--color-line);
}

.detail-status {
  display: flex;
  align-items: center;
  gap: var(--space-2, 8px);
}

.detail-date {
  font-size: var(--font-size-xs, 12px);
}

.detail-cards-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3, 12px);
}

@media (max-width: 640px) {
  .detail-cards-grid {
    grid-template-columns: 1fr;
  }
}

.info-block {
  padding: var(--space-3, 12px);
  border-radius: var(--radius-control);
  border: 1px solid var(--color-line);
  background: var(--color-surface);
  display: flex;
  flex-direction: column;
  gap: var(--space-2, 8px);
}

.info-title {
  font-size: var(--font-size-sm, 13px);
  font-weight: 600;
  color: var(--color-ink);
  border-bottom: 1px solid var(--color-line);
  padding-bottom: var(--space-1, 4px);
}

.info-row {
  display: flex;
  justify-content: space-between;
  gap: var(--space-2, 8px);
  font-size: var(--font-size-xs, 12px);
}

.info-label {
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.info-val {
  color: var(--color-ink);
  text-align: right;
  word-break: break-word;
}

.items-section,
.history-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-2, 8px);
}

.section-title {
  font-size: var(--font-size-sm, 13px);
  font-weight: 600;
  color: var(--color-ink);
}

.table-scroll-container {
  overflow-x: auto;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-control);
}

.items-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-xs, 12px);
}

.items-table th {
  padding: var(--space-2, 8px) var(--space-3, 12px);
  background: var(--color-subtle);
  color: var(--color-text-muted);
  font-weight: 500;
  border-bottom: 1px solid var(--color-line);
  text-align: left;
}

.items-table td {
  padding: var(--space-2, 8px) var(--space-3, 12px);
  border-bottom: 1px solid var(--color-line);
  vertical-align: middle;
}

.items-table tr:last-child td {
  border-bottom: none;
}

.cell-num {
  text-align: right !important;
}

.font-xs {
  font-size: var(--font-size-xs, 12px);
}

.order-totals-box {
  display: flex;
  flex-direction: column;
  gap: var(--space-1, 4px);
  max-width: 300px;
  margin-inline-start: auto;
  padding: var(--space-3, 12px);
  background: var(--color-subtle);
  border-radius: var(--radius-control);
  border: 1px solid var(--color-line);
  font-size: var(--font-size-xs, 12px);
}

.totals-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.totals-line.line-net {
  font-size: var(--font-size-sm, 13px);
  border-top: 1px dashed var(--color-line);
  padding-top: var(--space-1, 4px);
  margin-top: var(--space-1, 4px);
}

.price-brand {
  color: var(--color-brand);
}

.timeline-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2, 8px);
  padding: var(--space-2, 8px) 0;
}

.timeline-item {
  display: flex;
  gap: var(--space-3, 12px);
  position: relative;
}

.timeline-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-brand);
  margin-top: 6px;
  flex-shrink: 0;
}

.timeline-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: var(--font-size-xs, 12px);
}

.timeline-header {
  display: flex;
  align-items: center;
  gap: var(--space-2, 8px);
  flex-wrap: wrap;
}

.timeline-time {
  color: var(--color-text-muted);
}

.timeline-user {
  color: var(--color-brand);
}

.timeline-note {
  color: var(--color-text-muted);
  font-style: italic;
}
</style>
