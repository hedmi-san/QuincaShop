<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-header">
        <router-link to="/" class="auth-brand-badge" title="Retour à l'accueil">
          <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
            <line x1="12" y1="22.08" x2="12" y2="12"></line>
          </svg>
        </router-link>
        <h1 class="auth-title">Connexion Espace B2B</h1>
        <p class="auth-subtitle">Accédez à vos conditions tarifaires grossistes et commandes en ligne.</p>
      </div>

      <div v-if="errorMsg" class="alert-error">
        {{ errorMsg }}
      </div>

      <form @submit.prevent="handleLogin" class="auth-form">
        <div class="form-group">
          <label for="email" class="form-label">Adresse Email Professionnelle</label>
          <input
            id="email"
            v-model="email"
            type="email"
            required
            placeholder="contact@votre-societe.dz"
            class="form-input"
          />
        </div>

        <div class="form-group">
          <div class="label-row">
            <label for="password" class="form-label">Mot de Passe</label>
          </div>
          <input
            id="password"
            v-model="password"
            type="password"
            required
            placeholder="••••••••"
            class="form-input"
          />
        </div>

        <button type="submit" class="btn-submit" :disabled="loading">
          {{ loading ? 'Connexion en cours...' : 'Se Connecter' }}
        </button>
      </form>

      <div class="auth-footer">
        <p>
          Pas encore de compte revendeur ?
          <router-link to="/register" class="link-highlight">Ouvrir un compte professionnel</router-link>
        </p>
        <router-link to="/" class="link-back">← Retour au catalogue public</router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../../stores/auth.store';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const email = ref('');
const password = ref('');
const loading = ref(false);
const errorMsg = ref('');

async function handleLogin() {
  loading.value = true;
  errorMsg.value = '';
  try {
    await authStore.login({
      email: email.value.trim(),
      password: password.value,
    });

    const redirectQuery = route.query.redirect as string;
    if (redirectQuery) {
      router.push(redirectQuery);
    } else if (authStore.isStaff) {
      router.push('/admin/clients/pending');
    } else if (authStore.isPendingClient) {
      router.push('/portal/pending');
    } else {
      router.push('/');
    }
  } catch (err: any) {
    errorMsg.value = authStore.error || 'Identifiants invalides';
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
  padding: 2rem 1rem;
}

.auth-card {
  width: 100%;
  max-width: 440px;
  background-color: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 2.5rem 2rem;
  box-shadow: var(--shadow-lg);
}

.auth-header {
  text-align: center;
  margin-bottom: 2rem;
}

.auth-brand-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: var(--radius-md);
  background-color: var(--color-bg-subtle, #f1f5f9);
  border: 1px solid var(--color-border);
  color: var(--color-amber, #ea580c);
  margin-bottom: 1rem;
  transition: transform 0.15s ease;
}

.auth-brand-badge:hover {
  transform: translateY(-1px);
}

.auth-title {
  font-family: var(--font-display);
  font-size: 1.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  color: var(--color-primary);
  margin: 0 0 0.5rem 0;
}

.auth-subtitle {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  line-height: 1.4;
  margin: 0;
}

.alert-error {
  background-color: var(--color-danger-bg);
  color: var(--color-danger);
  border: 1px solid var(--color-danger-border);
  padding: 0.75rem 1rem;
  border-radius: var(--radius-xs);
  font-size: 0.85rem;
  margin-bottom: 1.5rem;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.form-label {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--color-text-secondary);
}

.form-input {
  padding: 0.65rem 0.85rem;
  font-family: var(--font-sans);
  font-size: 0.9rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background-color: var(--color-bg);
  outline: none;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.form-input:focus {
  border-color: var(--color-amber);
  box-shadow: 0 0 0 1px var(--color-amber);
}

.btn-submit {
  background-color: var(--color-amber);
  color: #fff;
  border: 1px solid #b45309;
  padding: 0.75rem;
  border-radius: var(--radius-sm);
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  cursor: pointer;
  margin-top: 0.5rem;
  transition: background-color var(--transition-fast);
}

.btn-submit:hover:not(:disabled) {
  background-color: var(--color-amber-hover);
}

.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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
</style>

