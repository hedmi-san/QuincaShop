<template>
  <div class="auth-page">
    <div class="auth-card register-card">
      <div class="auth-header">
        <router-link to="/">
          <img src="/src/assets/images/logo.png" alt="Logo" class="auth-logo" />
        </router-link>
        <h1 class="auth-title">Demande d'Ouverture de Compte B2B</h1>
        <p class="auth-subtitle">
          Réservé aux revendeurs, quincailleries, entreprises du BTP et professionnels.
        </p>
      </div>

      <!-- Success State -->
      <div v-if="success" class="alert-success">
        <h3>✅ Demande Enregistrée avec Succès !</h3>
        <p>
          Votre dossier d'agrément a été transmis à notre service commercial. Votre compte est actuellement en attente d'approbation (Statut : <strong>PENDING</strong>).
        </p>
        <p>
          Dès validation de vos coordonnées commerciales et attribution de votre code client, vos accès aux prix grossistes et au panier seront activés.
        </p>
        <router-link to="/login" class="btn-primary-block">
          Aller vers la page de connexion
        </router-link>
      </div>

      <!-- Form State -->
      <form v-else @submit.prevent="handleRegister" class="auth-form">
        <div v-if="errorMsg" class="alert-error">
          {{ errorMsg }}
        </div>

        <h3 class="form-section-title">1. Identifiants de Connexion</h3>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Email Professionnel *</label>
            <input v-model="form.email" type="email" required placeholder="contact@entreprise.dz" class="form-input" />
          </div>
          <div class="form-group">
            <label class="form-label">Mot de passe *</label>
            <input v-model="form.password" type="password" required minlength="8" placeholder="Au moins 8 car., 1 majuscule, 1 chiffre" class="form-input" />
          </div>
        </div>

        <h3 class="form-section-title">2. Responsable & Contact</h3>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Nom Complet *</label>
            <input v-model="form.fullName" type="text" required placeholder="Ex: Karim Bouzid" class="form-input" />
          </div>
          <div class="form-group">
            <label class="form-label">Téléphone Direct *</label>
            <input v-model="form.phone" type="tel" required placeholder="0550 12 34 56" class="form-input" />
          </div>
        </div>

        <h3 class="form-section-title">3. Coordonnées de l'Entreprise</h3>
        <div class="form-grid">
          <div class="form-group span-2">
            <label class="form-label">Raison Sociale / Nom Commercial *</label>
            <input v-model="form.companyName" type="text" required placeholder="Ex: SARL BTP Outillage Algérie" class="form-input" />
          </div>
          <div class="form-group span-2">
            <label class="form-label">Adresse Siège / Dépôt</label>
            <input v-model="form.address" type="text" placeholder="Zone Industrielle Oued Smar, Lot 14" class="form-input" />
          </div>
          <div class="form-group">
            <label class="form-label">Wilaya</label>
            <input v-model="form.wilaya" type="text" placeholder="Alger" class="form-input" />
          </div>
          <div class="form-group">
            <label class="form-label">Activité Commerciale</label>
            <input v-model="form.activite" type="text" placeholder="Commerce de gros / BTP / Installation" class="form-input" />
          </div>
        </div>

        <h3 class="form-section-title">4. Registre du Commerce & Fiscalité (Facultatif à l'inscription)</h3>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">N° Registre Commerce (RC)</label>
            <input v-model="form.rc" type="text" placeholder="16/00-1234567B19" class="form-input" />
          </div>
          <div class="form-group">
            <label class="form-label">N° Identifiant Fiscal (NIF)</label>
            <input v-model="form.nif" type="text" placeholder="001916001234567" class="form-input" />
          </div>
        </div>

        <button type="submit" class="btn-submit" :disabled="loading">
          {{ loading ? 'Transmission du dossier...' : 'Envoyer ma Demande d’Ouverture de Compte' }}
        </button>
      </form>

      <div class="auth-footer">
        <p>
          Déjà titulaire d'un compte agréé ?
          <router-link to="/login" class="link-highlight">Connectez-vous ici</router-link>
        </p>
        <router-link to="/" class="link-back">← Retour au catalogue public</router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useAuthStore } from '../../stores/auth.store';

const authStore = useAuthStore();

const form = reactive({
  email: '',
  password: '',
  fullName: '',
  phone: '',
  companyName: '',
  address: '',
  wilaya: '',
  activite: '',
  rc: '',
  nif: '',
});

const loading = ref(false);
const errorMsg = ref('');
const success = ref(false);

async function handleRegister() {
  loading.value = true;
  errorMsg.value = '';
  try {
    await authStore.register(form);
    success.value = true;
  } catch (err: any) {
    errorMsg.value = authStore.error || 'Une erreur est survenue lors de l’inscription';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-bg-subtle);
  padding: 2.5rem 1rem;
}

.auth-card {
  width: 100%;
  background-color: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 2.5rem 2rem;
  box-shadow: var(--shadow-modal);
}

.register-card {
  max-width: 680px;
}

.auth-header {
  text-align: center;
  margin-bottom: 2rem;
}

.auth-logo {
  height: 48px;
  margin-bottom: 1rem;
  object-fit: contain;
}

.auth-title {
  font-size: 1.35rem;
  font-weight: 800;
  color: var(--color-primary);
  margin: 0 0 0.5rem 0;
}

.auth-subtitle {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  line-height: 1.4;
  margin: 0;
}

.form-section-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--color-primary);
  border-bottom: 1px solid var(--color-border-subtle);
  padding-bottom: 0.4rem;
  margin: 1.25rem 0 0.75rem 0;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.span-2 {
  grid-column: span 2;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.form-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.form-input {
  padding: 0.6rem 0.75rem;
  font-size: 0.85rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background-color: var(--color-bg);
  outline: none;
}

.form-input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(23, 23, 23, 0.08);
}

.btn-submit {
  background-color: var(--color-primary);
  color: #fff;
  border: none;
  padding: 0.85rem;
  border-radius: var(--radius-sm);
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  margin-top: 1.5rem;
  transition: background-color 0.15s;
}

.btn-submit:hover:not(:disabled) {
  background-color: var(--color-primary-hover);
}

.alert-error {
  background-color: var(--color-danger-bg);
  color: var(--color-danger);
  border: 1px solid rgba(204, 41, 41, 0.2);
  padding: 0.75rem 1rem;
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  margin-bottom: 1rem;
}

.alert-success {
  background-color: var(--color-success-bg);
  border: 1px solid rgba(39, 143, 94, 0.2);
  padding: 2rem;
  border-radius: var(--radius-md);
  text-align: center;
}

.alert-success h3 {
  color: var(--color-success);
  font-size: 1.25rem;
  margin: 0 0 1rem 0;
}

.alert-success p {
  font-size: 0.9rem;
  color: #171717;
  line-height: 1.6;
  margin-bottom: 1rem;
}

.btn-primary-block {
  display: inline-block;
  background-color: var(--color-primary);
  color: #fff;
  padding: 0.75rem 1.5rem;
  border-radius: var(--radius-sm);
  text-decoration: none;
  font-weight: 700;
  font-size: 0.9rem;
  margin-top: 1rem;
}

.auth-footer {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--color-border);
  text-align: center;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.link-highlight {
  color: var(--color-primary);
  font-weight: 600;
  text-decoration: underline;
}

.link-back {
  color: var(--color-text-secondary);
  text-decoration: none;
}

.link-back:hover {
  color: var(--color-primary);
}

@media (max-width: 640px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
  .span-2 {
    grid-column: span 1;
  }
}
</style>

