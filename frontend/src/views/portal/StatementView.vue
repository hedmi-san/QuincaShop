<template>
  <div class="statement-page">
    <div class="container">
      <!-- Breadcrumb & Header -->
      <div class="page-header no-print">
        <div>
          <nav class="breadcrumb">
            <router-link to="/">Accueil</router-link>
            <span>/</span>
            <span class="active">Extrait de Compte</span>
          </nav>
          <h1 class="page-title">Extrait de Compte & Situation Financière</h1>
        </div>
        <div class="header-actions">
          <button @click="handlePrint" class="btn btn-outline">
            🖨️ Imprimer l'Extrait
          </button>
        </div>
      </div>

      <!-- Financial Metric Cards -->
      <div class="metrics-grid">
        <div class="metric-card">
          <span class="metric-label">Solde Débiteur Actuel</span>
          <span class="metric-value text-primary">
            {{ formatCurrency(financeStore.ledger.summary.currentBalance) }}
          </span>
          <span class="metric-sub">Montant restant dû à la SARL</span>
        </div>

        <div class="metric-card">
          <span class="metric-label">Plafond de Crédit Accordé</span>
          <span class="metric-value">
            {{ formatCurrency(financeStore.ledger.summary.creditLimit) }}
          </span>
          <span class="metric-sub">Limite autorisée par la direction</span>
        </div>

        <div class="metric-card">
          <span class="metric-label">Crédit Restant Disponible</span>
          <span class="metric-value text-success">
            {{ formatCurrency(financeStore.ledger.summary.availableCredit) }}
          </span>
          <span class="metric-sub">Capacité d'achat à crédit résiduelle</span>
        </div>
      </div>

      <!-- Filters (No Print) -->
      <div class="filters-card no-print">
        <div class="filter-group">
          <label>Période du :</label>
          <input type="date" v-model="filterFrom" class="form-control" @change="applyFilters" />
        </div>
        <div class="filter-group">
          <label>Au :</label>
          <input type="date" v-model="filterTo" class="form-control" @change="applyFilters" />
        </div>
        <div class="filter-group">
          <label>Type d'opération :</label>
          <select v-model="filterType" class="form-control" @change="applyFilters">
            <option value="ALL">Toutes les opérations</option>
            <option value="INVOICE">Factures (Débit)</option>
            <option value="PAYMENT">Règlements / Versements (Crédit)</option>
            <option value="CREDIT_NOTE">Avoirs (Crédit)</option>
          </select>
        </div>
        <button class="btn btn-secondary btn-reset" @click="resetFilters">Réinitialiser</button>
      </div>

      <!-- Official Print Header (Only visible on print) -->
      <div class="print-header only-print">
        <div class="print-brand">
          <h2>SARL OUTILLAGE INDUSTRIEL ALGÉRIE</h2>
          <p>Zone Industrielle Oued Smar, Alger • Tél: +213 (0) 23 92 11 22</p>
          <p>RC: 16/00-0123456B16 • NIF: 001616012345678 • NIS: 001616010012345</p>
        </div>
        <div class="print-client">
          <h3>EXTRAIT DE COMPTE CLIENT</h3>
          <p><strong>Client :</strong> {{ financeStore.ledger.client?.name }} ({{ financeStore.ledger.client?.code }})</p>
          <p><strong>Date d'édition :</strong> {{ new Date().toLocaleDateString('fr-FR') }}</p>
        </div>
      </div>

      <!-- Statement Table -->
      <div class="statement-card">
        <div v-if="financeStore.loading" class="loading-state">
          <div class="spinner"></div>
          <p>Chargement des écritures comptables...</p>
        </div>

        <div v-else-if="financeStore.ledger.transactions.length === 0" class="empty-state">
          <div class="empty-icon">📊</div>
          <h3>Aucune opération enregistrée</h3>
          <p>Aucune écriture comptable n'a été trouvée pour la période sélectionnée.</p>
        </div>

        <div v-else class="table-responsive">
          <table class="ledger-table">
            <thead>
              <tr>
                <th style="width: 110px;">Date</th>
                <th>Description de l'Opération</th>
                <th style="width: 100px;">Réf. Type</th>
                <th class="text-right" style="width: 140px;">Débit (DZD)</th>
                <th class="text-right" style="width: 140px;">Crédit (DZD)</th>
                <th class="text-right" style="width: 150px;">Solde Progressif</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="t in financeStore.ledger.transactions" :key="t.id">
                <td class="date-cell">{{ formatDate(t.transactionDate) }}</td>
                <td class="desc-cell">
                  <span class="tx-desc">{{ t.description }}</span>
                </td>
                <td>
                  <span :class="['type-tag', `tag-${t.type.toLowerCase()}`]">
                    {{ getTypeLabel(t.type) }}
                  </span>
                </td>
                <td class="text-right debit-cell">
                  <span v-if="t.debit > 0">{{ formatCurrency(t.debit) }}</span>
                  <span v-else class="text-muted">-</span>
                </td>
                <td class="text-right credit-cell">
                  <span v-if="t.credit > 0">{{ formatCurrency(t.credit) }}</span>
                  <span v-else class="text-muted">-</span>
                </td>
                <td class="text-right font-weight-bold balance-cell">
                  {{ formatCurrency(t.runningBalance) }}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="tfoot-totals">
                <td colspan="3" class="text-right font-weight-bold">Totaux de la Période :</td>
                <td class="text-right font-weight-bold text-danger">
                  {{ formatCurrency(financeStore.ledger.summary.totalDebits) }}
                </td>
                <td class="text-right font-weight-bold text-success">
                  {{ formatCurrency(financeStore.ledger.summary.totalCredits) }}
                </td>
                <td class="text-right font-weight-bold total-balance">
                  {{ formatCurrency(financeStore.ledger.summary.currentBalance) }}
                </td>
              </tr>
            </tfoot>
          </table>
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

const filterFrom = ref('');
const filterTo = ref('');
const filterType = ref('ALL');

function getTypeLabel(type: string): string {
  switch (type) {
    case 'INVOICE': return 'Facture';
    case 'PAYMENT': return 'Règlement';
    case 'CREDIT_NOTE': return 'Avoir';
    case 'REFUND': return 'Remboursement';
    case 'ADJUSTMENT': return 'Ajustement';
    default: return type;
  }
}

async function loadStatement() {
  await financeStore.fetchMyStatement({
    fromDate: filterFrom.value || undefined,
    toDate: filterTo.value || undefined,
    type: filterType.value === 'ALL' ? undefined : filterType.value,
  });
}

function applyFilters() {
  loadStatement();
}

function resetFilters() {
  filterFrom.value = '';
  filterTo.value = '';
  filterType.value = 'ALL';
  loadStatement();
}

function handlePrint() {
  window.print();
}

onMounted(() => {
  loadStatement();
});
</script>

<style scoped>
.statement-page {
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

/* Metric Cards */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.metric-card {
  background: white;
  border-radius: 12px;
  border: 1px solid var(--color-border);
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
}

.metric-label {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  font-weight: 500;
}

.metric-value {
  font-size: 1.85rem;
  font-weight: 700;
  margin: 0.35rem 0;
  color: var(--color-text);
}

.metric-sub {
  font-size: 0.775rem;
  color: var(--color-text-muted);
}

.text-primary {
  color: var(--color-primary);
}

.text-success {
  color: #10b981;
}

.text-danger {
  color: #ef4444;
}

/* Filters */
.filters-card {
  background: white;
  border-radius: 12px;
  border: 1px solid var(--color-border);
  padding: 1.25rem 1.5rem;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: flex-end;
  gap: 1.25rem;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.filter-group label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-muted);
}

.form-control {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 0.875rem;
}

.btn-reset {
  margin-bottom: 1px;
}

/* Statement Card */
.statement-card {
  background: white;
  border-radius: 12px;
  border: 1px solid var(--color-border);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.ledger-table {
  width: 100%;
  border-collapse: collapse;
}

.ledger-table th {
  padding: 0.875rem 1.25rem;
  background: #f8fafc;
  font-size: 0.8rem;
  text-transform: uppercase;
  color: var(--color-text-muted);
  border-bottom: 1px solid var(--color-border);
  text-align: left;
}

.ledger-table td {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--color-border);
  font-size: 0.875rem;
  vertical-align: middle;
}

.date-cell {
  color: var(--color-text-muted);
  font-size: 0.8rem;
}

.desc-cell {
  font-weight: 500;
}

.type-tag {
  font-size: 0.725rem;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 600;
  text-transform: uppercase;
}

.tag-invoice { background: #fee2e2; color: #b91c1c; }
.tag-payment { background: #dcfce7; color: #15803d; }
.tag-credit_note { background: #dbeafe; color: #1e40af; }
.tag-adjustment { background: #fef3c7; color: #b45309; }

.debit-cell {
  color: #b91c1c;
  font-weight: 600;
}

.credit-cell {
  color: #15803d;
  font-weight: 600;
}

.balance-cell {
  color: var(--color-primary);
  font-size: 0.95rem;
}

.tfoot-totals td {
  background: #f8fafc;
  border-top: 2px solid var(--color-border);
  padding: 1rem 1.25rem;
}

.total-balance {
  color: var(--color-primary);
  font-size: 1.1rem;
}

.text-right {
  text-align: right;
}

.font-weight-bold {
  font-weight: 700;
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

/* Print Only Styles */
.only-print {
  display: none;
}

@media print {
  .no-print {
    display: none !important;
  }

  .only-print {
    display: block !important;
  }

  .statement-page {
    background: white;
    padding: 0;
  }

  .print-header {
    margin-bottom: 2rem;
    border-bottom: 2px solid #000;
    padding-bottom: 1rem;
    display: flex;
    justify-content: space-between;
  }

  .print-brand h2 {
    margin: 0 0 0.25rem;
    font-size: 1.2rem;
  }

  .print-brand p,
  .print-client p {
    margin: 0.15rem 0;
    font-size: 0.85rem;
  }

  .metrics-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .statement-card {
    border: none;
    box-shadow: none;
  }

  .ledger-table th,
  .ledger-table td {
    padding: 0.5rem 0.75rem;
    font-size: 0.8rem;
  }
}
</style>

