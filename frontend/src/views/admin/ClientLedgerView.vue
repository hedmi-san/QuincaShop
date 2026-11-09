<template>
  <div class="client-ledger-page">
    <div class="page-header">
      <div>
        <nav class="breadcrumb">
          <router-link to="/admin/clients/pending">Clients</router-link>
          <span>/</span>
          <span class="active">Grand Livre Client</span>
        </nav>
        <h1 class="page-title">
          Grand Livre : {{ financeStore.ledger.client?.name || 'Client' }}
        </h1>
        <p class="page-subtitle">
          Code : <strong>{{ financeStore.ledger.client?.code || 'N/A' }}</strong> •
          Statut : <span class="status-pill">{{ financeStore.ledger.client?.status || 'N/A' }}</span>
        </p>
      </div>

      <div class="header-actions">
        <button @click="showPaymentModal = true" class="btn btn-primary">
          + Enregistrer un Versement
        </button>
        <button @click="handlePrint" class="btn btn-outline">
          🖨️ Imprimer le Relevé
        </button>
      </div>
    </div>

    <!-- Metrics Bar -->
    <div class="metrics-grid">
      <div class="metric-card">
        <span class="metric-lbl">Encours Actuel (Solde Dû)</span>
        <span class="metric-val text-danger">
          {{ formatCurrency(financeStore.ledger.summary.currentBalance) }}
        </span>
        <span class="metric-desc">Total créance commerciale en cours</span>
      </div>

      <div class="metric-card">
        <span class="metric-lbl">Plafond de Crédit Accordé</span>
        <span class="metric-val">
          {{ formatCurrency(financeStore.ledger.summary.creditLimit) }}
        </span>
        <span class="metric-desc">Plafond maximum autorisé</span>
      </div>

      <div class="metric-card">
        <span class="metric-lbl">Crédit Restant Disponible</span>
        <span class="metric-val text-success">
          {{ formatCurrency(financeStore.ledger.summary.availableCredit) }}
        </span>
        <span class="metric-desc">Marge restante pour commandes à crédit</span>
      </div>
    </div>

    <!-- Ledger Table Card -->
    <div class="ledger-card">
      <div class="card-header no-print">
        <h3>Historique des Écritures Comptables (Double-Colonne)</h3>
        <div class="filters-row">
          <select v-model="filterType" class="form-control" @change="applyFilters">
            <option value="ALL">Toutes les opérations</option>
            <option value="INVOICE">Factures (Débit)</option>
            <option value="PAYMENT">Versements (Crédit)</option>
            <option value="CREDIT_NOTE">Avoirs (Crédit)</option>
          </select>
        </div>
      </div>

      <div v-if="financeStore.loading" class="loading-state">
        <div class="spinner"></div>
        <p>Chargement du compte client...</p>
      </div>

      <div v-else-if="financeStore.ledger.transactions.length === 0" class="empty-state">
        <div class="empty-icon">📊</div>
        <h3>Aucune écriture comptable</h3>
        <p>Ce client ne dispose d'aucune transaction financière enregistrée.</p>
      </div>

      <div v-else class="table-responsive">
        <table class="ledger-table">
          <thead>
            <tr>
              <th style="width: 110px;">Date</th>
              <th>Description / Libellé de l'Opération</th>
              <th style="width: 100px;">Type</th>
              <th class="text-right" style="width: 140px;">Débit (DZD)</th>
              <th class="text-right" style="width: 140px;">Crédit (DZD)</th>
              <th class="text-right" style="width: 150px;">Solde Progressif</th>
              <th style="width: 120px;">Par</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in financeStore.ledger.transactions" :key="t.id">
              <td class="date-cell">{{ formatDate(t.transactionDate) }}</td>
              <td class="desc-cell">{{ t.description }}</td>
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
              <td class="user-cell">{{ t.createdByName || 'Système' }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="tfoot-totals">
              <td colspan="3" class="text-right font-weight-bold">Totaux des Mouvements :</td>
              <td class="text-right font-weight-bold text-danger">
                {{ formatCurrency(financeStore.ledger.summary.totalDebits) }}
              </td>
              <td class="text-right font-weight-bold text-success">
                {{ formatCurrency(financeStore.ledger.summary.totalCredits) }}
              </td>
              <td class="text-right font-weight-bold total-balance">
                {{ formatCurrency(financeStore.ledger.summary.currentBalance) }}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <!-- Record Payment Modal -->
    <div v-if="showPaymentModal" class="modal-backdrop" @click.self="showPaymentModal = false">
      <div class="modal-dialog">
        <div class="modal-header">
          <h3>Enregistrer un Versement Client</h3>
          <button @click="showPaymentModal = false" class="modal-close">✕</button>
        </div>
        <form @submit.prevent="handleRecordPayment" class="modal-body">
          <div class="form-group">
            <label>Montant du règlement (DZD) *</label>
            <input
              type="number"
              step="0.01"
              min="1"
              v-model.number="paymentForm.amount"
              required
              placeholder="Ex: 50000.00"
              class="form-control"
            />
          </div>

          <div class="form-group">
            <label>Mode de règlement *</label>
            <select v-model="paymentForm.method" class="form-control">
              <option value="CASH">Espèces (Versement direct caisse)</option>
              <option value="CHECK">Chèque Bancaire</option>
              <option value="TRANSFER">Virement Bancaire</option>
            </select>
          </div>

          <div class="form-group">
            <label>Référence / N° Chèque / Bordereau</label>
            <input
              type="text"
              v-model="paymentForm.reference"
              placeholder="Ex: CHQ-BNA-8829103"
              class="form-control"
            />
          </div>

          <div class="form-group">
            <label>Date de l'encaissement</label>
            <input
              type="date"
              v-model="paymentForm.paymentDate"
              class="form-control"
            />
          </div>

          <div v-if="paymentError" class="alert alert-danger">{{ paymentError }}</div>

          <div class="modal-footer">
            <button type="button" @click="showPaymentModal = false" class="btn btn-secondary">Annuler</button>
            <button type="submit" class="btn btn-primary" :disabled="submitting">
              <span v-if="submitting">Enregistrement...</span>
              <span v-else>Valider l'Encaissement</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useFinanceStore } from '../../stores/finance.store';
import { formatCurrency, formatDate } from '../../utils/formatters';

const route = useRoute();
const financeStore = useFinanceStore();

const filterType = ref('ALL');
const showPaymentModal = ref(false);
const submitting = ref(false);
const paymentError = ref<string | null>(null);

const paymentForm = ref({
  amount: undefined as number | undefined,
  method: 'CASH' as 'CASH' | 'CHECK' | 'TRANSFER',
  reference: '',
  paymentDate: new Date().toISOString().substring(0, 10),
});

const clientId = ref(parseInt(route.params.id as string, 10));

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

async function loadLedger() {
  if (isNaN(clientId.value)) return;
  await financeStore.fetchClientLedger(clientId.value, {
    type: filterType.value === 'ALL' ? undefined : filterType.value,
  });
}

function applyFilters() {
  loadLedger();
}

function handlePrint() {
  window.print();
}

async function handleRecordPayment() {
  if (!paymentForm.value.amount || paymentForm.value.amount <= 0) return;
  paymentError.value = null;
  submitting.value = true;

  try {
    await financeStore.recordClientPayment(clientId.value, {
      amount: paymentForm.value.amount,
      method: paymentForm.value.method,
      reference: paymentForm.value.reference || undefined,
      paymentDate: paymentForm.value.paymentDate || undefined,
    });
    showPaymentModal.value = false;
    paymentForm.value.amount = undefined;
    paymentForm.value.reference = '';
    await loadLedger();
  } catch (err: any) {
    paymentError.value = err.message || 'Impossible d’enregistrer le versement.';
  } finally {
    submitting.value = false;
  }
}

onMounted(() => {
  loadLedger();
});
</script>

<style scoped>
.client-ledger-page {
  padding: 1.5rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.breadcrumb {
  display: flex;
  gap: 0.5rem;
  font-size: 0.825rem;
  color: var(--color-text-muted);
  margin-bottom: 0.35rem;
}

.breadcrumb a {
  color: var(--color-primary);
  text-decoration: none;
}

.page-title {
  font-size: 1.65rem;
  font-weight: 700;
  margin: 0;
}

.page-subtitle {
  color: var(--color-text-muted);
  font-size: 0.875rem;
  margin: 0.25rem 0 0;
}

.status-pill {
  background: #dcfce7;
  color: #15803d;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.75rem;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
}

/* Metrics */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1.25rem;
  margin-bottom: 1.5rem;
}

.metric-card {
  background: white;
  border-radius: 12px;
  border: 1px solid var(--color-border);
  padding: 1.25rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.metric-lbl {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  font-weight: 500;
}

.metric-val {
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0.25rem 0;
  display: block;
}

.metric-desc {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.text-danger { color: #ef4444; }
.text-success { color: #10b981; }

/* Ledger Card */
.ledger-card {
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
  padding: 1.25rem;
  border-bottom: 1px solid var(--color-border);
}

.card-header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.ledger-table {
  width: 100%;
  border-collapse: collapse;
}

.ledger-table th {
  padding: 0.875rem 1rem;
  background: #f8fafc;
  font-size: 0.8rem;
  text-transform: uppercase;
  color: var(--color-text-muted);
  border-bottom: 1px solid var(--color-border);
  text-align: left;
}

.ledger-table td {
  padding: 0.875rem 1rem;
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

.debit-cell { color: #b91c1c; font-weight: 600; }
.credit-cell { color: #15803d; font-weight: 600; }
.balance-cell { color: var(--color-primary); font-size: 0.95rem; }
.user-cell { font-size: 0.8rem; color: var(--color-text-muted); }

.tfoot-totals td {
  background: #f8fafc;
  border-top: 2px solid var(--color-border);
  padding: 1rem;
}

.total-balance {
  color: var(--color-primary);
  font-size: 1.1rem;
}

.text-right { text-align: right; }
.font-weight-bold { font-weight: 700; }

.loading-state,
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
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
  max-width: 480px;
  width: 90%;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--color-border);
}

.modal-header h3 {
  margin: 0;
  font-size: 1.2rem;
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

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  font-size: 0.825rem;
  font-weight: 600;
  margin-bottom: 0.35rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.alert-danger {
  background: #fee2e2;
  border: 1px solid #fecaca;
  color: #991b1b;
  padding: 0.75rem;
  border-radius: 6px;
  font-size: 0.85rem;
  margin-top: 1rem;
}
</style>

