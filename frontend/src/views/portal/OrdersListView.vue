<template>
  <div class="orders-page">
    <div class="container">
      <div class="page-header">
        <div>
          <nav class="breadcrumb">
            <router-link to="/">Accueil</router-link>
            <span>/</span>
            <span class="active">Mes Commandes</span>
          </nav>
          <h1 class="page-title">Historique de mes Commandes</h1>
        </div>
        <router-link to="/catalog" class="btn btn-primary">
          Nouvelle Commande →
        </router-link>
      </div>

      <!-- Filters & Search -->
      <div class="filters-card">
        <div class="search-input-wrapper">
          <input
            type="text"
            v-model="searchQuery"
            placeholder="Rechercher par N° de commande..."
            class="form-control"
            @keyup.enter="handleSearch"
          />
        </div>
        <div class="status-tabs">
          <button
            v-for="st in statusFilters"
            :key="st.value"
            :class="['status-tab', { active: selectedStatus === st.value }]"
            @click="setStatusFilter(st.value)"
          >
            {{ st.label }}
          </button>
        </div>
      </div>

      <!-- Loading / Empty / Orders Table -->
      <div v-if="orderStore.loading" class="loading-state">
        <div class="spinner"></div>
        <p>Chargement de vos commandes...</p>
      </div>

      <div v-else-if="orderStore.orders.length === 0" class="empty-state">
        <div class="empty-icon">📦</div>
        <h3>Aucune commande trouvée</h3>
        <p>Vous n'avez pas encore passé de commande ou aucun résultat ne correspond aux filtres.</p>
        <router-link to="/catalog" class="btn btn-primary">Explorer le Catalogue</router-link>
      </div>

      <div v-else class="orders-card">
        <div class="table-responsive">
          <table class="orders-table">
            <thead>
              <tr>
                <th>N° Commande</th>
                <th>Date</th>
                <th>Articles</th>
                <th>Mise à disposition</th>
                <th>Total TTC</th>
                <th>Statut</th>
                <th style="width: 120px;"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="order in orderStore.orders" :key="order.id">
                <td class="font-weight-bold">
                  {{ order.order_number }}
                </td>
                <td>{{ formatDate(order.created_at) }}</td>
                <td>{{ order.items_count || 1 }} article(s)</td>
                <td>
                  <span class="fulfillment-badge">
                    {{ order.fulfillment_type === 'DELIVERY' ? 'Livraison' : 'Retrait Magasin' }}
                  </span>
                </td>
                <td class="font-weight-bold price-cell">
                  {{ formatCurrency(order.total_ttc) }}
                </td>
                <td>
                  <span :class="['status-badge', `status-${order.status.toLowerCase()}`]">
                    {{ getStatusLabel(order.status) }}
                  </span>
                </td>
                <td class="text-right">
                  <router-link :to="`/portal/orders/${order.id}`" class="btn btn-sm btn-outline">
                    Suivre →
                  </router-link>
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useOrderStore } from '../../stores/order.store';
import { formatCurrency, formatDate } from '../../utils/formatters';

const orderStore = useOrderStore();
const searchQuery = ref('');
const selectedStatus = ref('ALL');

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
    case 'CONFIRMED': return 'Confirmée';
    case 'PREPARING': return 'En Préparation';
    case 'READY': return 'Prête';
    case 'DELIVERED': return 'Livrée';
    case 'COMPLETED': return 'Clôturée';
    case 'CANCELLED': return 'Annulée';
    case 'REJECTED': return 'Refusée';
    default: return status;
  }
}

async function loadOrders(page = 1) {
  await orderStore.fetchPortalOrders({
    page,
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

onMounted(() => {
  loadOrders();
});
</script>

<style scoped>
.orders-page {
  padding: 2rem 0 4rem;
  background-color: var(--color-bg);
  min-height: calc(100vh - 160px);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
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

.page-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
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

.search-input-wrapper {
  max-width: 320px;
  width: 100%;
}

.status-tabs {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.status-tab {
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

.status-tab.active {
  background: var(--color-primary);
  color: white;
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  background: white;
  border-radius: 12px;
  border: 1px solid var(--color-border);
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
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
  padding: 0.875rem 1.25rem;
  background: #f8fafc;
  font-size: 0.8rem;
  text-transform: uppercase;
  color: var(--color-text-muted);
  border-bottom: 1px solid var(--color-border);
  text-align: left;
}

.orders-table td {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--color-border);
  font-size: 0.9rem;
  vertical-align: middle;
}

.font-weight-bold {
  font-weight: 600;
}

.fulfillment-badge {
  font-size: 0.8rem;
  color: #475569;
  background: #f1f5f9;
  padding: 3px 8px;
  border-radius: 4px;
}

.price-cell {
  color: var(--color-primary);
}

.status-badge {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.775rem;
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

.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--color-border);
  font-size: 0.875rem;
}
</style>

