<template>
  <div class="pending-clients-view">
    <!-- Top Page Bar -->
    <div class="page-top-bar">
      <div>
        <h1 class="view-title">File d'Attente d'Agrément & Annuaire Clients B2B</h1>
        <p class="view-subtitle">
          Examinez les dossiers d'inscription, vérifiez les registres de commerce (RC/NIF) et attribuez les codes clients et plafonds de crédit.
        </p>
      </div>
    </div>

    <!-- Status Filter Tabs & Search -->
    <div class="filter-bar">
      <div class="status-tabs">
        <button
          class="tab-btn"
          :class="{ active: statusFilter === 'PENDING' }"
          @click="setStatusFilter('PENDING')"
        >
          ⏳ En Attente
          <span class="tab-count warn">{{ counts.pending_count }}</span>
        </button>

        <button
          class="tab-btn"
          :class="{ active: statusFilter === 'ACTIVE' }"
          @click="setStatusFilter('ACTIVE')"
        >
          ✅ Actifs
          <span class="tab-count success">{{ counts.active_count }}</span>
        </button>

        <button
          class="tab-btn"
          :class="{ active: statusFilter === 'REJECTED' }"
          @click="setStatusFilter('REJECTED')"
        >
          ❌ Rejetés
          <span class="tab-count danger">{{ counts.rejected_count }}</span>
        </button>

        <button
          class="tab-btn"
          :class="{ active: statusFilter === 'SUSPENDED' }"
          @click="setStatusFilter('SUSPENDED')"
        >
          ⛔ Suspendus
          <span class="tab-count">{{ counts.suspended_count }}</span>
        </button>

        <button
          class="tab-btn"
          :class="{ active: statusFilter === 'ALL' }"
          @click="setStatusFilter('ALL')"
        >
          Tous
        </button>
      </div>

      <div class="search-box">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Rechercher société, code, téléphone, wilaya..."
          class="search-input"
          @input="onSearchInput"
        />
      </div>
    </div>

    <!-- Feedback Toast -->
    <div v-if="feedbackMsg" class="feedback-banner" :class="feedbackType">
      <span>{{ feedbackMsg }}</span>
      <button class="close-btn" @click="feedbackMsg = ''">✕</button>
    </div>

    <!-- Table Card -->
    <div class="table-card">
      <div v-if="loading" class="table-loading">
        Chargement des dossiers clients...
      </div>

      <div v-else-if="clients.length === 0" class="table-empty">
        Aucun dossier client dans cet état.
      </div>

      <table v-else class="data-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Société / Code</th>
            <th>Responsable & Contact</th>
            <th>Wilaya</th>
            <th>Identifiants (RC / NIF)</th>
            <th>Documents Fournis</th>
            <th>Statut</th>
            <th class="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in clients" :key="c.id" class="client-row" @click="openReviewDrawer(c)">
            <td class="mono-sm">{{ formatDate(c.created_at) }}</td>
            <td>
              <div class="company-name">{{ c.name }}</div>
              <div v-if="c.code" class="client-code-pill">{{ c.code }}</div>
              <div v-else class="no-code">Non attribué</div>
            </td>
            <td>
              <div class="contact-name">{{ c.contact_person || c.user_full_name || '-' }}</div>
              <div class="contact-sub">{{ c.phone || '-' }} • {{ c.email || c.user_email || '' }}</div>
            </td>
            <td>{{ c.wilaya || '-' }}</td>
            <td class="mono-sm">
              <div>RC: {{ c.rc || '-' }}</div>
              <div>NIF: {{ c.nif || '-' }}</div>
            </td>
            <td @click.stop>
              <div v-if="c.documents && c.documents.length > 0" class="doc-badges">
                <a
                  v-for="doc in c.documents"
                  :key="doc.id"
                  :href="doc.file_url"
                  target="_blank"
                  rel="noopener"
                  class="doc-pill"
                  title="Cliquer pour visualiser"
                >
                  📎 {{ doc.doc_type }} ↗
                </a>
              </div>
              <span v-else class="text-muted">Aucune pièce</span>
            </td>
            <td>
              <span class="status-badge" :class="c.status.toLowerCase()">
                {{ c.status }}
              </span>
              <div v-if="c.status === 'ACTIVE'" class="credit-sub">
                Plafond: {{ formatCurrency(c.credit_limit) }}
              </div>
            </td>
            <td class="actions-cell" @click.stop>
              <template v-if="authStore.isAdmin">
                <button
                  v-if="c.status === 'PENDING' || c.status === 'REJECTED'"
                  class="btn-action approve"
                  @click="openApproveModal(c)"
                >
                  ✓ Valider
                </button>
                <button
                  v-if="c.status === 'PENDING'"
                  class="btn-action reject"
                  @click="openReasonModal(c, 'REJECT')"
                >
                  ✕ Rejeter
                </button>
                <button
                  v-if="c.status === 'ACTIVE' && !c.is_default"
                  class="btn-action suspend"
                  @click="openReasonModal(c, 'SUSPEND')"
                >
                  Suspendre
                </button>
                <button
                  v-if="c.status === 'SUSPENDED'"
                  class="btn-action approve"
                  @click="handleReactivate(c)"
                >
                  Réactiver
                </button>
              </template>
              <button class="btn-action outline" @click="goToDetail(c.id)">
                Fiche →
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Review Drawer Modal -->
    <div v-if="reviewClient" class="modal-backdrop" @click.self="reviewClient = null">
      <div class="drawer-panel">
        <div class="drawer-header">
          <div>
            <span class="status-badge" :class="reviewClient.status.toLowerCase()">
              {{ reviewClient.status }}
            </span>
            <h2 class="drawer-title">{{ reviewClient.name }}</h2>
          </div>
          <button class="close-btn" @click="reviewClient = null">✕</button>
        </div>

        <div class="drawer-body">
          <div class="drawer-section">
            <h4>Identité Commerciale & Fiscale</h4>
            <div class="kv-grid">
              <div><label>Code Client :</label> <strong>{{ reviewClient.code || 'En attente' }}</strong></div>
              <div><label>Responsable :</label> <span>{{ reviewClient.contact_person || '-' }}</span></div>
              <div><label>Téléphone :</label> <span>{{ reviewClient.phone || '-' }}</span></div>
              <div><label>Email :</label> <span>{{ reviewClient.email || reviewClient.user_email || '-' }}</span></div>
              <div><label>Wilaya :</label> <span>{{ reviewClient.wilaya || '-' }}</span></div>
              <div><label>Adresse :</label> <span>{{ reviewClient.address || '-' }}</span></div>
              <div><label>Activité :</label> <span>{{ reviewClient.activite || '-' }}</span></div>
              <div><label>N° RC :</label> <span class="mono-sm">{{ reviewClient.rc || '-' }}</span></div>
              <div><label>N° NIF :</label> <span class="mono-sm">{{ reviewClient.nif || '-' }}</span></div>
              <div><label>N° ART / NIS :</label> <span class="mono-sm">{{ reviewClient.art || '-' }} / {{ reviewClient.nis || '-' }}</span></div>
            </div>
          </div>

          <div class="drawer-section">
            <h4>Documents Scannés ({{ reviewClient.documents?.length || 0 }})</h4>
            <div v-if="reviewClient.documents && reviewClient.documents.length > 0" class="drawer-docs">
              <div v-for="doc in reviewClient.documents" :key="doc.id" class="drawer-doc-card">
                <div class="drawer-doc-info">
                  <strong>{{ doc.doc_type }}</strong>
                  <span>{{ formatDate(doc.uploaded_at) }}</span>
                </div>
                <a :href="doc.file_url" target="_blank" rel="noopener" class="btn-action outline">
                  Ouvrir le scan ↗
                </a>
              </div>
            </div>
            <p v-else class="text-muted">Aucun document numérique téléversé par le client.</p>
          </div>
        </div>

        <div v-if="authStore.isAdmin" class="drawer-footer">
          <button
            v-if="reviewClient.status === 'PENDING' || reviewClient.status === 'REJECTED'"
            class="btn-modal-primary"
            @click="openApproveModal(reviewClient)"
          >
            ✓ Valider le Compte & Attribuer Code
          </button>
          <button
            v-if="reviewClient.status === 'PENDING'"
            class="btn-modal-danger"
            @click="openReasonModal(reviewClient, 'REJECT')"
          >
            ✕ Rejeter la Demande
          </button>
        </div>
      </div>
    </div>

    <!-- 1-Click Approve Modal -->
    <div v-if="approvingClient" class="modal-backdrop" @click.self="approvingClient = null">
      <div class="modal-box">
        <h3 class="modal-title">Valider le Compte Professionnel</h3>
        <p class="modal-desc">
          Vous êtes sur le point d'activer les accès tarifaires B2B pour <strong>{{ approvingClient.name }}</strong>.
        </p>

        <form @submit.prevent="confirmApprove" class="modal-form">
          <div class="form-group">
            <label class="form-label">Code Client Attribué (Séquence officielle)</label>
            <input
              v-model="approveForm.code"
              type="text"
              required
              placeholder="CLT-0002"
              class="form-input mono"
            />
          </div>

          <div class="form-group">
            <label class="form-label">Plafond de Crédit Autorisé (DZD)</label>
            <input
              v-model.number="approveForm.creditLimit"
              type="number"
              min="0"
              step="1000"
              required
              class="form-input"
            />
            <small class="field-hint">Mettre 0 DZD pour exiger un règlement au comptant uniquement.</small>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn-cancel" @click="approvingClient = null">
              Annuler
            </button>
            <button type="submit" class="btn-modal-primary" :disabled="submitting">
              {{ submitting ? 'Activation...' : '✓ Confirmer & Activer le Compte' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Reject / Suspend Modal -->
    <div v-if="reasonModal.client" class="modal-backdrop" @click.self="reasonModal.client = null">
      <div class="modal-box">
        <h3 class="modal-title">
          {{ reasonModal.mode === 'REJECT' ? 'Rejeter la Demande d’Agrément' : 'Suspendre le Compte Client' }}
        </h3>
        <p class="modal-desc">
          Veuillez indiquer le motif qui sera notifié à <strong>{{ reasonModal.client.name }}</strong> :
        </p>

        <form @submit.prevent="confirmReasonAction" class="modal-form">
          <div class="form-group">
            <label class="form-label">Motif explicatif *</label>
            <textarea
              v-model="reasonModal.reason"
              rows="3"
              required
              minlength="3"
              placeholder="Ex: Copie du Registre de Commerce illisible ou numéro NIF manquant..."
              class="form-input"
            ></textarea>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn-cancel" @click="reasonModal.client = null">
              Annuler
            </button>
            <button type="submit" class="btn-modal-danger" :disabled="submitting">
              {{ submitting ? 'Traitement...' : 'Confirmer' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import api from '../../services/api';
import { useAuthStore } from '../../stores/auth.store';
import { formatCurrency, formatDate } from '../../utils/formatters';

const router = useRouter();
const authStore = useAuthStore();

const clients = ref<any[]>([]);
const loading = ref(false);
const statusFilter = ref('PENDING');
const searchQuery = ref('');
const counts = reactive({
  pending_count: 0,
  active_count: 0,
  rejected_count: 0,
  suspended_count: 0,
});

const reviewClient = ref<any | null>(null);
const approvingClient = ref<any | null>(null);
const approveForm = reactive({
  code: '',
  creditLimit: 200000,
});

const reasonModal = reactive({
  client: null as any | null,
  mode: 'REJECT' as 'REJECT' | 'SUSPEND',
  reason: '',
});

const submitting = ref(false);
const feedbackMsg = ref('');
const feedbackType = ref<'success' | 'error'>('success');
let debounceTimer: any = null;

onMounted(() => {
  fetchClients();
});

async function fetchClients() {
  loading.value = true;
  try {
    const res = await api.get('/admin/clients', {
      params: {
        status: statusFilter.value,
        search: searchQuery.value.trim() || undefined,
      },
    });
    clients.value = res.data.data || [];
    if (res.data.meta?.counts) {
      Object.assign(counts, res.data.meta.counts);
    }
  } catch (err) {
    console.error('Failed to fetch clients', err);
  } finally {
    loading.value = false;
  }
}

function setStatusFilter(status: string) {
  statusFilter.value = status;
  fetchClients();
}

function onSearchInput() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    fetchClients();
  }, 300);
}

function openReviewDrawer(client: any) {
  reviewClient.value = client;
}

async function openApproveModal(client: any) {
  reviewClient.value = null;
  approvingClient.value = client;
  approveForm.creditLimit = Number(client.credit_limit || 200000);

  if (client.code) {
    approveForm.code = client.code;
  } else {
    try {
      const res = await api.get('/admin/clients/next-code');
      approveForm.code = res.data.data?.nextCode || '';
    } catch {
      approveForm.code = '';
    }
  }
}

async function confirmApprove() {
  if (!approvingClient.value) return;
  submitting.value = true;
  try {
    const res = await api.patch(`/admin/clients/${approvingClient.value.id}/approve`, {
      code: approveForm.code.trim() || undefined,
      creditLimit: Number(approveForm.creditLimit),
    });
    feedbackType.value = 'success';
    feedbackMsg.value = `✅ Le compte "${approvingClient.value.name}" a été activé avec le code ${res.data.data.code}.`;
    approvingClient.value = null;
    await fetchClients();
  } catch (err: any) {
    feedbackType.value = 'error';
    feedbackMsg.value = err.response?.data?.error?.message || 'Erreur lors de la validation';
  } finally {
    submitting.value = false;
  }
}

function openReasonModal(client: any, mode: 'REJECT' | 'SUSPEND') {
  reviewClient.value = null;
  reasonModal.client = client;
  reasonModal.mode = mode;
  reasonModal.reason = '';
}

async function confirmReasonAction() {
  if (!reasonModal.client) return;
  submitting.value = true;
  try {
    const endpoint =
      reasonModal.mode === 'REJECT'
        ? `/admin/clients/${reasonModal.client.id}/reject`
        : `/admin/clients/${reasonModal.client.id}/suspend`;

    await api.patch(endpoint, { reason: reasonModal.reason });
    feedbackType.value = 'success';
    feedbackMsg.value =
      reasonModal.mode === 'REJECT'
        ? `Dossier "${reasonModal.client.name}" rejeté.`
        : `Compte "${reasonModal.client.name}" suspendu.`;
    reasonModal.client = null;
    await fetchClients();
  } catch (err: any) {
    feedbackType.value = 'error';
    feedbackMsg.value = err.response?.data?.error?.message || 'Erreur lors de l’opération';
  } finally {
    submitting.value = false;
  }
}

async function handleReactivate(client: any) {
  try {
    await api.patch(`/admin/clients/${client.id}/reactivate`);
    feedbackType.value = 'success';
    feedbackMsg.value = `✅ Compte "${client.name}" réactivé.`;
    await fetchClients();
  } catch (err: any) {
    feedbackType.value = 'error';
    feedbackMsg.value = 'Erreur lors de la réactivation';
  }
}

function goToDetail(id: number) {
  router.push(`/admin/clients/${id}`);
}
</script>

<style scoped>
.pending-clients-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.view-title {
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--color-primary);
  margin: 0 0 0.25rem 0;
}

.view-subtitle {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  margin: 0;
}

/* Filter Bar */
.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.status-tabs {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  background-color: var(--color-bg);
  border: 1px solid var(--color-border);
  padding: 0.5rem 0.9rem;
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  cursor: pointer;
}

.tab-btn.active {
  background-color: var(--color-primary);
  color: #fff;
  border-color: var(--color-primary);
}

.tab-count {
  font-size: 0.7rem;
  padding: 0.1rem 0.4rem;
  border-radius: 999px;
  background-color: rgba(0, 0, 0, 0.08);
}

.tab-btn.active .tab-count {
  background-color: rgba(255, 255, 255, 0.2);
  color: #fff;
}

.search-input {
  width: 300px;
  padding: 0.55rem 0.85rem;
  font-size: 0.85rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background-color: var(--color-bg);
}

/* Feedback Banner */
.feedback-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  font-weight: 600;
}

.feedback-banner.success {
  background-color: var(--color-success-bg);
  color: var(--color-success);
  border: 1px solid rgba(39, 143, 94, 0.25);
}

.feedback-banner.error {
  background-color: var(--color-danger-bg);
  color: var(--color-danger);
  border: 1px solid rgba(204, 41, 41, 0.25);
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
}

/* Table */
.table-card {
  background-color: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow-x: auto;
}

.table-loading,
.table-empty {
  padding: 3rem;
  text-align: center;
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.82rem;
}

.data-table th {
  text-align: left;
  padding: 0.85rem 1rem;
  background-color: var(--color-bg-subtle);
  border-bottom: 1px solid var(--color-border);
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--color-text-secondary);
  letter-spacing: 0.03em;
}

.data-table td {
  padding: 0.85rem 1rem;
  border-bottom: 1px solid var(--color-border-subtle);
  vertical-align: middle;
}

.client-row {
  cursor: pointer;
  transition: background-color 0.12s;
}

.client-row:hover {
  background-color: var(--color-bg-subtle);
}

.company-name {
  font-weight: 700;
  color: var(--color-primary);
  margin-bottom: 0.2rem;
}

.client-code-pill {
  display: inline-block;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  font-weight: 700;
  background-color: var(--color-surface);
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
}

.no-code {
  font-size: 0.7rem;
  color: var(--color-text-tertiary);
  font-style: italic;
}

.contact-name {
  font-weight: 600;
}

.contact-sub {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.mono-sm {
  font-family: var(--font-mono);
  font-size: 0.75rem;
}

.doc-badges {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.doc-pill {
  font-size: 0.7rem;
  font-weight: 700;
  background-color: var(--color-info-bg);
  color: var(--color-info);
  padding: 0.2rem 0.45rem;
  border-radius: var(--radius-sm);
  text-decoration: none;
  border: 1px solid rgba(0, 112, 204, 0.2);
}

.text-muted {
  color: var(--color-text-tertiary);
  font-size: 0.75rem;
}

.status-badge {
  display: inline-block;
  font-size: 0.68rem;
  font-weight: 800;
  padding: 0.2rem 0.5rem;
  border-radius: var(--radius-sm);
  text-transform: uppercase;
}

.status-badge.pending {
  background-color: var(--color-warning-bg);
  color: var(--color-warning);
}

.status-badge.active {
  background-color: var(--color-success-bg);
  color: var(--color-success);
}

.status-badge.rejected,
.status-badge.suspended {
  background-color: var(--color-danger-bg);
  color: var(--color-danger);
}

.credit-sub {
  font-size: 0.7rem;
  color: var(--color-text-secondary);
  margin-top: 0.25rem;
}

.actions-cell {
  text-align: right;
  white-space: nowrap;
}

.btn-action {
  padding: 0.35rem 0.65rem;
  font-size: 0.75rem;
  font-weight: 700;
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  cursor: pointer;
  margin-left: 0.35rem;
}

.btn-action.approve {
  background-color: var(--color-success);
  color: #fff;
}

.btn-action.reject,
.btn-action.suspend {
  background-color: var(--color-danger-bg);
  color: var(--color-danger);
  border-color: rgba(204, 41, 41, 0.25);
}

.btn-action.outline {
  background-color: var(--color-bg);
  border-color: var(--color-border-dark);
  color: var(--color-primary);
  text-decoration: none;
}

/* Modals & Drawer */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 1rem;
}

.modal-box {
  width: 100%;
  max-width: 460px;
  background-color: var(--color-bg);
  border-radius: var(--radius-md);
  padding: 1.75rem;
  box-shadow: var(--shadow-modal);
}

.modal-title {
  font-size: 1.15rem;
  font-weight: 800;
  margin: 0 0 0.5rem 0;
}

.modal-desc {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  margin: 0 0 1.25rem 0;
  line-height: 1.4;
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.form-label {
  font-size: 0.78rem;
  font-weight: 700;
}

.form-input {
  padding: 0.6rem 0.75rem;
  font-size: 0.85rem;
  border: 1px solid var(--color-border-dark);
  border-radius: var(--radius-sm);
}

.field-hint {
  font-size: 0.72rem;
  color: var(--color-text-secondary);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.65rem;
  margin-top: 0.5rem;
}

.btn-cancel {
  background: none;
  border: 1px solid var(--color-border-dark);
  padding: 0.55rem 1rem;
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-modal-primary {
  background-color: var(--color-primary);
  color: #fff;
  border: none;
  padding: 0.55rem 1.15rem;
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
}

.btn-modal-danger {
  background-color: var(--color-danger);
  color: #fff;
  border: none;
  padding: 0.55rem 1.15rem;
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
}

/* Drawer */
.drawer-panel {
  width: 100%;
  max-width: 600px;
  background-color: var(--color-bg);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-modal);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}

.drawer-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.drawer-title {
  font-size: 1.2rem;
  font-weight: 800;
  margin: 0.35rem 0 0 0;
}

.drawer-body {
  padding: 1.5rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.drawer-section h4 {
  font-size: 0.85rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--color-text-secondary);
  margin: 0 0 0.75rem 0;
  border-bottom: 1px solid var(--color-border-subtle);
  padding-bottom: 0.35rem;
}

.kv-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.65rem;
  font-size: 0.82rem;
}

.kv-grid label {
  color: var(--color-text-secondary);
  margin-right: 0.35rem;
}

.drawer-docs {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.drawer-doc-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.65rem 0.85rem;
  background-color: var(--color-bg-subtle);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.drawer-doc-info {
  display: flex;
  flex-direction: column;
  font-size: 0.8rem;
}

.drawer-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  background-color: var(--color-bg-subtle);
}
</style>

