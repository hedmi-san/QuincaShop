<template>
  <div class="admin-payroll-page">
    <div class="page-header no-print">
      <div>
        <h1 class="page-title">Livre de Paie & Traitements</h1>
        <p class="page-subtitle">Gestion des salaires mensuels, primes de l'Aïd, primes de rendement et retenues.</p>
      </div>
      <div class="header-actions">
        <button @click="printPayroll" class="btn btn-outline" :disabled="erpStore.salaries.length === 0">
          🖨️ Imprimer Livre de Paie
        </button>
        <button @click="handleGeneratePayroll" class="btn btn-primary" :disabled="generating">
          {{ generating ? 'Génération en cours...' : '⚡ Générer la Paie du Mois' }}
        </button>
      </div>
    </div>

    <!-- Print-only official header -->
    <div class="print-only print-header">
      <div class="print-brand">
        <h2>QUINCAILLERIE CENTRALE EL-EULMA</h2>
        <p>Quincaillerie Générale & Outillage B2B • RC: 19/00-1234567B19 • NIF: 001916012345678</p>
      </div>
      <div class="print-meta">
        <h3>LIVRE DE PAIE MENSUEL</h3>
        <p><strong>Période :</strong> {{ formatPeriodLabel(selectedPeriod) }}</p>
        <p><strong>Date d'édition :</strong> {{ new Date().toLocaleDateString('fr-DZ') }}</p>
      </div>
    </div>

    <!-- Period Selection & Summary Cards -->
    <div class="period-bar no-print">
      <div class="period-select-box">
        <label>Période mensuelle :</label>
        <input
          type="month"
          v-model="selectedPeriodMonth"
          class="form-control period-input"
          @change="onPeriodChange"
        />
        <button class="btn btn-secondary" @click="loadSalaries">
          Actualiser
        </button>
      </div>

      <div class="period-badge-box">
        <span class="period-indicator">Période active : <strong>{{ formatPeriodLabel(selectedPeriod) }}</strong></span>
      </div>
    </div>

    <!-- Metrics Cards -->
    <div class="metrics-grid">
      <div class="metric-card">
        <span class="metric-lbl">Masse Salariale Nette</span>
        <span class="metric-val text-primary">
          {{ formatCurrency(erpStore.payrollSummary.totalNet) }}
        </span>
        <span class="metric-sub">{{ erpStore.payrollSummary.employeeCount }} bulletin(s) calculé(s)</span>
      </div>

      <div class="metric-card">
        <span class="metric-lbl">Total Base</span>
        <span class="metric-val">
          {{ formatCurrency(erpStore.payrollSummary.totalBase) }}
        </span>
        <span class="metric-sub">Salaires contractuels</span>
      </div>

      <div class="metric-card">
        <span class="metric-lbl">Primes & Bonus (Aïd + Rendement)</span>
        <span class="metric-val text-success">
          +{{ formatCurrency(erpStore.payrollSummary.totalBonus1 + erpStore.payrollSummary.totalBonus2) }}
        </span>
        <span class="metric-sub">
          Aïd: {{ formatCurrency(erpStore.payrollSummary.totalBonus1) }} | Rend: {{ formatCurrency(erpStore.payrollSummary.totalBonus2) }}
        </span>
      </div>

      <div class="metric-card">
        <span class="metric-lbl">Retenues & Avances</span>
        <span class="metric-val text-danger">
          -{{ formatCurrency(erpStore.payrollSummary.totalDeductions) }}
        </span>
        <span class="metric-sub">Avances sur salaire / retenues</span>
      </div>

      <div class="metric-card">
        <span class="metric-lbl">Statut Règlements</span>
        <div class="payment-ratio">
          <span class="text-success font-bold">{{ erpStore.payrollSummary.paidCount }} Payés</span>
          <span class="ratio-separator">/</span>
          <span class="text-warning font-bold">{{ erpStore.payrollSummary.unpaidCount }} En attente</span>
        </div>
        <div class="progress-bar-bg">
          <div
            class="progress-bar-fill"
            :style="{ width: paymentPercentage + '%' }"
          ></div>
        </div>
      </div>
    </div>

    <!-- Payroll Table Card -->
    <div class="payroll-card">
      <div v-if="erpStore.loading" class="loading-state no-print">
        <div class="spinner"></div>
        <p>Chargement du livre de paie...</p>
      </div>

      <div v-else-if="erpStore.salaries.length === 0" class="empty-state no-print">
        <div class="empty-icon">💰</div>
        <h3>Aucun bulletin de paie pour {{ formatPeriodLabel(selectedPeriod) }}</h3>
        <p>Cliquez sur "Générer la Paie du Mois" pour initialiser automatiquement les fiches de paie à partir du personnel actif.</p>
        <button @click="handleGeneratePayroll" class="btn btn-primary" style="margin-top: 1rem;">
          ⚡ Initialiser la Paie de {{ formatPeriodLabel(selectedPeriod) }}
        </button>
      </div>

      <div v-else class="table-responsive">
        <table class="payroll-table">
          <thead>
            <tr>
              <th>Employé & Poste</th>
              <th class="text-right" style="width: 130px;">Base (DZD)</th>
              <th class="text-right" style="width: 120px;">Prime Aïd</th>
              <th class="text-right" style="width: 125px;">Prime Rend.</th>
              <th class="text-right" style="width: 120px;">Retenues</th>
              <th class="text-right" style="width: 140px;">Net à Payer (DZD)</th>
              <th style="width: 120px; text-align: center;">Règlement</th>
              <th style="width: 110px;" class="print-only">Émargement</th>
              <th style="width: 140px; text-align: right;" class="no-print">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in erpStore.salaries" :key="s.id">
              <td>
                <div class="emp-cell">
                  <span class="emp-name">{{ s.employee_name }}</span>
                  <span class="emp-role">{{ s.employee_position || 'Personnel' }}</span>
                </div>
              </td>
              <td class="text-right font-mono font-bold">
                {{ formatCurrency(s.base_salary) }}
              </td>
              <td class="text-right font-mono" :class="s.bonus1 > 0 ? 'text-success font-bold' : 'text-muted'">
                {{ s.bonus1 > 0 ? `+${formatCurrency(s.bonus1)}` : '0.00' }}
              </td>
              <td class="text-right font-mono" :class="s.bonus2 > 0 ? 'text-success font-bold' : 'text-muted'">
                {{ s.bonus2 > 0 ? `+${formatCurrency(s.bonus2)}` : '0.00' }}
              </td>
              <td class="text-right font-mono" :class="s.deductions > 0 ? 'text-danger font-bold' : 'text-muted'">
                {{ s.deductions > 0 ? `-${formatCurrency(s.deductions)}` : '0.00' }}
              </td>
              <td class="text-right font-mono font-bold text-primary total-cell">
                {{ formatCurrency(s.total) }}
              </td>
              <td class="text-center">
                <span
                  class="status-pill"
                  :class="s.paid ? 'status-paid' : 'status-unpaid'"
                >
                  {{ s.paid ? 'Payé' : 'En attente' }}
                </span>
                <div v-if="s.paid && s.payment_date" class="pay-date">
                  le {{ formatDate(s.payment_date) }}
                </div>
              </td>
              <td class="print-only signature-cell">
                <div class="sig-placeholder"></div>
              </td>
              <td class="text-right no-print">
                <div class="actions-group">
                  <button
                    class="btn-icon"
                    title="Ajuster primes et retenues"
                    @click="openEditModal(s)"
                  >
                    ✏️
                  </button>
                  <button
                    v-if="!s.paid"
                    class="btn-pay-quick"
                    title="Marquer comme payé aujourd'hui"
                    @click="markPaidDirect(s)"
                  >
                    ✓ Payer
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="table-totals">
              <td><strong>TOTAL GÉNÉRAL :</strong></td>
              <td class="text-right font-mono"><strong>{{ formatCurrency(erpStore.payrollSummary.totalBase) }}</strong></td>
              <td class="text-right font-mono text-success"><strong>+{{ formatCurrency(erpStore.payrollSummary.totalBonus1) }}</strong></td>
              <td class="text-right font-mono text-success"><strong>+{{ formatCurrency(erpStore.payrollSummary.totalBonus2) }}</strong></td>
              <td class="text-right font-mono text-danger"><strong>-{{ formatCurrency(erpStore.payrollSummary.totalDeductions) }}</strong></td>
              <td class="text-right font-mono text-primary font-bold"><strong>{{ formatCurrency(erpStore.payrollSummary.totalNet) }}</strong></td>
              <td colspan="3"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <!-- Print Footer Signatures -->
    <div class="print-only print-footer">
      <div class="sign-box">
        <p><strong>Visa Comptable / Établi par :</strong></p>
        <div class="sign-space"></div>
      </div>
      <div class="sign-box">
        <p><strong>Approbation Direction / Gérant :</strong></p>
        <div class="sign-space"></div>
      </div>
    </div>

    <!-- Modal for Adjusting Salary (Bonus, Deductions, Status) -->
    <div v-if="showEditModal" class="modal-backdrop no-print" @click.self="closeModal">
      <div class="modal-dialog">
        <div class="modal-header">
          <h3 class="modal-title">
            Ajustement Bulletin : {{ editingSalary?.employee_name }}
          </h3>
          <button class="btn-close" @click="closeModal">✕</button>
        </div>

        <form @submit.prevent="submitSalaryUpdate" class="modal-body">
          <div v-if="modalError" class="alert alert-danger">
            {{ modalError }}
          </div>

          <div class="info-banner">
            <div><strong>Période :</strong> {{ formatPeriodLabel(editingSalary?.period) }}</div>
            <div><strong>Salaire contractuel de base :</strong> {{ formatCurrency(editingSalary?.base_salary) }}</div>
          </div>

          <div class="form-row">
            <div class="form-group col-6">
              <label>Prime de l'Aïd / Fêtes (DZD)</label>
              <input
                type="number"
                step="500"
                min="0"
                v-model.number="editForm.bonus1"
                class="form-control font-mono"
              />
              <small class="form-hint">Prime exceptionnelle / prime de mouton</small>
            </div>

            <div class="form-group col-6">
              <label>Prime de Rendement (DZD)</label>
              <input
                type="number"
                step="500"
                min="0"
                v-model.number="editForm.bonus2"
                class="form-control font-mono"
              />
              <small class="form-hint">Productivité et assiduité</small>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group col-6">
              <label>Retenues / Avances sur salaire (DZD)</label>
              <input
                type="number"
                step="500"
                min="0"
                v-model.number="editForm.deductions"
                class="form-control font-mono"
              />
              <small class="form-hint">Avances déjà perçues ou absences</small>
            </div>

            <div class="form-group col-6">
              <label>Calcul Net à Payer Prévisionnel</label>
              <div class="computed-net-preview">
                {{ formatCurrency(computedTotalPreview) }}
              </div>
            </div>
          </div>

          <hr class="modal-divider" />

          <div class="form-row">
            <div class="form-group col-6">
              <label>Statut de Paiement</label>
              <select v-model="editForm.paid" class="form-control">
                <option :value="false">En attente de paiement</option>
                <option :value="true">Payé / Réglé</option>
              </select>
            </div>

            <div v-if="editForm.paid" class="form-group col-6">
              <label>Date de Paiement</label>
              <input
                type="date"
                v-model="editForm.paymentDate"
                class="form-control"
              />
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="closeModal">
              Annuler
            </button>
            <button type="submit" class="btn btn-primary" :disabled="submitting">
              {{ submitting ? 'Enregistrement...' : 'Valider les Modifications' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useErpStore, type SalaryItem } from '../../stores/erp.store';

const erpStore = useErpStore();

const now = new Date();
const currentMonthIso = now.toISOString().substring(0, 7); // 'YYYY-MM'
const selectedPeriodMonth = ref(currentMonthIso);

const selectedPeriod = computed(() => {
  return `${selectedPeriodMonth.value}-01`;
});

const generating = ref(false);
const showEditModal = ref(false);
const editingSalary = ref<SalaryItem | null>(null);
const submitting = ref(false);
const modalError = ref<string | null>(null);

const editForm = ref({
  bonus1: 0,
  bonus2: 0,
  deductions: 0,
  paid: false,
  paymentDate: new Date().toISOString().substring(0, 10),
});

const computedTotalPreview = computed(() => {
  if (!editingSalary.value) return 0;
  const base = Number(editingSalary.value.base_salary) || 0;
  const b1 = Number(editForm.value.bonus1) || 0;
  const b2 = Number(editForm.value.bonus2) || 0;
  const ded = Number(editForm.value.deductions) || 0;
  return Math.max(0, base + b1 + b2 - ded);
});

const paymentPercentage = computed(() => {
  const total = erpStore.payrollSummary.employeeCount;
  if (!total || total === 0) return 0;
  return Math.round((erpStore.payrollSummary.paidCount / total) * 100);
});

onMounted(() => {
  loadSalaries();
});

async function loadSalaries() {
  await erpStore.fetchSalaries(selectedPeriod.value);
}

function onPeriodChange() {
  loadSalaries();
}

async function handleGeneratePayroll() {
  if (!window.confirm(`Générer ou mettre à jour le livre de paie pour ${formatPeriodLabel(selectedPeriod.value)} ?\nTous les employés actifs seront automatiquement inclus.`)) {
    return;
  }

  generating.value = true;
  try {
    await erpStore.generatePayroll(selectedPeriod.value);
  } catch (err: any) {
    alert(err.message || 'Erreur lors de la génération de la paie.');
  } finally {
    generating.value = false;
  }
}

function openEditModal(salary: SalaryItem) {
  editingSalary.value = salary;
  modalError.value = null;
  editForm.value = {
    bonus1: Number(salary.bonus1) || 0,
    bonus2: Number(salary.bonus2) || 0,
    deductions: Number(salary.deductions) || 0,
    paid: salary.paid,
    paymentDate: salary.payment_date ? salary.payment_date.substring(0, 10) : new Date().toISOString().substring(0, 10),
  };
  showEditModal.value = true;
}

function closeModal() {
  showEditModal.value = false;
  editingSalary.value = null;
  modalError.value = null;
}

async function submitSalaryUpdate() {
  if (!editingSalary.value) return;

  submitting.value = true;
  modalError.value = null;
  try {
    await erpStore.updateSalary(editingSalary.value.id, {
      bonus1: editForm.value.bonus1,
      bonus2: editForm.value.bonus2,
      deductions: editForm.value.deductions,
      paid: editForm.value.paid,
      paymentDate: editForm.value.paid ? editForm.value.paymentDate : undefined,
    });
    closeModal();
  } catch (err: any) {
    modalError.value = err.message || 'Erreur lors de la mise à jour du bulletin.';
  } finally {
    submitting.value = false;
  }
}

async function markPaidDirect(salary: SalaryItem) {
  try {
    await erpStore.updateSalary(salary.id, {
      paid: true,
      paymentDate: new Date().toISOString().substring(0, 10),
    });
  } catch (err: any) {
    alert(err.message || 'Erreur lors du règlement de la paie.');
  }
}

function printPayroll() {
  window.print();
}

function formatCurrency(val: number | string | undefined | null) {
  if (val === undefined || val === null) return '0.00 DZD';
  const num = typeof val === 'string' ? parseFloat(val) : val;
  return new Intl.NumberFormat('fr-DZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num) + ' DZD';
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-DZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatPeriodLabel(periodStr?: string) {
  if (!periodStr) return '';
  const [year, month] = periodStr.split('-');
  const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
  return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).toUpperCase();
}
</script>

<style scoped>
.admin-payroll-page {
  padding: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
}

.page-title {
  font-size: 1.6rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.page-subtitle {
  color: #64748b;
  margin-top: 0.25rem;
  font-size: 0.95rem;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
}

.period-bar {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1rem 1.25rem;
  margin-bottom: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.period-select-box {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.period-select-box label {
  font-weight: 600;
  color: #334155;
  font-size: 0.9rem;
}

.period-input {
  font-weight: 600;
  color: #0f172a;
}

.period-indicator {
  font-size: 0.95rem;
  color: #2563eb;
  background: #eff6ff;
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  border: 1px solid #bfdbfe;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.metric-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
}

.metric-lbl {
  font-size: 0.8rem;
  text-transform: uppercase;
  color: #64748b;
  font-weight: 600;
  letter-spacing: 0.05em;
}

.metric-val {
  font-size: 1.65rem;
  font-weight: 800;
  margin: 0.35rem 0 0.2rem 0;
}

.metric-sub {
  font-size: 0.82rem;
  color: #94a3b8;
}

.text-primary {
  color: #2563eb;
}

.text-success {
  color: #16a34a;
}

.text-danger {
  color: #dc2626;
}

.text-warning {
  color: #d97706;
}

.text-muted {
  color: #94a3b8;
}

.payment-ratio {
  margin: 0.4rem 0 0.5rem 0;
  font-size: 1.15rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.ratio-separator {
  color: #cbd5e1;
}

.progress-bar-bg {
  width: 100%;
  height: 6px;
  background: #f1f5f9;
  border-radius: 3px;
  overflow: hidden;
  margin-top: 0.25rem;
}

.progress-bar-fill {
  height: 100%;
  background: #16a34a;
  transition: width 0.3s ease;
}

.payroll-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.payroll-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 0.9rem;
}

.payroll-table th {
  background: #f8fafc;
  color: #475569;
  font-weight: 600;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e2e8f0;
}

.payroll-table td {
  padding: 0.85rem 1rem;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
}

.payroll-table tr:hover {
  background: #f8fafc;
}

.table-totals {
  background: #f8fafc;
  font-size: 0.95rem;
  border-top: 2px solid #cbd5e1;
}

.emp-cell {
  display: flex;
  flex-direction: column;
}

.emp-name {
  font-weight: 600;
  color: #1e293b;
}

.emp-role {
  font-size: 0.8rem;
  color: #64748b;
}

.total-cell {
  font-size: 1.05rem;
}

.status-pill {
  display: inline-block;
  padding: 0.25rem 0.65rem;
  border-radius: 9999px;
  font-size: 0.78rem;
  font-weight: 600;
}

.status-paid {
  background: #dcfce7;
  color: #15803d;
}

.status-unpaid {
  background: #fef3c7;
  color: #b45309;
}

.pay-date {
  font-size: 0.72rem;
  color: #64748b;
  margin-top: 0.2rem;
}

.actions-group {
  display: flex;
  gap: 0.4rem;
  justify-content: flex-end;
}

.btn-icon {
  background: none;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  padding: 0.35rem 0.5rem;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-icon:hover {
  background: #f1f5f9;
}

.btn-pay-quick {
  background: #dcfce7;
  color: #15803d;
  border: 1px solid #bbf7d0;
  border-radius: 4px;
  padding: 0.35rem 0.65rem;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-pay-quick:hover {
  background: #bbf7d0;
}

.btn {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  border: none;
  transition: background 0.15s;
}

.btn-primary {
  background: #2563eb;
  color: #fff;
}

.btn-primary:hover {
  background: #1d4ed8;
}

.btn-secondary {
  background: #e2e8f0;
  color: #334155;
}

.btn-outline {
  background: transparent;
  border: 1px solid #cbd5e1;
  color: #334155;
}

.btn-outline:hover {
  background: #f8fafc;
}

.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.font-bold {
  font-weight: 700;
}

.text-right {
  text-align: right;
}

.text-center {
  text-align: center;
}

.info-banner {
  background: #f1f5f9;
  border-radius: 6px;
  padding: 0.75rem 1rem;
  margin-bottom: 1.25rem;
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
  color: #1e293b;
}

.computed-net-preview {
  font-size: 1.25rem;
  font-weight: 800;
  color: #2563eb;
  padding: 0.5rem;
  background: #eff6ff;
  border-radius: 6px;
  border: 1px solid #bfdbfe;
  font-family: monospace;
  text-align: center;
}

.form-hint {
  display: block;
  font-size: 0.75rem;
  color: #64748b;
  margin-top: 0.25rem;
}

.modal-divider {
  border: 0;
  border-top: 1px solid #e2e8f0;
  margin: 1.25rem 0;
}

/* Modal styles */
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-dialog {
  background: #fff;
  border-radius: 8px;
  width: 100%;
  max-width: 620px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.modal-header {
  padding: 1.25rem;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-title {
  font-size: 1.2rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.btn-close {
  background: transparent;
  border: none;
  font-size: 1.2rem;
  color: #94a3b8;
  cursor: pointer;
}

.modal-body {
  padding: 1.25rem;
}

.modal-footer {
  margin-top: 1.5rem;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  border-top: 1px solid #e2e8f0;
  padding-top: 1.25rem;
}

.form-row {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.col-6 {
  flex: 0 0 calc(50% - 0.5rem);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.form-group label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #475569;
}

.form-control {
  padding: 0.5rem 0.75rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 0.9rem;
  background-color: #fff;
  color: #1e293b;
}

.form-control:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.loading-state,
.empty-state {
  padding: 3rem;
  text-align: center;
  color: #64748b;
}

.empty-icon {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e2e8f0;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 1rem auto;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Print Only */
.print-only {
  display: none;
}

@media print {
  .no-print {
    display: none !important;
  }

  .print-only {
    display: block !important;
  }

  .admin-payroll-page {
    padding: 0;
    max-width: 100%;
  }

  .print-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 2px solid #000;
    padding-bottom: 1rem;
    margin-bottom: 1.5rem;
  }

  .print-brand h2 {
    font-size: 1.2rem;
    margin: 0 0 0.25rem 0;
  }

  .print-brand p {
    font-size: 0.75rem;
    color: #475569;
    margin: 0;
  }

  .print-meta {
    text-align: right;
  }

  .print-meta h3 {
    margin: 0 0 0.25rem 0;
    font-size: 1.1rem;
  }

  .print-meta p {
    margin: 0;
    font-size: 0.8rem;
  }

  .payroll-card {
    border: none;
    box-shadow: none;
  }

  .payroll-table th,
  .payroll-table td {
    padding: 0.4rem 0.5rem;
    font-size: 0.8rem;
    border-bottom: 1px solid #ccc;
  }

  .sig-placeholder {
    height: 35px;
    border-bottom: 1px dotted #999;
  }

  .print-footer {
    margin-top: 3rem;
    display: flex;
    justify-content: space-between;
    padding: 0 2rem;
  }

  .sign-box {
    width: 250px;
    font-size: 0.85rem;
  }

  .sign-space {
    height: 70px;
    border: 1px dashed #cbd5e1;
    margin-top: 0.5rem;
  }
}
</style>

