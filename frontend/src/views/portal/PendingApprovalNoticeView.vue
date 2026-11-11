<template>
  <div class="pending-notice-view">
    <!-- Status Banner Card -->
    <div class="status-banner-card" :class="statusClass">
      <div class="status-icon">{{ statusIcon }}</div>
      <div class="status-content">
        <div class="status-header-row">
          <span class="status-pill">{{ statusLabel }}</span>
          <button class="btn-refresh" @click="refreshStatus" :disabled="refreshing">
            {{ refreshing ? 'Vérification...' : '↻ Actualiser mon statut' }}
          </button>
        </div>
        <h1 class="status-title">{{ statusHeading }}</h1>
        <p class="status-desc">{{ statusMessage }}</p>

        <div v-if="client?.statusReason" class="reason-box">
          <strong>Motif communiqué par le service commercial :</strong>
          <p>{{ client.statusReason }}</p>
        </div>

        <div v-if="client?.status === 'ACTIVE'" class="approved-cta">
          <router-link to="/" class="btn-primary">
            Accéder au Catalogue Grossiste & Prix B2B →
          </router-link>
        </div>
      </div>
    </div>

    <!-- Dossier Grid -->
    <div v-if="client" class="dossier-grid">
      <!-- Company Info Card -->
      <div class="dossier-card">
        <h2 class="card-title">📋 Informations de l'Entreprise</h2>
        <dl class="info-list">
          <div class="info-row">
            <dt>Raison Sociale</dt>
            <dd><strong>{{ client.name }}</strong></dd>
          </div>
          <div v-if="client.code" class="info-row">
            <dt>Code Client B2B</dt>
            <dd><span class="code-badge">{{ client.code }}</span></dd>
          </div>
          <div class="info-row">
            <dt>Responsable</dt>
            <dd>{{ client.contactPerson || authStore.user?.fullName }}</dd>
          </div>
          <div class="info-row">
            <dt>Téléphone</dt>
            <dd>{{ client.phone || authStore.user?.phone || '-' }}</dd>
          </div>
          <div class="info-row">
            <dt>Wilaya / Adresse</dt>
            <dd>{{ client.wilaya || '-' }} — {{ client.address || '-' }}</dd>
          </div>
          <div class="info-row">
            <dt>Registre de Commerce (RC)</dt>
            <dd class="mono">{{ client.rc || 'Non renseigné' }}</dd>
          </div>
          <div class="info-row">
            <dt>Identifiant Fiscal (NIF)</dt>
            <dd class="mono">{{ client.nif || 'Non renseigné' }}</dd>
          </div>
          <div class="info-row">
            <dt>Article (ART) / NIS</dt>
            <dd class="mono">{{ client.art || '-' }} / {{ client.nis || '-' }}</dd>
          </div>
          <div v-if="client.status === 'ACTIVE'" class="info-row">
            <dt>Plafond de Crédit Autorisé</dt>
            <dd><strong>{{ formatCurrency(client.creditLimit) }}</strong></dd>
          </div>
        </dl>
      </div>

      <!-- Documents Card -->
      <div class="dossier-card">
        <h2 class="card-title">📎 Pièces Justificatives Transmises</h2>
        <p class="card-subtitle">
          Joignez une copie de votre Registre de Commerce (RC) ou Carte Fiscale (NIF) pour accélérer la validation de votre dossier.
        </p>

        <div v-if="client.documents && client.documents.length > 0" class="docs-list">
          <div v-for="doc in client.documents" :key="doc.id" class="doc-item">
            <div class="doc-meta">
              <span class="doc-type-badge">{{ doc.doc_type }}</span>
              <span class="doc-date">Ajouté le {{ formatDate(doc.uploaded_at) }}</span>
            </div>
            <a :href="doc.file_url" target="_blank" rel="noopener" class="doc-link">
              Consulter ↗
            </a>
          </div>
        </div>
        <div v-else class="empty-docs">
          Aucun document justificatif n'a encore été joint à ce dossier.
        </div>

        <!-- Upload Additional Document Form -->
        <form @submit.prevent="handleUploadDoc" class="upload-form">
          <h3 class="upload-title">Ajouter un document justificatif</h3>
          <div v-if="uploadMsg" class="upload-alert">{{ uploadMsg }}</div>
          <div class="upload-controls">
            <select v-model="newDocType" class="doc-select">
              <option value="RC">Registre du Commerce (RC)</option>
              <option value="NIF">Carte Fiscale (NIF)</option>
              <option value="NIS">Identifiant Statistique (NIS)</option>
              <option value="ART">Article d'Imposition (ART)</option>
              <option value="OTHER">Autre pièce</option>
            </select>

            <input
              ref="fileInputRef"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              required
              class="doc-file-input"
              @change="onSelectDocFile"
            />

            <button type="submit" class="btn-upload" :disabled="uploading || !selectedFile">
              {{ uploading ? 'Envoi...' : 'Téléverser' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '../../stores/auth.store';
import { formatCurrency, formatDate } from '../../utils/formatters';

const authStore = useAuthStore();
const refreshing = ref(false);
const uploading = ref(false);
const uploadMsg = ref('');
const newDocType = ref('RC');
const selectedFile = ref<File | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);

const client = computed(() => authStore.client);

onMounted(async () => {
  await refreshStatus();
});

async function refreshStatus() {
  refreshing.value = true;
  try {
    await authStore.fetchMe();
    await authStore.fetchNotifications();
  } finally {
    refreshing.value = false;
  }
}

function onSelectDocFile(e: Event) {
  const input = e.target as HTMLInputElement;
  selectedFile.value = input.files?.[0] || null;
}

async function handleUploadDoc() {
  if (!selectedFile.value) return;
  uploading.value = true;
  uploadMsg.value = '';
  try {
    await authStore.uploadDocument(selectedFile.value, newDocType.value);
    uploadMsg.value = 'Document transmis avec succès !';
    selectedFile.value = null;
    if (fileInputRef.value) fileInputRef.value.value = '';
  } catch (err: any) {
    uploadMsg.value = 'Erreur lors de l’envoi du fichier.';
  } finally {
    uploading.value = false;
  }
}

const statusClass = computed(() => {
  switch (client.value?.status) {
    case 'ACTIVE':
      return 'status-active';
    case 'REJECTED':
    case 'SUSPENDED':
      return 'status-danger';
    default:
      return 'status-pending';
  }
});

const statusIcon = computed(() => {
  switch (client.value?.status) {
    case 'ACTIVE':
      return '✅';
    case 'REJECTED':
      return '❌';
    case 'SUSPENDED':
      return '⛔';
    default:
      return '⏳';
  }
});

const statusLabel = computed(() => {
  switch (client.value?.status) {
    case 'ACTIVE':
      return 'COMPTE PROFESSIONNEL ACTIF';
    case 'REJECTED':
      return 'DOSSIER REFUSÉ';
    case 'SUSPENDED':
      return 'COMPTE SUSPENDU';
    default:
      return 'EN ATTENTE DE VALIDATION COMMERCIALE';
  }
});

const statusHeading = computed(() => {
  switch (client.value?.status) {
    case 'ACTIVE':
      return `Bienvenue ! Votre compte professionnel (${client.value.code}) est opérationnel.`;
    case 'REJECTED':
      return 'Votre demande d’ouverture de compte n’a pas pu être validée.';
    case 'SUSPENDED':
      return 'Votre compte professionnel est temporairement suspendu.';
    default:
      return 'Votre dossier d’agrément B2B est en cours d’examen.';
  }
});

const statusMessage = computed(() => {
  switch (client.value?.status) {
    case 'ACTIVE':
      return 'Vous bénéficiez désormais d’un accès intégral aux tarifs grossistes HT/TTC et à la prise de commande en ligne.';
    case 'REJECTED':
      return 'Vous pouvez consulter le motif ci-dessous et transmettre les pièces justificatives manquantes.';
    case 'SUSPENDED':
      return 'Veuillez contacter notre service comptable et commercial pour régulariser votre situation.';
    default:
      return 'Votre compte est en cours de validation par notre service commercial. Dès vérification de vos identifiants fiscaux (RC / NIF) et attribution de votre code client, vos accès tarifaires seront immédiatement débloqués.';
  }
});
</script>

<style scoped>
.pending-notice-view {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  max-width: 1100px;
  margin: 0 auto;
}

.status-banner-card {
  display: flex;
  gap: 1.5rem;
  padding: 2rem;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
}

.status-pending {
  background-color: var(--color-warning-bg);
  border-color: rgba(171, 110, 5, 0.25);
}

.status-active {
  background-color: var(--color-success-bg);
  border-color: rgba(39, 143, 94, 0.25);
}

.status-danger {
  background-color: var(--color-danger-bg);
  border-color: rgba(204, 41, 41, 0.25);
}

.status-icon {
  font-size: 2.5rem;
  line-height: 1;
}

.status-content {
  flex: 1;
}

.status-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.status-pill {
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  padding: 0.25rem 0.65rem;
  border-radius: var(--radius-full);
  background-color: rgba(0, 0, 0, 0.08);
}

.btn-refresh {
  background-color: #fff;
  border: 1px solid var(--color-border-dark);
  padding: 0.35rem 0.85rem;
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}

.status-title {
  font-size: 1.35rem;
  font-weight: 800;
  margin: 0 0 0.5rem 0;
  color: var(--color-primary);
}

.status-desc {
  font-size: 0.9rem;
  line-height: 1.6;
  color: var(--color-text-primary);
  margin: 0;
}

.reason-box {
  margin-top: 1rem;
  padding: 0.85rem 1rem;
  background-color: rgba(255, 255, 255, 0.75);
  border-left: 3px solid var(--color-danger);
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
}

.reason-box p {
  margin: 0.25rem 0 0 0;
}

.approved-cta {
  margin-top: 1.25rem;
}

.btn-primary {
  display: inline-block;
  background-color: var(--color-primary);
  color: #fff;
  padding: 0.65rem 1.25rem;
  border-radius: var(--radius-sm);
  font-weight: 700;
  font-size: 0.85rem;
  text-decoration: none;
}

/* Dossier Grid */
.dossier-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

.dossier-card {
  background-color: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 1.5rem;
}

.card-title {
  font-size: 1.05rem;
  font-weight: 700;
  margin: 0 0 0.5rem 0;
  color: var(--color-primary);
}

.card-subtitle {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  margin: 0 0 1.25rem 0;
  line-height: 1.4;
}

.info-list {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.info-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--color-border-subtle);
}

.info-row dt {
  color: var(--color-text-secondary);
}

.info-row dd {
  margin: 0;
  text-align: right;
  color: var(--color-text-primary);
}

.mono {
  font-family: var(--font-mono);
  font-size: 0.8rem;
}

.code-badge {
  background-color: var(--color-primary);
  color: #fff;
  padding: 0.15rem 0.5rem;
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-weight: 700;
  font-size: 0.75rem;
}

/* Documents List */
.docs-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.doc-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.65rem 0.85rem;
  background-color: var(--color-bg-subtle);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.doc-meta {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.doc-type-badge {
  background-color: var(--color-primary);
  color: #fff;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.15rem 0.45rem;
  border-radius: var(--radius-sm);
}

.doc-date {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.doc-link {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-primary);
  text-decoration: none;
}

.doc-link:hover {
  text-decoration: underline;
}

.empty-docs {
  padding: 1.25rem;
  background-color: var(--color-bg-subtle);
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  text-align: center;
  margin-bottom: 1.5rem;
}

.upload-form {
  border-top: 1px solid var(--color-border);
  padding-top: 1.25rem;
}

.upload-title {
  font-size: 0.85rem;
  font-weight: 700;
  margin: 0 0 0.75rem 0;
}

.upload-alert {
  font-size: 0.8rem;
  margin-bottom: 0.75rem;
}

.upload-controls {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.doc-select,
.doc-file-input {
  padding: 0.5rem;
  font-size: 0.8rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.btn-upload {
  background-color: var(--color-primary);
  color: #fff;
  border: none;
  padding: 0.55rem 1rem;
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-upload:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .dossier-grid {
    grid-template-columns: 1fr;
  }
}
</style>

