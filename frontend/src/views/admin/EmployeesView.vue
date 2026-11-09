<template>
  <div class="admin-employees-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Registre du Personnel & Employés</h1>
        <p class="page-subtitle">Gestion des contrats, fiches collaborateurs et salaires de base.</p>
      </div>
      <div class="header-actions">
        <button @click="openCreateModal" class="btn btn-primary">
          + Nouvel Employé
        </button>
      </div>
    </div>

    <!-- Summary Metrics -->
    <div class="metrics-grid">
      <div class="metric-card">
        <span class="metric-lbl">Total Effectif</span>
        <span class="metric-val text-primary">
          {{ erpStore.employeeSummary.totalEmployees }}
        </span>
        <span class="metric-sub">{{ activeCount }} actif(s) en poste</span>
      </div>

      <div class="metric-card">
        <span class="metric-lbl">Masse Salariale de Base Mensuelle</span>
        <span class="metric-val text-success">
          {{ formatCurrency(erpStore.employeeSummary.monthlyBasePayrollMass) }}
        </span>
        <span class="metric-sub">Hors primes variables et retenues</span>
      </div>

      <div class="metric-card">
        <span class="metric-lbl">Collaborateurs Archivés</span>
        <span class="metric-val text-muted">
          {{ terminatedCount }}
        </span>
        <span class="metric-sub">Contrats terminés / Archivés</span>
      </div>
    </div>

    <!-- Filters Bar -->
    <div class="filters-card">
      <div class="filter-inputs">
        <div class="filter-group">
          <label>Statut :</label>
          <select v-model="selectedStatus" class="form-control" @change="handleFilter">
            <option value="ALL">Tous les statuts</option>
            <option value="ACTIVE">Actifs uniquement</option>
            <option value="TERMINATED">Terminés / Archivés</option>
          </select>
        </div>

        <div class="filter-group search-group">
          <label>Recherche collaborateur :</label>
          <input
            type="text"
            v-model="searchQuery"
            placeholder="Nom, poste, téléphone, NIN..."
            class="form-control"
            @keyup.enter="handleFilter"
          />
        </div>
      </div>

      <div class="filter-buttons">
        <button class="btn btn-outline" @click="handleFilter">Rechercher</button>
        <button class="btn btn-secondary btn-reset" @click="resetFilters">Réinitialiser</button>
      </div>
    </div>

    <!-- Employees Table Card -->
    <div class="employees-card">
      <div v-if="erpStore.loading" class="loading-state">
        <div class="spinner"></div>
        <p>Chargement des employés...</p>
      </div>

      <div v-else-if="erpStore.employees.length === 0" class="empty-state">
        <div class="empty-icon">👥</div>
        <h3>Aucun employé trouvé</h3>
        <p>Ajoutez un premier collaborateur pour configurer la gestion RH et la paie.</p>
        <button @click="openCreateModal" class="btn btn-primary" style="margin-top: 1rem;">
          + Ajouter un Employé
        </button>
      </div>

      <div v-else class="table-responsive">
        <table class="employees-table">
          <thead>
            <tr>
              <th>Collaborateur</th>
              <th style="width: 140px;">Poste</th>
              <th style="width: 130px;">Téléphone</th>
              <th style="width: 130px;">N.I.N.</th>
              <th style="width: 110px;">Embauche</th>
              <th class="text-right" style="width: 150px;">Salaire de Base</th>
              <th style="width: 110px; text-align: center;">Statut</th>
              <th style="width: 120px; text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="emp in erpStore.employees" :key="emp.id">
              <td>
                <div class="emp-identity">
                  <span class="emp-avatar">{{ getInitials(emp.full_name) }}</span>
                  <div class="emp-name-box">
                    <span class="emp-fullname">{{ emp.full_name }}</span>
                    <span class="emp-ref">EMP-#{{ String(emp.id).padStart(3, '0') }}</span>
                  </div>
                </div>
              </td>
              <td>
                <span class="position-badge">{{ emp.position || 'Non spécifié' }}</span>
              </td>
              <td>
                <span class="emp-contact">{{ emp.phone || '—' }}</span>
              </td>
              <td>
                <span class="emp-nin font-mono">{{ emp.nin || '—' }}</span>
              </td>
              <td>
                <span class="emp-date">{{ formatDate(emp.hire_date) }}</span>
              </td>
              <td class="text-right font-mono font-bold text-dark">
                {{ formatCurrency(emp.base_salary) }}
              </td>
              <td class="text-center">
                <span
                  class="status-pill"
                  :class="emp.status === 'ACTIVE' ? 'status-active' : 'status-terminated'"
                >
                  {{ emp.status === 'ACTIVE' ? 'Actif' : 'Sorti' }}
                </span>
              </td>
              <td class="text-right">
                <div class="actions-group">
                  <button
                    class="btn-icon"
                    title="Modifier"
                    @click="openEditModal(emp)"
                  >
                    ✏️
                  </button>
                  <button
                    class="btn-icon btn-icon-danger"
                    title="Supprimer / Archiver"
                    @click="confirmDelete(emp)"
                  >
                    🗑️
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal Form (Create / Edit) -->
    <div v-if="showModal" class="modal-backdrop" @click.self="closeModal">
      <div class="modal-dialog">
        <div class="modal-header">
          <h3 class="modal-title">
            {{ isEditing ? 'Modifier la Fiche Collaborateur' : 'Enregistrer un Nouvel Employé' }}
          </h3>
          <button class="btn-close" @click="closeModal">✕</button>
        </div>

        <form @submit.prevent="submitForm" class="modal-body">
          <div v-if="formError" class="alert alert-danger">
            {{ formError }}
          </div>

          <div class="form-row">
            <div class="form-group col-12">
              <label>Nom Complet <span class="text-danger">*</span></label>
              <input
                type="text"
                v-model="form.fullName"
                required
                placeholder="Ex: Karim Benali"
                class="form-control"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group col-6">
              <label>Poste / Fonction <span class="text-danger">*</span></label>
              <input
                type="text"
                v-model="form.position"
                required
                placeholder="Ex: Magasinier, Vendeur..."
                class="form-control"
              />
            </div>

            <div class="form-group col-6">
              <label>Salaire de Base Mensuel (DZD) <span class="text-danger">*</span></label>
              <input
                type="number"
                step="100"
                min="0"
                v-model.number="form.baseSalary"
                required
                class="form-control font-mono"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group col-6">
              <label>Numéro de Téléphone</label>
              <input
                type="tel"
                v-model="form.phone"
                placeholder="Ex: 0550 12 34 56"
                class="form-control"
              />
            </div>

            <div class="form-group col-6">
              <label>NIN (N° Sécurité Sociale / Identité)</label>
              <input
                type="text"
                v-model="form.nin"
                placeholder="18 chiffres"
                class="form-control font-mono"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group col-6">
              <label>Date d'Embauche</label>
              <input
                type="date"
                v-model="form.hireDate"
                class="form-control"
              />
            </div>

            <div class="form-group col-6">
              <label>Statut</label>
              <select v-model="form.status" class="form-control">
                <option value="ACTIVE">Actif en poste</option>
                <option value="TERMINATED">Fin de contrat / Archivé</option>
              </select>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="closeModal">
              Annuler
            </button>
            <button type="submit" class="btn btn-primary" :disabled="submitting">
              {{ submitting ? 'Enregistrement...' : (isEditing ? 'Mettre à Jour' : 'Créer le Collaborateur') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useErpStore, type Employee } from '../../stores/erp.store';

const erpStore = useErpStore();

// Filters
const selectedStatus = ref<'ALL' | 'ACTIVE' | 'TERMINATED'>('ALL');
const searchQuery = ref('');

// Modal state
const showModal = ref(false);
const isEditing = ref(false);
const editingId = ref<number | null>(null);
const submitting = ref(false);
const formError = ref<string | null>(null);

const form = ref({
  fullName: '',
  position: 'Magasinier',
  baseSalary: 45000,
  phone: '',
  nin: '',
  hireDate: new Date().toISOString().substring(0, 10),
  status: 'ACTIVE' as 'ACTIVE' | 'TERMINATED',
});

const activeCount = computed(() => {
  return erpStore.employees.filter((e) => e.status === 'ACTIVE').length;
});

const terminatedCount = computed(() => {
  return erpStore.employees.filter((e) => e.status === 'TERMINATED').length;
});

onMounted(() => {
  loadEmployees();
});

async function loadEmployees() {
  await erpStore.fetchEmployees({
    status: selectedStatus.value === 'ALL' ? undefined : selectedStatus.value,
    search: searchQuery.value.trim() || undefined,
  });
}

function handleFilter() {
  loadEmployees();
}

function resetFilters() {
  selectedStatus.value = 'ALL';
  searchQuery.value = '';
  loadEmployees();
}

function openCreateModal() {
  isEditing.value = false;
  editingId.value = null;
  formError.value = null;
  form.value = {
    fullName: '',
    position: 'Magasinier',
    baseSalary: 45000,
    phone: '',
    nin: '',
    hireDate: new Date().toISOString().substring(0, 10),
    status: 'ACTIVE',
  };
  showModal.value = true;
}

function openEditModal(emp: Employee) {
  isEditing.value = true;
  editingId.value = emp.id;
  formError.value = null;
  form.value = {
    fullName: emp.full_name,
    position: emp.position,
    baseSalary: Number(emp.base_salary),
    phone: emp.phone || '',
    nin: emp.nin || '',
    hireDate: emp.hire_date ? emp.hire_date.substring(0, 10) : '',
    status: emp.status,
  };
  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
  formError.value = null;
}

async function submitForm() {
  formError.value = null;
  submitting.value = true;

  try {
    if (isEditing.value && editingId.value) {
      await erpStore.updateEmployee(editingId.value, {
        full_name: form.value.fullName,
        position: form.value.position,
        base_salary: form.value.baseSalary,
        phone: form.value.phone || undefined,
        nin: form.value.nin || undefined,
        hire_date: form.value.hireDate || undefined,
        status: form.value.status,
      });
    } else {
      await erpStore.createEmployee({
        fullName: form.value.fullName,
        position: form.value.position,
        baseSalary: form.value.baseSalary,
        phone: form.value.phone || undefined,
        nin: form.value.nin || undefined,
        hireDate: form.value.hireDate || undefined,
        status: form.value.status,
      });
    }

    closeModal();
    await loadEmployees();
  } catch (err: any) {
    formError.value = err.message || 'Une erreur est survenue lors de la sauvegarde.';
  } finally {
    submitting.value = false;
  }
}

async function confirmDelete(emp: Employee) {
  const confirmMsg = `Êtes-vous sûr de vouloir supprimer / archiver l'employé "${emp.full_name}" ?\n` +
    `Note : S'il possède des fiches de paie historiques, il sera marqué 'TERMINATED' pour préserver la comptabilité.`;

  if (!window.confirm(confirmMsg)) return;

  try {
    await erpStore.deleteEmployee(emp.id);
    await loadEmployees();
  } catch (err: any) {
    alert(err.message || 'Erreur lors de la suppression de l\'employé.');
  }
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

function getInitials(name: string) {
  if (!name) return '??';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}
</script>

<style scoped>
.admin-employees-page {
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

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
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
  font-size: 0.85rem;
  text-transform: uppercase;
  color: #64748b;
  font-weight: 600;
  letter-spacing: 0.05em;
}

.metric-val {
  font-size: 1.75rem;
  font-weight: 800;
  margin: 0.4rem 0 0.25rem 0;
}

.metric-sub {
  font-size: 0.85rem;
  color: #94a3b8;
}

.text-primary {
  color: #2563eb;
}

.text-success {
  color: #16a34a;
}

.text-muted {
  color: #64748b;
}

.text-danger {
  color: #dc2626;
}

.text-dark {
  color: #0f172a;
}

.filters-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 1rem;
  flex-wrap: wrap;
}

.filter-inputs {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  flex: 1;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.filter-group label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #475569;
}

.search-group {
  flex: 1;
  min-width: 250px;
}

.filter-buttons {
  display: flex;
  gap: 0.5rem;
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

.employees-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.table-responsive {
  overflow-x: auto;
}

.employees-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 0.9rem;
}

.employees-table th {
  background: #f8fafc;
  color: #475569;
  font-weight: 600;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e2e8f0;
}

.employees-table td {
  padding: 0.85rem 1rem;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
}

.employees-table tr:hover {
  background: #f8fafc;
}

.emp-identity {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.emp-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: #e0e7ff;
  color: #4338ca;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.85rem;
}

.emp-name-box {
  display: flex;
  flex-direction: column;
}

.emp-fullname {
  font-weight: 600;
  color: #1e293b;
}

.emp-ref {
  font-size: 0.75rem;
  color: #94a3b8;
  font-family: monospace;
}

.position-badge {
  display: inline-block;
  background: #f1f5f9;
  color: #334155;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.82rem;
  font-weight: 500;
}

.status-pill {
  display: inline-block;
  padding: 0.25rem 0.65rem;
  border-radius: 9999px;
  font-size: 0.8rem;
  font-weight: 600;
}

.status-active {
  background: #dcfce7;
  color: #15803d;
}

.status-terminated {
  background: #f1f5f9;
  color: #64748b;
}

.actions-group {
  display: flex;
  gap: 0.35rem;
  justify-content: flex-end;
}

.btn-icon {
  background: none;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  padding: 0.35rem 0.5rem;
  cursor: pointer;
  transition: all 0.15s;
  font-size: 0.9rem;
}

.btn-icon:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.btn-icon-danger:hover {
  background: #fee2e2;
  border-color: #fca5a5;
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

.btn-secondary:hover {
  background: #cbd5e1;
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

/* Modal */
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

.col-12 {
  flex: 0 0 100%;
}

.col-6 {
  flex: 0 0 calc(50% - 0.5rem);
}

.alert-danger {
  background: #fee2e2;
  color: #991b1b;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  margin-bottom: 1rem;
  font-size: 0.9rem;
}
</style>

