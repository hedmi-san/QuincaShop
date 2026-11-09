<template>
  <div class="admin-expenses-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Journal des Frais Généraux</h1>
        <p class="page-subtitle">Suivi des charges d'exploitation, loyer, carburant, fluides et entretien.</p>
      </div>
      <div class="header-actions">
        <button @click="openCreateModal" class="btn btn-primary">
          + Nouvelle Dépense
        </button>
      </div>
    </div>

    <!-- Summary Metrics -->
    <div class="metrics-grid">
      <div class="metric-card">
        <span class="metric-lbl">Total des Charges (Sélection)</span>
        <span class="metric-val text-danger">
          {{ formatCurrency(erpStore.expenseSummary.totalAmount) }}
        </span>
        <span class="metric-sub">{{ erpStore.expenseSummary.totalCount }} dépense(s) comptabilisée(s)</span>
      </div>

      <div
        v-for="cat in topCategories"
        :key="cat.category"
        class="metric-card cat-card"
      >
        <span class="metric-lbl">{{ getCategoryLabel(cat.category) }}</span>
        <span class="metric-val">
          {{ formatCurrency(cat.amount) }}
        </span>
        <span class="metric-sub">{{ cat.count }} opération(s)</span>
      </div>
    </div>

    <!-- Filters Bar -->
    <div class="filters-card">
      <div class="filter-inputs">
        <div class="filter-group">
          <label>Catégorie :</label>
          <select v-model="selectedCategory" class="form-control" @change="handleFilter">
            <option value="ALL">Toutes les catégories</option>
            <option v-for="c in validCategories" :key="c" :value="c">
              {{ getCategoryLabel(c) }}
            </option>
          </select>
        </div>

        <div class="filter-group">
          <label>Du :</label>
          <input type="date" v-model="fromDate" class="form-control" @change="handleFilter" />
        </div>

        <div class="filter-group">
          <label>Au :</label>
          <input type="date" v-model="toDate" class="form-control" @change="handleFilter" />
        </div>

        <div class="filter-group search-group">
          <label>Recherche libellé :</label>
          <input
            type="text"
            v-model="searchQuery"
            placeholder="Ex: Facture Sonelgaz, Vidange..."
            class="form-control"
            @keyup.enter="handleFilter"
          />
        </div>
      </div>

      <button class="btn btn-secondary btn-reset" @click="resetFilters">Réinitialiser</button>
    </div>

    <!-- Expenses Table Card -->
    <div class="expenses-card">
      <div v-if="erpStore.loading" class="loading-state">
        <div class="spinner"></div>
        <p>Chargement des dépenses...</p>
      </div>

      <div v-else-if="erpStore.expenses.length === 0" class="empty-state">
        <div class="empty-icon">🧾</div>
        <h3>Aucune dépense enregistrée</h3>
        <p>Aucune charge ne correspond aux critères sélectionnés.</p>
      </div>

      <div v-else class="table-responsive">
        <table class="expenses-table">
          <thead>
            <tr>
              <th style="width: 110px;">Date</th>
              <th style="width: 150px;">Catégorie</th>
              <th>Description / Justificatif</th>
              <th class="text-right" style="width: 150px;">Montant (DZD)</th>
              <th style="width: 130px;">Enregistré par</th>
              <th style="width: 110px; text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="exp in erpStore.expenses" :key="exp.id">
              <td class="date-cell">{{ formatDate(exp.expense_date) }}</td>
              <td>
                <span :class="['cat-badge', `cat-${exp.category.toLowerCase()}`]">
                  {{ getCategoryLabel(exp.category) }}
                </span>
              </td>
              <td class="desc-cell">{{ exp.description || '-' }}</td>
              <td class="text-right font-weight-bold price-cell">
                {{ formatCurrency(exp.amount) }}
              </td>
              <td class="user-cell">{{ exp.created_by_name || 'Admin' }}</td>
              <td class="text-right">
                <div class="action-btn-group">
                  <button @click="openEditModal(exp)" class="btn btn-sm btn-ghost" title="Modifier">
                    ✏️
                  </button>
                  <button @click="handleDelete(exp.id)" class="btn btn-sm btn-ghost text-danger" title="Supprimer">
                    🗑️
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="tfoot-totals">
              <td colspan="3" class="text-right font-weight-bold">Total des Dépenses Sélectionnées :</td>
              <td class="text-right font-weight-bold total-amount">
                {{ formatCurrency(erpStore.expenseSummary.totalAmount) }}
              </td>
              <td colspan="2"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="erpStore.expenseMeta.totalPages > 1" class="pagination">
        <button
          class="btn btn-sm"
          :disabled="erpStore.expenseMeta.page <= 1"
          @click="changePage(erpStore.expenseMeta.page - 1)"
        >
          ← Précédent
        </button>
        <span>Page {{ erpStore.expenseMeta.page }} sur {{ erpStore.expenseMeta.totalPages }}</span>
        <button
          class="btn btn-sm"
          :disabled="erpStore.expenseMeta.page >= erpStore.expenseMeta.totalPages"
          @click="changePage(erpStore.expenseMeta.page + 1)"
        >
          Suivant →
        </button>
      </div>
    </div>

    <!-- Add/Edit Expense Modal -->
    <div v-if="showModal" class="modal-backdrop" @click.self="showModal = false">
      <div class="modal-dialog">
        <div class="modal-header">
          <h3>{{ editingId ? 'Modifier la Dépense' : 'Enregistrer une Dépense' }}</h3>
          <button @click="showModal = false" class="modal-close">✕</button>
        </div>
        <form @submit.prevent="handleSubmit" class="modal-body">
          <div class="form-group">
            <label>Catégorie de Charge *</label>
            <select v-model="form.category" class="form-control" required>
              <option v-for="c in validCategories" :key="c" :value="c">
                {{ getCategoryLabel(c) }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>Montant TTC (DZD) *</label>
            <input
              type="number"
              step="0.01"
              min="1"
              v-model.number="form.amount"
              required
              placeholder="Ex: 25000.00"
              class="form-control"
            />
          </div>

          <div class="form-group">
            <label>Date de la dépense *</label>
            <input
              type="date"
              v-model="form.expenseDate"
              required
              class="form-control"
            />
          </div>

          <div class="form-group">
            <label>Libellé / Justificatif / Détail</label>
            <textarea
              v-model="form.description"
              rows="2"
              placeholder="Ex: Quittance Sonelgaz Q3-2026, Facture loyer hangar..."
              class="form-control"
            ></textarea>
          </div>

          <div v-if="formError" class="alert alert-danger">{{ formError }}</div>

          <div class="modal-footer">
            <button type="button" @click="showModal = false" class="btn btn-secondary">Annuler</button>
            <button type="submit" class="btn btn-primary" :disabled="submitting">
              <span v-if="submitting">Enregistrement...</span>
              <span v-else>{{ editingId ? 'Mettre à jour' : 'Enregistrer la charge' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useErpStore, ExpenseItem } from '../../stores/erp.store';
import { formatCurrency, formatDate } from '../../utils/formatters';

const erpStore = useErpStore();

const validCategories = [
  'ELECTRICITY',
  'WATER',
  'RENT',
  'FUEL',
  'MAINTENANCE',
  'TRANSPORTATION',
  'SUPPLIES',
  'OTHER',
];

const selectedCategory = ref('ALL');
const fromDate = ref('');
const toDate = ref('');
const searchQuery = ref('');

const showModal = ref(false);
const editingId = ref<number | null>(null);
const submitting = ref(false);
const formError = ref<string | null>(null);

const form = ref({
  category: 'ELECTRICITY',
  amount: undefined as number | undefined,
  expenseDate: new Date().toISOString().substring(0, 10),
  description: '',
});

const topCategories = computed(() => {
  return erpStore.expenseSummary.categories.slice(0, 3);
});

function getCategoryLabel(cat: string): string {
  switch (cat) {
    case 'ELECTRICITY': return 'Électricité (Sonelgaz)';
    case 'WATER': return 'Eau (Seaal)';
    case 'RENT': return 'Loyer Hangar / Dépôt';
    case 'FUEL': return 'Carburant / Naftal';
    case 'MAINTENANCE': return 'Maintenance & Réparations';
    case 'TRANSPORTATION': return 'Transport & Déplacements';
    case 'SUPPLIES': return 'Fournitures Bureau & Magasin';
    case 'OTHER': return 'Autre Dépense';
    default: return cat;
  }
}

async function loadExpenses(page = 1) {
  await erpStore.fetchExpenses({
    page,
    category: selectedCategory.value === 'ALL' ? undefined : selectedCategory.value,
    fromDate: fromDate.value || undefined,
    toDate: toDate.value || undefined,
    search: searchQuery.value || undefined,
  });
}

function handleFilter() {
  loadExpenses(1);
}

function resetFilters() {
  selectedCategory.value = 'ALL';
  fromDate.value = '';
  toDate.value = '';
  searchQuery.value = '';
  loadExpenses(1);
}

function changePage(p: number) {
  loadExpenses(p);
}

function openCreateModal() {
  editingId.value = null;
  form.value = {
    category: 'ELECTRICITY',
    amount: undefined,
    expenseDate: new Date().toISOString().substring(0, 10),
    description: '',
  };
  formError.value = null;
  showModal.value = true;
}

function openEditModal(exp: ExpenseItem) {
  editingId.value = exp.id;
  form.value = {
    category: exp.category,
    amount: Number(exp.amount),
    expenseDate: new Date(exp.expense_date).toISOString().substring(0, 10),
    description: exp.description || '',
  };
  formError.value = null;
  showModal.value = true;
}

async function handleSubmit() {
  if (!form.value.amount || form.value.amount <= 0) return;
  formError.value = null;
  submitting.value = true;

  try {
    if (editingId.value) {
      await erpStore.updateExpense(editingId.value, {
        category: form.value.category,
        amount: form.value.amount,
        expenseDate: form.value.expenseDate,
        description: form.value.description,
      });
    } else {
      await erpStore.createExpense({
        category: form.value.category,
        amount: form.value.amount,
        expenseDate: form.value.expenseDate,
        description: form.value.description || undefined,
      });
    }
    showModal.value = false;
    await loadExpenses(erpStore.expenseMeta.page);
  } catch (err: any) {
    formError.value = err.message || 'Impossible d’enregistrer la dépense.';
  } finally {
    submitting.value = false;
  }
}

async function handleDelete(id: number) {
  if (confirm('Voulez-vous supprimer cette écriture de dépense ?')) {
    try {
      await erpStore.deleteExpense(id);
      await loadExpenses(erpStore.expenseMeta.page);
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la suppression.');
    }
  }
}

onMounted(() => {
  loadExpenses();
});
</script>

<style scoped>
.admin-expenses-page {
  padding: 1.5rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
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

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
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
  font-size: 1.65rem;
  font-weight: 700;
  margin: 0.25rem 0;
  display: block;
}

.metric-sub {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.text-danger { color: #ef4444; }

.filters-card {
  background: white;
  border-radius: 12px;
  border: 1px solid var(--color-border);
  padding: 1.25rem;
  margin-bottom: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 1rem;
}

.filter-inputs {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.filter-group label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-muted);
}

.search-group {
  min-width: 240px;
}

.btn-reset {
  margin-bottom: 1px;
}

.expenses-card {
  background: white;
  border-radius: 12px;
  border: 1px solid var(--color-border);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.expenses-table {
  width: 100%;
  border-collapse: collapse;
}

.expenses-table th {
  padding: 0.875rem 1rem;
  background: #f8fafc;
  font-size: 0.8rem;
  text-transform: uppercase;
  color: var(--color-text-muted);
  border-bottom: 1px solid var(--color-border);
  text-align: left;
}

.expenses-table td {
  padding: 0.875rem 1rem;
  border-bottom: 1px solid var(--color-border);
  font-size: 0.875rem;
  vertical-align: middle;
}

.date-cell {
  color: var(--color-text-muted);
  font-size: 0.8rem;
}

.cat-badge {
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 600;
  background: #f1f5f9;
  color: #475569;
}

.price-cell {
  color: #b91c1c;
  font-size: 0.95rem;
}

.user-cell {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.action-btn-group {
  display: flex;
  justify-content: flex-end;
  gap: 0.25rem;
}

.btn-ghost {
  background: transparent;
  border: none;
  font-size: 1rem;
  cursor: pointer;
  padding: 3px 6px;
  border-radius: 4px;
}

.btn-ghost:hover {
  background: #f1f5f9;
}

.tfoot-totals td {
  background: #f8fafc;
  border-top: 2px solid var(--color-border);
  padding: 1rem;
}

.total-amount {
  color: #b91c1c;
  font-size: 1.15rem;
}

.text-right { text-align: right; }
.font-weight-bold { font-weight: 700; }

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

