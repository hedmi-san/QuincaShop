<template>
  <div class="factures-page">
    <div class="container">
      <div class="page-header">
        <div>
          <nav class="breadcrumb">
            <router-link to="/">Accueil</router-link>
            <span>/</span>
            <span class="active">Mes Factures</span>
          </nav>
          <h1 class="page-title">Mes Factures & Documents Fiscaux</h1>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-card">
        <div class="search-box">
          <input
            type="text"
            v-model="searchQuery"
            placeholder="Rechercher par N° Facture ou Commande..."
            class="form-control"
            @keyup.enter="handleSearch"
          />
        </div>
        <div class="type-tabs">
          <button
            v-for="t in typeFilters"
            :key="t.value"
            :class="['type-tab', { active: selectedType === t.value }]"
            @click="setTypeFilter(t.value)"
          >
            {{ t.label }}
          </button>
        </div>
      </div>

      <!-- Loading / Empty / Invoices Table -->
      <div v-if="financeStore.loading" class="loading-state">
        <div class="spinner"></div>
        <p>Chargement de vos documents fiscaux...</p>
      </div>

      <div v-else-if="financeStore.factures.length === 0" class="empty-state">
        <div class="empty-icon">📄</div>
        <h3>Aucune facture trouvée</h3>
        <p>Aucun document fiscal n'a encore été émis pour vos commandes.</p>
      </div>

      <div v-else class="factures-card">
        <div class="table-responsive">
          <table class="factures-table">
            <thead>
              <tr>
                <th>N° Document</th>
                <th>Type</th>
                <th>Date d'émission</th>
                <th>Commande</th>
                <th>Montant HT</th>
                <th>TVA</th>
                <th>Timbre</th>
                <th>Total TTC</th>
                <th>Statut</th>
                <th style="width: 140px;"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="f in financeStore.factures" :key="f.id">
                <td class="font-weight-bold doc-num">
                  {{ f.facture_number }}
                </td>
                <td>
                  <span class="doc-badge">{{ getDocTypeLabel(f.doc_type) }}</span>
                </td>
                <td>{{ formatDate(f.created_at) }}</td>
                <td>
                  <router-link :to="`/portal/orders/${f.order_id}`" class="order-link">
                    {{ f.order_number }}
                  </router-link>
                </td>
                <td>{{ formatCurrency(f.total_ht) }}</td>
                <td>{{ formatCurrency(f.total_tva) }}</td>
                <td>{{ f.timbre > 0 ? formatCurrency(f.timbre) : '-' }}</td>
                <td class="font-weight-bold price-cell">
                  {{ formatCurrency(f.total_ttc) }}
                </td>
                <td>
                  <span :class="['status-badge', f.status === 'ISSUED' ? 'status-issued' : 'status-voided']">
                    {{ f.status === 'ISSUED' ? 'Valide' : 'Annulée' }}
                  </span>
                </td>
                <td class="text-right">
                  <router-link :to="`/portal/me/factures/${f.id}`" class="btn btn-sm btn-outline">
                    Consulter →
                  </router-link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div v-if="financeStore.meta.totalPages > 1" class="pagination">
          <button
            class="btn btn-sm"
            :disabled="financeStore.meta.page <= 1"
            @click="changePage(financeStore.meta.page - 1)"
          >
            ← Précédent
          </button>
          <span>Page {{ financeStore.meta.page }} sur {{ financeStore.meta.totalPages }}</span>
          <button
            class="btn btn-sm"
            :disabled="financeStore.meta.page >= financeStore.meta.totalPages"
            @click="changePage(financeStore.meta.page + 1)"
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
import { useFinanceStore } from '../../stores/finance.store';
import { formatCurrency, formatDate } from '../../utils/formatters';

const financeStore = useFinanceStore();
const searchQuery = ref('');
const selectedType = ref('ALL');

const typeFilters = [
  { value: 'ALL', label: 'Tous' },
  { value: 'FACTURE', label: 'Factures Fiscales' },
  { value: 'BON_LIVRAISON', label: 'Bons de Livraison' },
  { value: 'PROFORMA', label: 'Factures Proforma' },
];

function getDocTypeLabel(type: string): string {
  switch (type) {
    case 'FACTURE': return 'Facture Fiscale';
    case 'BON_LIVRAISON': return 'Bon de Livraison';
    case 'PROFORMA': return 'Proforma';
    default: return type;
  }
}

async function loadFactures(page = 1) {
  await financeStore.fetchMyFactures({
    page,
    docType: selectedType.value === 'ALL' ? undefined : selectedType.value,
    search: searchQuery.value || undefined,
  });
}

function handleSearch() {
  loadFactures(1);
}

function setTypeFilter(t: string) {
  selectedType.value = t;
  loadFactures(1);
}

function changePage(p: number) {
  loadFactures(p);
}

onMounted(() => {
  loadFactures();
});
</script>

<style scoped>
.factures-page {
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

.search-box {
  max-width: 340px;
  width: 100%;
}

.type-tabs {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.type-tab {
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

.type-tab.active {
  background: var(--color-primary);
  color: white;
}

.factures-card {
  background: white;
  border-radius: 12px;
  border: 1px solid var(--color-border);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.factures-table {
  width: 100%;
  border-collapse: collapse;
}

.factures-table th {
  padding: 0.875rem 1rem;
  background: #f8fafc;
  font-size: 0.8rem;
  text-transform: uppercase;
  color: var(--color-text-muted);
  border-bottom: 1px solid var(--color-border);
  text-align: left;
}

.factures-table td {
  padding: 1rem;
  border-bottom: 1px solid var(--color-border);
  font-size: 0.875rem;
  vertical-align: middle;
}

.font-weight-bold {
  font-weight: 600;
}

.doc-num {
  color: var(--color-text);
}

.doc-badge {
  background: #f1f5f9;
  color: #475569;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.775rem;
  font-weight: 500;
}

.order-link {
  color: var(--color-primary);
  text-decoration: none;
  font-weight: 500;
}

.order-link:hover {
  text-decoration: underline;
}

.price-cell {
  color: var(--color-primary);
  font-size: 0.95rem;
}

.status-badge {
  padding: 3px 8px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
}

.status-issued { background: #dcfce7; color: #15803d; }
.status-voided { background: #fee2e2; color: #b91c1c; }

.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--color-border);
  font-size: 0.875rem;
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
</style>

