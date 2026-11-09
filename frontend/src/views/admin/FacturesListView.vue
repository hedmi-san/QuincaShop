<template>
  <div class="admin-factures-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Facturation & Documents Fiscaux</h1>
        <p class="page-subtitle">Gestion des factures certified, bons de livraison, proformas et droits de timbre fiscal.</p>
      </div>
      <div class="header-actions">
        <button @click="showCreateModal = true" class="btn btn-primary">
          + Émettre une Facture
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters-card">
      <div class="search-box">
        <input
          type="text"
          v-model="searchQuery"
          placeholder="Rechercher N° Facture, Client, N° Commande..."
          class="form-control"
          @keyup.enter="handleSearch"
        />
        <button class="btn btn-secondary" @click="handleSearch">Rechercher</button>
      </div>

      <div class="filter-pills">
        <button
          v-for="t in typeFilters"
          :key="t.value"
          :class="['filter-pill', { active: selectedType === t.value }]"
          @click="setTypeFilter(t.value)"
        >
          {{ t.label }}
        </button>
      </div>
    </div>

    <!-- Factures Table -->
    <div class="factures-card">
      <div v-if="financeStore.loading" class="loading-state">
        <div class="spinner"></div>
        <p>Chargement des documents...</p>
      </div>

      <div v-else-if="financeStore.factures.length === 0" class="empty-state">
        <div class="empty-icon">📁</div>
        <h3>Aucun document fiscal trouvé</h3>
        <p>Ajustez vos filtres ou émettez une nouvelle facture depuis une commande.</p>
      </div>

      <div v-else class="table-responsive">
        <table class="factures-table">
          <thead>
            <tr>
              <th>N° Document</th>
              <th>Type</th>
              <th>Date</th>
              <th>Client</th>
              <th>Commande</th>
              <th>Règlement</th>
              <th>Montant HT</th>
              <th>Timbre</th>
              <th>Total TTC</th>
              <th>Statut</th>
              <th style="min-width: 160px;">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="f in financeStore.factures" :key="f.id">
              <td class="font-weight-bold doc-num">
                {{ f.facture_number }}
              </td>
              <td>
                <span class="type-badge">{{ getDocTypeLabel(f.doc_type) }}</span>
              </td>
              <td>{{ formatDate(f.created_at) }}</td>
              <td>
                <div class="client-name">{{ f.client_name }}</div>
                <div class="client-code">{{ f.client_code }}</div>
              </td>
              <td>
                <span class="order-badge">{{ f.order_number }}</span>
              </td>
              <td>
                <span class="pay-badge">{{ getPaymentLabel(f.payment_mode) }}</span>
              </td>
              <td>{{ formatCurrency(f.total_ht) }}</td>
              <td>{{ f.timbre > 0 ? formatCurrency(f.timbre) : '-' }}</td>
              <td class="price-cell font-weight-bold">
                {{ formatCurrency(f.total_ttc) }}
              </td>
              <td>
                <span :class="['status-badge', f.status === 'ISSUED' ? 'status-issued' : 'status-voided']">
                  {{ f.status === 'ISSUED' ? 'Valide' : 'Annulée' }}
                </span>
              </td>
              <td>
                <div class="action-btn-group">
                  <router-link :to="`/portal/me/factures/${f.id}`" class="btn btn-sm btn-outline">
                    👁️ Voir / Imprimer
                  </router-link>
                  <button
                    v-if="f.status === 'ISSUED'"
                    @click="openVoidModal(f)"
                    class="btn btn-sm btn-outline-danger"
                    title="Annuler cette facture"
                  >
                    Annuler
                  </button>
                </div>
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

    <!-- Create Facture Modal -->
    <div v-if="showCreateModal" class="modal-backdrop" @click.self="showCreateModal = false">
      <div class="modal-dialog">
        <div class="modal-header">
          <h3>Émettre un Document Fiscal</h3>
          <button @click="showCreateModal = false" class="modal-close">✕</button>
        </div>
        <form @submit.prevent="handleCreateFacture" class="modal-body">
          <div class="form-group">
            <label>ID de la Commande *</label>
            <input
              type="number"
              v-model.number="createForm.orderId"
              required
              placeholder="Ex: 5"
              class="form-control"
            />
            <small class="text-muted">Numéro ID de la commande dans le système</small>
          </div>

          <div class="form-group">
            <label>Type de document fiscal *</label>
            <select v-model="createForm.docType" class="form-control">
              <option value="FACTURE">Facture Fiscale Officielle</option>
              <option value="BON_LIVRAISON">Bon de Livraison (BL)</option>
              <option value="PROFORMA">Facture Proforma</option>
            </select>
          </div>

          <div class="form-group">
            <label>Mode de règlement *</label>
            <select v-model="createForm.paymentMode" class="form-control">
              <option value="ON_CREDIT">À Crédit (Encours client)</option>
              <option value="ESPECE">Espèces (Soumis au droit de timbre fiscal 1%)</option>
              <option value="CHEQUE">Chèque</option>
              <option value="VIREMENT">Virement Bancaire</option>
            </select>
          </div>

          <div class="form-group">
            <label>Mode de Transport (optionnel)</label>
            <input
              type="text"
              v-model="createForm.transportMode"
              placeholder="Ex: Camionnette, Retrait Comptoir..."
              class="form-control"
            />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Matricule Camion</label>
              <input type="text" v-model="createForm.truckNumber" placeholder="01234-116-16" class="form-control" />
            </div>
            <div class="form-group">
              <label>Nom du Chauffeur</label>
              <input type="text" v-model="createForm.driverName" placeholder="M. Haddad" class="form-control" />
            </div>
          </div>

          <div v-if="createError" class="alert alert-danger">{{ createError }}</div>

          <div class="modal-footer">
            <button type="button" @click="showCreateModal = false" class="btn btn-secondary">Annuler</button>
            <button type="submit" class="btn btn-primary" :disabled="submitting">
              <span v-if="submitting">Émission en cours...</span>
              <span v-else>Valider & Émettre</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Void Modal -->
    <div v-if="factureToVoid" class="modal-backdrop" @click.self="factureToVoid = null">
      <div class="modal-dialog">
        <div class="modal-header">
          <h3>Annuler la Facture {{ factureToVoid.facture_number }}</h3>
          <button @click="factureToVoid = null" class="modal-close">✕</button>
        </div>
        <div class="modal-body">
          <p>
            Conformément à la législation algérienne, les factures ne peuvent pas être effacées. L'annulation marquera le document comme <strong>ANNULÉ</strong> et émettra automatiquement un <strong>Avoir (Crédit)</strong> dans le sous-livre client.
          </p>
          <div class="form-group">
            <label>Motif obligatoire d'annulation :</label>
            <input
              type="text"
              v-model="voidReasonInput"
              placeholder="Ex: Erreur de raison sociale, remplacée par FAC-2026-..."
              class="form-control"
              required
            />
          </div>
          <div v-if="voidError" class="alert alert-danger">{{ voidError }}</div>
        </div>
        <div class="modal-footer">
          <button @click="factureToVoid = null" class="btn btn-secondary">Conserver la facture</button>
          <button
            @click="handleConfirmVoid"
            class="btn btn-danger"
            :disabled="!voidReasonInput.trim() || submitting"
          >
            <span v-if="submitting">Annulation...</span>
            <span v-else>Confirmer l'Annulation</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useFinanceStore, Facture } from '../../stores/finance.store';
import { formatCurrency, formatDate } from '../../utils/formatters';

const router = useRouter();
const financeStore = useFinanceStore();

const searchQuery = ref('');
const selectedType = ref('ALL');

const showCreateModal = ref(false);
const submitting = ref(false);
const createError = ref<string | null>(null);

const createForm = ref({
  orderId: undefined as number | undefined,
  docType: 'FACTURE' as 'FACTURE' | 'PROFORMA' | 'BON_LIVRAISON',
  paymentMode: 'ON_CREDIT',
  transportMode: 'CAMIONNETTE',
  truckNumber: '',
  driverName: '',
});

const factureToVoid = ref<Facture | null>(null);
const voidReasonInput = ref('');
const voidError = ref<string | null>(null);

const typeFilters = [
  { value: 'ALL', label: 'Toutes' },
  { value: 'FACTURE', label: 'Factures Fiscales' },
  { value: 'BON_LIVRAISON', label: 'Bons de Livraison' },
  { value: 'PROFORMA', label: 'Proformas' },
];

function getDocTypeLabel(type: string): string {
  switch (type) {
    case 'FACTURE': return 'Facture';
    case 'BON_LIVRAISON': return 'B.L.';
    case 'PROFORMA': return 'Proforma';
    default: return type;
  }
}

function getPaymentLabel(mode: string): string {
  switch (mode) {
    case 'ESPECE':
    case 'CASH': return 'Espèces';
    case 'CHEQUE':
    case 'CHECK': return 'Chèque';
    case 'VIREMENT':
    case 'TRANSFER': return 'Virement';
    case 'ON_CREDIT':
    case 'A_CREDIT': return 'À Crédit';
    default: return mode;
  }
}

async function loadFactures(page = 1) {
  await financeStore.fetchAdminFactures({
    page,
    pageSize: 25,
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

async function handleCreateFacture() {
  if (!createForm.value.orderId) return;
  createError.value = null;
  submitting.value = true;

  try {
    const doc = await financeStore.createFactureFromOrder(createForm.value.orderId, {
      docType: createForm.value.docType,
      paymentMode: createForm.value.paymentMode,
      transportMode: createForm.value.transportMode || undefined,
      truckNumber: createForm.value.truckNumber || undefined,
      driverName: createForm.value.driverName || undefined,
    });
    showCreateModal.value = false;
    await loadFactures(1);
    router.push(`/portal/me/factures/${doc.id}`);
  } catch (err: any) {
    createError.value = err.message || 'Impossible d’émettre le document.';
  } finally {
    submitting.value = false;
  }
}

function openVoidModal(f: Facture) {
  factureToVoid.value = f;
  voidReasonInput.value = '';
  voidError.value = null;
}

async function handleConfirmVoid() {
  if (!factureToVoid.value || !voidReasonInput.value.trim()) return;
  voidError.value = null;
  submitting.value = true;

  try {
    await financeStore.voidFacture(factureToVoid.value.id, voidReasonInput.value.trim());
    factureToVoid.value = null;
    await loadFactures(financeStore.meta.page);
  } catch (err: any) {
    voidError.value = err.message || 'Erreur lors de l’annulation.';
  } finally {
    submitting.value = false;
  }
}

onMounted(() => {
  loadFactures();
});
</script>

<style scoped>
.admin-factures-page {
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

.filter-pills {
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

.type-badge {
  background: #f1f5f9;
  color: #475569;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.775rem;
  font-weight: 600;
}

.client-name {
  font-weight: 600;
  color: var(--color-text);
}

.client-code {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.order-badge {
  font-family: monospace;
  font-size: 0.8rem;
  color: #2563eb;
}

.pay-badge {
  font-size: 0.775rem;
  color: #64748b;
  background: #f8fafc;
  padding: 2px 6px;
  border-radius: 4px;
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

.action-btn-group {
  display: flex;
  gap: 0.5rem;
}

.btn-outline-danger {
  border: 1px solid #ef4444;
  color: #ef4444;
  background: transparent;
}

.btn-outline-danger:hover {
  background: #fef2f2;
}

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
  max-width: 520px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
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

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
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
  padding: 0.75rem 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
  margin-top: 1rem;
}
</style>

