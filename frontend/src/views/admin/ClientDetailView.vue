<template>
  <div class="client-detail-view">
    <div class="top-nav">
      <router-link to="/admin/clients/pending" class="back-link">
        ← Retour à la liste des clients
      </router-link>
    </div>

    <div v-if="loading" class="loading-box">Chargement du profil client...</div>
    <div v-else-if="!client" class="error-box">Client introuvable.</div>

    <template v-else>
      <div class="profile-header-card">
        <div class="header-main">
          <div class="badges-row">
            <span class="status-badge" :class="client.status.toLowerCase()">
              {{ client.status }}
            </span>
            <span v-if="client.code" class="code-badge">{{ client.code }}</span>
          </div>
          <h1 class="client-title">{{ client.name }}</h1>
          <p class="client-meta">
            Responsable : <strong>{{ client.contact_person || '-' }}</strong> •
            Tél : <strong>{{ client.phone || '-' }}</strong> •
            Wilaya : <strong>{{ client.wilaya || '-' }}</strong>
          </p>
        </div>

        <div class="financial-summary">
          <div class="fin-item">
            <span class="fin-label">Solde Actuel</span>
            <span class="fin-val">{{ formatCurrency(client.current_balance) }}</span>
          </div>
          <div class="fin-item">
            <span class="fin-label">Plafond de Crédit</span>
            <span class="fin-val">{{ formatCurrency(client.credit_limit) }}</span>
          </div>
          <div class="fin-item-action">
            <router-link :to="`/admin/clients/${client.id}/ledger`" class="btn btn-sm btn-outline">
              📊 Grand Livre →
            </router-link>
          </div>
        </div>
      </div>

      <div class="detail-grid">
        <div class="detail-card">
          <h3>Coordonnées Légales & Fiscales</h3>
          <div class="kv-list">
            <div class="kv-row"><span>Registre du Commerce (RC)</span> <strong class="mono">{{ client.rc || '-' }}</strong></div>
            <div class="kv-row"><span>Identifiant Fiscal (NIF)</span> <strong class="mono">{{ client.nif || '-' }}</strong></div>
            <div class="kv-row"><span>Article d'Imposition (ART)</span> <strong class="mono">{{ client.art || '-' }}</strong></div>
            <div class="kv-row"><span>Identifiant Statistique (NIS)</span> <strong class="mono">{{ client.nis || '-' }}</strong></div>
            <div class="kv-row"><span>Activité</span> <strong>{{ client.activite || '-' }}</strong></div>
            <div class="kv-row"><span>Adresse</span> <strong>{{ client.address || '-' }}</strong></div>
            <div class="kv-row"><span>Email Compte</span> <strong>{{ client.email || client.user_email || '-' }}</strong></div>
            <div v-if="client.approved_by_name" class="kv-row">
              <span>Approuvé par</span>
              <strong>{{ client.approved_by_name }} ({{ formatDate(client.approved_at) }})</strong>
            </div>
          </div>
        </div>

        <div class="detail-card">
          <h3>Pièces Justificatives ({{ client.documents?.length || 0 }})</h3>
          <div v-if="client.documents && client.documents.length > 0" class="doc-list">
            <div v-for="doc in client.documents" :key="doc.id" class="doc-row">
              <div>
                <span class="doc-tag">{{ doc.doc_type }}</span>
                <span class="doc-date">Téléversé le {{ formatDate(doc.uploaded_at) }}</span>
              </div>
              <a :href="doc.file_url" target="_blank" rel="noopener" class="doc-open-btn">
                Visualiser ↗
              </a>
            </div>
          </div>
          <p v-else class="empty-text">Aucun scan de document fourni.</p>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import api from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/formatters';

const route = useRoute();
const client = ref<any | null>(null);
const loading = ref(false);

onMounted(async () => {
  loading.value = true;
  try {
    const res = await api.get(`/admin/clients/${route.params.id}`);
    client.value = res.data.data;
  } catch (err) {
    console.error('Failed to load client detail', err);
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.client-detail-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.back-link {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-decoration: none;
}

.back-link:hover {
  color: var(--color-primary);
}

.profile-header-card {
  background-color: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 1.75rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1.5rem;
}

.badges-row {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.status-badge {
  font-size: 0.7rem;
  font-weight: 800;
  padding: 0.2rem 0.55rem;
  border-radius: var(--radius-sm);
  text-transform: uppercase;
}

.status-badge.active { background: var(--color-success-bg); color: var(--color-success); }
.status-badge.pending { background: var(--color-warning-bg); color: var(--color-warning); }
.status-badge.rejected, .status-badge.suspended { background: var(--color-danger-bg); color: var(--color-danger); }

.code-badge {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 700;
  background-color: var(--color-primary);
  color: #fff;
  padding: 0.2rem 0.55rem;
  border-radius: var(--radius-sm);
}

.client-title {
  font-size: 1.5rem;
  font-weight: 800;
  margin: 0 0 0.35rem 0;
}

.client-meta {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  margin: 0;
}

.financial-summary {
  display: flex;
  gap: 1.5rem;
}

.fin-item {
  background-color: var(--color-bg-subtle);
  border: 1px solid var(--color-border);
  padding: 0.85rem 1.25rem;
  border-radius: var(--radius-sm);
  display: flex;
  flex-direction: column;
}

.fin-label {
  font-size: 0.72rem;
  color: var(--color-text-secondary);
  text-transform: uppercase;
}

.fin-val {
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--color-primary);
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

.detail-card {
  background-color: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 1.5rem;
}

.detail-card h3 {
  font-size: 1rem;
  font-weight: 700;
  margin: 0 0 1rem 0;
}

.kv-list {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.kv-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--color-border-subtle);
}

.kv-row span {
  color: var(--color-text-secondary);
}

.mono {
  font-family: var(--font-mono);
}

.doc-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.doc-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.65rem 0.85rem;
  background-color: var(--color-bg-subtle);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.doc-tag {
  background-color: var(--color-primary);
  color: #fff;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
  margin-right: 0.5rem;
}

.doc-date {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.doc-open-btn {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--color-primary);
  text-decoration: none;
}
</style>

