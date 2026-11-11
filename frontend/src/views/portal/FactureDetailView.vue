<template>
  <div class="facture-detail-page">
    <div class="container">
      <!-- Toolbar (Hidden on print) -->
      <div class="doc-toolbar no-print">
        <router-link to="/portal/me/factures" class="btn btn-secondary">
          ← Retour aux factures
        </router-link>
        <div class="toolbar-actions">
          <button @click="handlePrint" class="btn btn-primary">
            🖨️ Imprimer le Document (A4)
          </button>
        </div>
      </div>

      <!-- Voided Watermark/Banner if VOIDED -->
      <div v-if="facture?.status === 'VOIDED'" class="voided-banner no-print">
        <strong>⚠️ DOCUMENT FISCAL ANNULÉ</strong>
        <p>Ce document a été annulé le {{ formatDate(facture.voided_at!) }}. Motif : {{ facture.void_reason }}</p>
      </div>

      <!-- Loading / Error states -->
      <div v-if="financeStore.loading" class="loading-state no-print">
        <div class="spinner"></div>
        <p>Chargement du document fiscal...</p>
      </div>

      <div v-else-if="financeStore.error || !facture" class="error-state no-print">
        <p>{{ financeStore.error || 'Document introuvable.' }}</p>
      </div>

      <!-- Printable A4 Document Container -->
      <div v-else class="a4-document" :class="{ 'is-voided': facture.status === 'VOIDED' }">
        <!-- Void Watermark on Print -->
        <div v-if="facture.status === 'VOIDED'" class="watermark-void">
          ANNULÉ
        </div>

        <!-- 1. Header: Company Brand & Document Title -->
        <div class="doc-header">
          <div class="company-block">
            <div class="company-logo-text">
              <div>
                <h1 class="company-name">{{ facture.company_snapshot?.name || 'SARL OUTILLAGE INDUSTRIEL ALGÉRIE' }}</h1>
                <p class="company-activity">Quincaillerie Industrielle & Fournitures Professionnelles</p>
              </div>
            </div>
            <div class="company-coords">
              <div>{{ facture.company_snapshot?.address }}</div>
              <div>Tél : {{ facture.company_snapshot?.phone }} • Email : {{ facture.company_snapshot?.email }}</div>
              <div>
                RC : <strong>{{ facture.company_snapshot?.rc }}</strong> • 
                NIF : <strong>{{ facture.company_snapshot?.nif }}</strong> • 
                NIS : <strong>{{ facture.company_snapshot?.nis }}</strong>
              </div>
              <div>
                ART : <strong>{{ facture.company_snapshot?.art }}</strong> • 
                Capital : <strong>{{ facture.company_snapshot?.capital }}</strong> • 
                Banque : <strong>{{ facture.company_snapshot?.bank }}</strong>
              </div>
            </div>
          </div>

          <div class="doc-meta-block">
            <h2 class="doc-title">{{ getDocTitle(facture.doc_type) }}</h2>
            <div class="doc-number">{{ facture.facture_number }}</div>
            <div class="doc-date">Date : <strong>{{ formatDate(facture.created_at) }}</strong></div>
            <div class="doc-ref-order">Réf. Commande : <strong>{{ facture.order_number }}</strong></div>
          </div>
        </div>

        <!-- 2. Client Identification Frame -->
        <div class="client-frame">
          <div class="frame-title">DOIT : Renseignements du Client</div>
          <div class="client-grid">
            <div class="client-left">
              <div class="client-name-bold">{{ facture.client_snapshot?.name }}</div>
              <div>Code Client : <strong>{{ facture.client_snapshot?.code || 'N/A' }}</strong></div>
              <div>Adresse : {{ facture.client_snapshot?.address || 'N/A' }} ({{ facture.client_snapshot?.wilaya || 'N/A' }})</div>
              <div>Tél : {{ facture.client_snapshot?.phone || 'N/A' }}</div>
            </div>
            <div class="client-right">
              <div>RC : <strong>{{ facture.client_snapshot?.rc || 'N/A' }}</strong></div>
              <div>NIF : <strong>{{ facture.client_snapshot?.nif || 'N/A' }}</strong></div>
              <div>NIS : <strong>{{ facture.client_snapshot?.nis || 'N/A' }}</strong></div>
              <div>ART : <strong>{{ facture.client_snapshot?.art || 'N/A' }}</strong></div>
              <div v-if="facture.client_snapshot?.activite">Activité : {{ facture.client_snapshot.activite }}</div>
            </div>
          </div>
        </div>

        <!-- 3. Logistics & Payment Bar -->
        <div class="logistics-bar">
          <div class="bar-col">
            <span class="bar-lbl">Mode de Transport :</span>
            <strong>{{ facture.transport_mode || 'Retrait Magasin' }}</strong>
          </div>
          <div v-if="facture.truck_number" class="bar-col">
            <span class="bar-lbl">Matricule :</span>
            <strong>{{ facture.truck_number }}</strong>
          </div>
          <div v-if="facture.driver_name" class="bar-col">
            <span class="bar-lbl">Chauffeur :</span>
            <strong>{{ facture.driver_name }}</strong>
          </div>
          <div class="bar-col">
            <span class="bar-lbl">Mode de Règlement :</span>
            <strong>{{ getPaymentModeLabel(facture.payment_mode) }}</strong>
          </div>
        </div>

        <!-- 4. Items Table -->
        <table class="doc-items-table">
          <thead>
            <tr>
              <th style="width: 35px;">N°</th>
              <th style="width: 100px;">Référence</th>
              <th>Désignation des Marchandises</th>
              <th style="width: 45px;">U/M</th>
              <th class="text-right" style="width: 55px;">Qté</th>
              <th class="text-right" style="width: 95px;">P.U. HT</th>
              <th class="text-right" style="width: 55px;">TVA</th>
              <th class="text-right" style="width: 110px;">Montant HT</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, idx) in facture.items" :key="item.id">
              <td class="text-center">{{ String(idx + 1).padStart(2, '0') }}</td>
              <td class="ref-col">{{ item.reference }}</td>
              <td class="designation-col">{{ item.designation }}</td>
              <td class="text-center">{{ item.unit || 'U' }}</td>
              <td class="text-right font-weight-bold">{{ item.quantity }}</td>
              <td class="text-right">{{ formatCurrency(item.unit_price_ht) }}</td>
              <td class="text-right">{{ item.tva }}%</td>
              <td class="text-right font-weight-bold">{{ formatCurrency(calculateLineHt(item.unit_price_ht, item.quantity)) }}</td>
            </tr>
          </tbody>
        </table>

        <!-- 5. Totals & Legal Amount in Words -->
        <div class="doc-bottom-grid">
          <div class="words-container">
            <div class="words-heading">
              Arrêté la présente facture à la somme de :
            </div>
            <div class="words-body">
              « {{ facture.amount_in_words }} »
            </div>
            <div v-if="facture.timbre > 0" class="timbre-note">
              * Droit de timbre fiscal appliqué conformément aux dispositions de la législation fiscale algérienne (Règlement en espèces).
            </div>
          </div>

          <div class="totals-table-wrapper">
            <table class="totals-table">
              <tr>
                <td>Total Général HT :</td>
                <td class="text-right">{{ formatCurrency(facture.total_ht) }}</td>
              </tr>
              <tr>
                <td>Total TVA (19%) :</td>
                <td class="text-right">{{ formatCurrency(facture.total_tva) }}</td>
              </tr>
              <tr v-if="facture.timbre > 0">
                <td>Droit de Timbre Fiscal :</td>
                <td class="text-right">{{ formatCurrency(facture.timbre) }}</td>
              </tr>
              <tr class="grand-total-row">
                <td>TOTAL TTC (DZD) :</td>
                <td class="text-right">{{ formatCurrency(facture.total_ttc) }}</td>
              </tr>
            </table>
          </div>
        </div>

        <!-- 6. Legal Stamp & Signature Boxes -->
        <div class="signatures-grid">
          <div class="sig-box">
            <div class="sig-title">Accusé de Réception & Cachet Client :</div>
            <div class="sig-subtitle">(Date, Nom et Signature du réceptionnaire)</div>
          </div>
          <div class="sig-box">
            <div class="sig-title">Cachet & Signature de la Direction :</div>
            <div class="sig-subtitle">SARL Outillage Industriel Algérie</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useFinanceStore, Facture } from '../../stores/finance.store';
import { formatCurrency, formatDate } from '../../utils/formatters';

const route = useRoute();
const financeStore = useFinanceStore();

const facture = computed<Facture | null>(() => financeStore.currentFacture);

function getDocTitle(docType: string): string {
  switch (docType) {
    case 'FACTURE': return 'FACTURE';
    case 'BON_LIVRAISON': return 'BON DE LIVRAISON';
    case 'PROFORMA': return 'FACTURE PROFORMA';
    default: return docType;
  }
}

function getPaymentModeLabel(mode: string): string {
  switch (mode) {
    case 'ESPECE':
    case 'CASH': return 'Espèces (Comptoir)';
    case 'CHECK':
    case 'CHEQUE': return 'Chèque Bancaire';
    case 'TRANSFER':
    case 'VIREMENT': return 'Virement Bancaire';
    case 'ON_CREDIT':
    case 'A_CREDIT': return 'À Crédit (Conventionné)';
    default: return mode;
  }
}

function calculateLineHt(price: number, qty: number): number {
  return Number(price) * Number(qty);
}

function handlePrint() {
  window.print();
}

onMounted(async () => {
  const id = parseInt(route.params.id as string, 10);
  if (!isNaN(id)) {
    await financeStore.fetchMyFactureById(id);
  }
});
</script>

<style scoped>
.facture-detail-page {
  padding: 1.5rem 0 3rem;
  background-color: var(--color-bg);
  min-height: calc(100vh - 160px);
}

.doc-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  max-width: 820px;
  margin-left: auto;
  margin-right: auto;
}

.voided-banner {
  background: #fee2e2;
  border: 1px solid #fecaca;
  color: #991b1b;
  padding: 1rem 1.25rem;
  border-radius: 8px;
  margin: 0 auto 1.5rem;
  max-width: 820px;
}

.voided-banner p {
  margin: 0.25rem 0 0;
  font-size: 0.875rem;
}

/* A4 Document Container */
.a4-document {
  background: #ffffff;
  color: #000000;
  max-width: 820px;
  margin: 0 auto;
  padding: 2.25rem;
  border: 1px solid var(--color-border);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  border-radius: 4px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  position: relative;
  font-size: 0.85rem;
  line-height: 1.4;
}

.watermark-void {
  position: absolute;
  top: 40%;
  left: 20%;
  font-size: 6rem;
  font-weight: 900;
  color: rgba(239, 68, 68, 0.15);
  transform: rotate(-30deg);
  pointer-events: none;
  z-index: 10;
}

/* 1. Header */
.doc-header {
  display: flex;
  justify-content: space-between;
  border-bottom: 2px solid #111;
  padding-bottom: 1rem;
  margin-bottom: 1rem;
}

.company-logo-text {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.company-name {
  font-size: 1.15rem;
  font-weight: 800;
  margin: 0;
  color: #111;
}

.company-activity {
  font-size: 0.75rem;
  color: #555;
  margin: 0;
}

.company-coords {
  font-size: 0.75rem;
  color: #444;
  line-height: 1.35;
}

.doc-meta-block {
  text-align: right;
  min-width: 220px;
}

.doc-title {
  font-size: 1.35rem;
  font-weight: 900;
  margin: 0;
  letter-spacing: 0.05em;
  color: #111;
}

.doc-number {
  font-size: 1.1rem;
  font-weight: 700;
  color: #1e3a8a;
  margin: 0.2rem 0;
}

.doc-date, .doc-ref-order {
  font-size: 0.8rem;
  color: #444;
}

/* 2. Client Frame */
.client-frame {
  border: 1px solid #111;
  border-radius: 4px;
  margin-bottom: 1rem;
  overflow: hidden;
}

.frame-title {
  background: #f1f5f9;
  border-bottom: 1px solid #111;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.3rem 0.75rem;
  text-transform: uppercase;
}

.client-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding: 0.6rem 0.75rem;
  gap: 1rem;
  font-size: 0.8rem;
}

.client-name-bold {
  font-size: 0.95rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
}

/* 3. Logistics Bar */
.logistics-bar {
  display: flex;
  justify-content: space-between;
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  padding: 0.4rem 0.75rem;
  border-radius: 4px;
  font-size: 0.78rem;
  margin-bottom: 1rem;
}

.bar-lbl {
  color: #64748b;
  margin-right: 0.25rem;
}

/* 4. Table */
.doc-items-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 1.25rem;
}

.doc-items-table th {
  background: #f1f5f9;
  border: 1px solid #111;
  padding: 0.45rem 0.5rem;
  font-size: 0.75rem;
  text-transform: uppercase;
  font-weight: 700;
}

.doc-items-table td {
  border: 1px solid #cbd5e1;
  padding: 0.45rem 0.5rem;
  font-size: 0.8rem;
}

.ref-col {
  font-family: monospace;
  font-size: 0.75rem;
}

.designation-col {
  font-weight: 500;
}

/* 5. Bottom Grid */
.doc-bottom-grid {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
  align-items: start;
}

.words-container {
  border: 1px solid #cbd5e1;
  padding: 0.75rem 1rem;
  border-radius: 4px;
  background: #fafafa;
}

.words-heading {
  font-size: 0.75rem;
  font-weight: 600;
  color: #555;
  margin-bottom: 0.25rem;
}

.words-body {
  font-weight: 600;
  font-style: italic;
  font-size: 0.85rem;
  color: #111;
  text-transform: capitalize;
}

.timbre-note {
  font-size: 0.7rem;
  color: #666;
  margin-top: 0.5rem;
}

.totals-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
}

.totals-table td {
  padding: 0.35rem 0.5rem;
  border-bottom: 1px solid #e2e8f0;
}

.grand-total-row td {
  border-top: 2px solid #111;
  border-bottom: 2px solid #111;
  font-size: 0.95rem;
  font-weight: 800;
  color: #111;
  padding: 0.5rem;
}

/* 6. Signatures */
.signatures-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin-top: 2rem;
}

.sig-box {
  border: 1px solid #111;
  height: 90px;
  padding: 0.5rem;
  border-radius: 4px;
}

.sig-title {
  font-size: 0.75rem;
  font-weight: 700;
}

.sig-subtitle {
  font-size: 0.7rem;
  color: #666;
}

.text-right { text-align: right; }
.text-center { text-align: center; }
.font-weight-bold { font-weight: 700; }

/* Print Styles */
@media print {
  @page {
    size: A4 portrait;
    margin: 8mm 10mm;
  }

  body {
    background: #ffffff !important;
    color: #000000 !important;
  }

  .no-print {
    display: none !important;
  }

  .facture-detail-page {
    padding: 0 !important;
    background: transparent !important;
  }

  .a4-document {
    border: none !important;
    box-shadow: none !important;
    padding: 0 !important;
    max-width: 100% !important;
    width: 100% !important;
  }

  .doc-items-table th {
    background: #e2e8f0 !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
}
</style>

