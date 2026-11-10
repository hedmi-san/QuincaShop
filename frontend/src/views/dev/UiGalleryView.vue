<template>
  <div class="ui-gallery-page" dir="ltr">
    <!-- Gallery Top Bar -->
    <div class="gallery-toolbar">
      <div class="toolbar-brand">
        <Icon name="palette" :size="20" class="toolbar-icon" />
        <strong>Antigravity Living UI Gallery</strong>
        <span class="gallery-tag font-mono">/dev/ui</span>
      </div>

      <div class="toolbar-controls">
        <router-link to="/admin/orders">
          <Button variant="ghost" size="dense" icon="layout-dashboard">Admin</Button>
        </router-link>
        <router-link to="/">
          <Button variant="ghost" size="dense" icon="store">Boutique</Button>
        </router-link>
      </div>
    </div>

    <div class="gallery-container">
      <PageHeader
        title="Galerie des Composants & Primitives UI"
        subtitle="Spécimen de référence pour l'application industrielle QuincaShop (contrat de design B2B)"
        :breadcrumbs="[
          { label: 'Accueil', to: '/' },
          { label: 'Design System', to: '/dev/ui' },
          { label: 'Primitives' }
        ]"
      >
        <template #actions>
          <Button variant="secondary" size="dense" icon="download" @click="showToast('Export de spécifications lancé')">
            Exporter Spécifications
          </Button>
          <Button variant="primary" size="dense" icon="check" @click="openConfirm">
            Valider le Design
          </Button>
        </template>
      </PageHeader>

      <!-- Section 1: Palette & Typography -->
      <section class="gallery-section">
        <h2 class="section-heading">1. Palette & Rôles Sémantiques (Tokens)</h2>
        <div class="token-grid">
          <div class="color-chip" style="background: var(--color-ink); color: #fff;">
            <span class="chip-name">Ink</span>
            <span class="chip-hex font-mono">#0f172a</span>
          </div>
          <div class="color-chip" style="background: var(--color-surface); color: var(--color-ink); border: 1px solid var(--color-line);">
            <span class="chip-name">Surface</span>
            <span class="chip-hex font-mono">#ffffff</span>
          </div>
          <div class="color-chip" style="background: var(--color-subtle); color: var(--color-ink); border: 1px solid var(--color-line);">
            <span class="chip-name">Subtle</span>
            <span class="chip-hex font-mono">#f8fafc</span>
          </div>
          <div class="color-chip" style="background: var(--color-brand); color: #fff;">
            <span class="chip-name">Brand</span>
            <span class="chip-hex font-mono">#12161a</span>
          </div>
          <div class="color-chip" style="background: var(--color-accent); color: #fff;">
            <span class="chip-name">Accent</span>
            <span class="chip-hex font-mono">#d97706</span>
          </div>
          <div class="color-chip" style="background: var(--color-success-tint); color: var(--color-success-text); border: 1px solid var(--color-success-border);">
            <span class="chip-name">Success</span>
            <span class="chip-hex font-mono">#15803d</span>
          </div>
          <div class="color-chip" style="background: var(--color-warning-tint); color: var(--color-warning-text); border: 1px solid var(--color-warning-border);">
            <span class="chip-name">Warning</span>
            <span class="chip-hex font-mono">#b45309</span>
          </div>
          <div class="color-chip" style="background: var(--color-danger-tint); color: var(--color-danger-text); border: 1px solid var(--color-danger-border);">
            <span class="chip-name">Danger</span>
            <span class="chip-hex font-mono">#b91c1c</span>
          </div>
        </div>
      </section>

      <!-- Section 2: Buttons & Actions -->
      <section class="gallery-section">
        <h2 class="section-heading">2. Boutons & Actions (Button)</h2>
        <Card>
          <div class="component-demo-flow">
            <div class="demo-row">
              <span class="row-label">Variantes :</span>
              <Button variant="primary" icon="plus">Action Principale</Button>
              <Button variant="secondary" icon="printer">Action Secondaire</Button>
              <Button variant="ghost" icon="edit">Action Fantôme</Button>
              <Button variant="danger" icon="trash-2">Action Destructive</Button>
            </div>
            <div class="demo-row">
              <span class="row-label">Tailles (36 / 40 / 44) :</span>
              <Button size="dense" variant="secondary">Dense (36px)</Button>
              <Button size="default" variant="secondary">Défaut (40px)</Button>
              <Button size="touch" variant="secondary">Tactile (44px)</Button>
            </div>
            <div class="demo-row">
              <span class="row-label">États :</span>
              <Button variant="primary" loading>En cours...</Button>
              <Button variant="secondary" disabled>Désactivé</Button>
              <Button variant="secondary" icon="search" icon-only aria-label="Rechercher" />
              <Button variant="ghost" icon="more-vertical" icon-only aria-label="Options" />
            </div>
          </div>
        </Card>
      </section>

      <!-- Section 3: Form Controls -->
      <section class="gallery-section">
        <h2 class="section-heading">3. Champs de Saisie & Formulaires (Input, Select, FormField)</h2>
        <Card>
          <div class="form-grid">
            <FormField label="Numéro de Registre du Commerce" required helper="Exemple : 16/00-0123456B16">
              <Input v-model="sampleRc" placeholder="16/00-0123456B16" prefix-icon="file-text" clearable />
            </FormField>

            <FormField label="Statut du client" required>
              <Select v-model="sampleSelect" :options="statusOptions" />
            </FormField>

            <FormField label="Montant à créditer" required error="Le montant dépasse l'encours maximal autorisé">
              <Input model-value="950000" prefix-icon="coins" suffix-icon="alert-circle" />
            </FormField>

            <FormField label="Observation & Remarques">
              <Textarea placeholder="Précisez les instructions particulières pour l'atelier..." :rows="2" />
            </FormField>
          </div>
        </Card>
      </section>

      <!-- Section 4: Status Pills & Formats -->
      <section class="gallery-section">
        <h2 class="section-heading">4. Pilules de Statut (StatusPill) & Formats Tabulaires (Money, DateTime, Phone)</h2>
        <Card>
          <div class="pills-showcase">
            <div class="pills-group">
              <span class="group-label">Agréments Clients :</span>
              <StatusPill status="PENDING" />
              <StatusPill status="ACTIVE" />
              <StatusPill status="SUSPENDED" />
              <StatusPill status="REJECTED" />
            </div>

            <div class="pills-group">
              <span class="group-label">Commandes B2B :</span>
              <StatusPill status="CONFIRMED" />
              <StatusPill status="PREPARING" />
              <StatusPill status="READY" />
              <StatusPill status="DELIVERED" />
              <StatusPill status="CANCELLED" />
            </div>

            <div class="pills-group">
              <span class="group-label">Factures & Comptabilité :</span>
              <StatusPill status="ISSUED" />
              <StatusPill status="PAID" />
              <StatusPill status="PARTIAL" />
              <StatusPill status="VOIDED" />
              <StatusPill status="CREDIT_NOTE" />
            </div>
          </div>

          <div class="financial-formats-grid">
            <div class="format-card">
              <span class="format-label">Montant Positif (TTC)</span>
              <Money :amount="11007.5" />
            </div>
            <div class="format-card">
              <span class="format-label">Solde Neutre (0,00 DA non rouge)</span>
              <Money :amount="0" />
            </div>
            <div class="format-card">
              <span class="format-label">Avoir / Solde Négatif</span>
              <Money :amount="-83598" highlight-negative />
            </div>
            <div class="format-card">
              <span class="format-label">Date & Heure Standard</span>
              <DateTime value="2026-11-10T10:30:00Z" include-time />
            </div>
            <div class="format-card">
              <span class="format-label">Téléphone LTR Fixé</span>
              <Phone value="+213 (0) 23 92 11 22" link />
            </div>
          </div>
        </Card>
      </section>

      <!-- Section 5: Complex Data Table -->
      <section class="gallery-section">
        <h2 class="section-heading">5. Tableau de Données Complexe (DataTable)</h2>
        <div class="table-demo-bar">
          <FilterBar
            v-model:search="tableSearch"
            search-placeholder="Rechercher facture, client..."
            :filters="tableFilters"
            show-reset
            @select-chip="onFilterSelect"
            @reset="tableSearch = ''"
          >
            <template #actions>
              <Button
                variant="secondary"
                size="dense"
                :icon="tableDataMode === 'empty' ? 'database' : 'slash'"
                @click="toggleTableData"
              >
                {{ tableDataMode === 'empty' ? 'Charger données (5)' : 'Simuler vide (0)' }}
              </Button>
            </template>
          </FilterBar>

          <DataTable
            :columns="tableColumns"
            :data="displayedTableData"
            :current-page="1"
            :total-pages="3"
            :total-count="24"
            row-clickable
            @row-click="onRowClick"
          >
            <template #cell-actions>
              <div class="table-actions-cell">
                <Button variant="ghost" size="dense" icon="eye" icon-only aria-label="Consulter" />
                <Button variant="ghost" size="dense" icon="printer" icon-only aria-label="Imprimer" />
              </div>
            </template>
          </DataTable>
        </div>
      </section>

      <!-- Section 6: Cards, KeyValueList & Empty States -->
      <section class="gallery-section">
        <h2 class="section-heading">6. Fiche Détail (Card & KeyValueList) & État Vide (EmptyState)</h2>
        <div class="detail-grid">
          <Card title="Informations Entreprise & Dossier Fiscal">
            <KeyValueList
              :items="[
                { key: 'company', label: 'Raison Sociale', value: 'EURL Quincaillerie Centrale' },
                { key: 'rc', label: 'Registre Commerce', value: '16/00-0123456B16' },
                { key: 'nif', label: 'NIF Fiscal', value: '001616012345678' },
                { key: 'limit', label: 'Plafond de Crédit', value: '500 000,00 DA' },
                { key: 'art', label: 'Article d’Imposition', value: '-' },
              ]"
            />
          </Card>

          <Card title="État Vide Modulaire">
            <EmptyState
              icon="file-search"
              title="Aucun document trouvé"
              message="Aucun bordereau de livraison ni bon de commande n'a été créé pour cette période."
              action-label="Créer une Commande"
              action-icon="plus"
              @action="showToast('Ouverture du bon de commande')"
            />
          </Card>
        </div>
      </section>
    </div>

    <!-- Interactive Confirm Dialog Demo -->
    <ConfirmDialog
      :open="confirmOpen"
      title="Validation du Design System"
      message="Confirmez-vous la conformité de l'ensemble des primitives et tokens présentés ?"
      entity-name="Fondation Antigravity UI (Phase A)"
      confirm-label="Valider la Fondation"
      @confirm="onConfirmSuccess"
      @cancel="confirmOpen = false"
    />

    <!-- Active Toast Notifications -->
    <div class="gallery-toast-container">
      <Toast
        v-if="toastMsg"
        :message="toastMsg"
        tone="success"
        @close="toastMsg = ''"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  Icon,
  Button,
  Input,
  Select,
  Textarea,
  FormField,
  StatusPill,
  Card,
  PageHeader,
  FilterBar,
  DataTable,
  EmptyState,
  ConfirmDialog,
  Money,
  DateTime,
  Phone,
  KeyValueList,
  Toast,
} from '../../components/ui';

const sampleRc = ref('16/00-0123456B16');
const sampleSelect = ref('ACTIVE');
const statusOptions = [
  { value: 'ACTIVE', label: 'Actif (Validé)' },
  { value: 'PENDING', label: 'En attente d’agrément' },
  { value: 'SUSPENDED', label: 'Suspendu (Risque impayé)' },
  { value: 'REJECTED', label: 'Dossier rejeté' },
];

const confirmOpen = ref(false);
const toastMsg = ref('');

function showToast(msg: string) {
  toastMsg.value = msg;
}

function openConfirm() {
  confirmOpen.value = true;
}

function onConfirmSuccess() {
  confirmOpen.value = false;
  showToast('Design System validé avec succès !');
}

// Table Demo
const tableSearch = ref('');
const tableDataMode = ref<'data' | 'empty'>('data');
const tableFilters = ref([
  { id: 'all', label: 'Tous', count: 24, active: true },
  { id: 'issued', label: 'Validées', count: 18, active: false },
  { id: 'voided', label: 'Annulées', count: 6, active: false },
]);

function onFilterSelect(id: string) {
  tableFilters.value.forEach(f => f.active = f.id === id);
}

function toggleTableData() {
  tableDataMode.value = tableDataMode.value === 'data' ? 'empty' : 'data';
}

const tableColumns = [
  { key: 'invoice_number', label: 'N° Facture', role: 'id' as const, width: '150px' },
  { key: 'client_name', label: 'Client / Entité B2B', role: 'text' as const },
  { key: 'date', label: 'Date émission', role: 'text' as const, width: '120px' },
  { key: 'total_ttc', label: 'Montant TTC', role: 'numeric' as const, isCurrency: true, width: '160px' },
  { key: 'status', label: 'Statut', role: 'status' as const, width: '130px' },
  { key: 'actions', label: 'Actions', role: 'actions' as const, width: '100px' },
];

const sampleRows = [
  {
    id: 1,
    invoice_number: 'FAC-2026-0004',
    client_name: 'EURL Quincaillerie Centrale (Alger)',
    date: '09/11/2026',
    total_ttc: 11007.50,
    status: 'ISSUED',
  },
  {
    id: 2,
    invoice_number: 'FAC-2026-0003',
    client_name: 'SARL BTP Haddad Construction',
    date: '08/11/2026',
    total_ttc: 73780.00,
    status: 'ISSUED',
  },
  {
    id: 3,
    invoice_number: 'FAC-2026-0002',
    client_name: 'مؤسسة البشير للأشغال والمعدات الصناعية',
    date: '07/11/2026',
    total_ttc: -83598.00,
    status: 'VOIDED',
  },
  {
    id: 4,
    invoice_number: 'CMD-2026-0014',
    client_name: 'Client Comptoir (Vente Directe Atelier)',
    date: '06/11/2026',
    total_ttc: 0.00,
    status: 'PENDING',
  },
  {
    id: 5,
    invoice_number: 'BL-2026-0001',
    client_name: 'SARL Outillage Professionnel Oran',
    date: '05/11/2026',
    total_ttc: 489200.00,
    status: 'READY',
  },
];

const displayedTableData = computed(() => {
  if (tableDataMode.value === 'empty') return [];
  if (!tableSearch.value.trim()) return sampleRows;
  const q = tableSearch.value.toLowerCase();
  return sampleRows.filter(r =>
    r.invoice_number.toLowerCase().includes(q) ||
    r.client_name.toLowerCase().includes(q)
  );
});

function onRowClick(row: any) {
  showToast(`Ligne cliquée : ${row.invoice_number}`);
}
</script>

<style scoped>
.ui-gallery-page {
  min-height: 100vh;
  background-color: var(--color-subtle);
  color: var(--color-ink);
  font-family: var(--font-sans);
}

.gallery-toolbar {
  min-height: 52px;
  background-color: var(--color-brand);
  color: #fff;
  padding: var(--space-2) var(--space-4);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
}

.toolbar-brand {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--font-size-sm);
  white-space: nowrap;
}

.toolbar-icon {
  color: var(--color-accent);
}

.gallery-tag {
  background: rgba(255, 255, 255, 0.15);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
}

.toolbar-controls {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

@media (max-width: 640px) {
  .gallery-toolbar {
    padding: var(--space-2);
  }
  .toolbar-brand strong {
    display: none;
  }
}

.gallery-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.gallery-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.section-heading {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-ink);
  border-bottom: 2px solid var(--color-line);
  padding-bottom: var(--space-2);
  margin: 0;
}

/* Tokens */
.token-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: var(--space-3);
}

.color-chip {
  height: 80px;
  border-radius: var(--radius-card);
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-shadow: var(--shadow-sm);
}

.chip-name {
  font-size: var(--font-size-sm);
  font-weight: 600;
}
.chip-hex {
  font-size: var(--font-size-xs);
  opacity: 0.85;
}

/* Demo Flow */
.component-demo-flow {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.demo-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.row-label {
  width: 160px;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  font-weight: 500;
}

/* Form Grid */
.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-4);
}

/* Pills & Formats */
.pills-showcase {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-bottom: var(--space-5);
}

.pills-group {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.group-label {
  width: 180px;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  font-weight: 500;
}

.financial-formats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-3);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-line);
}

.format-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  background-color: var(--color-subtle);
  padding: var(--space-3);
  border-radius: var(--radius-control);
  border: 1px solid var(--color-line);
}

.format-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

/* Table Demo */
.table-demo-bar {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.table-actions-cell {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 2px;
}

/* Details Grid */
.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}

.gallery-toast-container {
  position: fixed;
  bottom: var(--space-5);
  right: var(--space-5);
  z-index: var(--z-toast);
}

@media (max-width: 768px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
  .row-label,
  .group-label {
    width: 100%;
    margin-bottom: var(--space-1);
  }
}
</style>
