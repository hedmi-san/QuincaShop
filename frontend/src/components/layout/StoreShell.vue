<template>
  <div class="ui-store-shell">
    <!-- Top Announcement Bar -->
    <aside class="announcement-bar" aria-label="Informations boutique">
      <div class="announcement-container">
        <div class="contact-strip">
          <span class="strip-item">
            <Icon name="map-pin" :size="14" />
            <span>{{ APP_COMPANY_INFO.address }}</span>
          </span>
          <span class="strip-sep" aria-hidden="true">•</span>
          <span class="strip-item">
            <Icon name="phone" :size="14" />
            <a :href="`tel:${APP_COMPANY_INFO.phone}`" dir="ltr" class="strip-phone">{{ APP_COMPANY_INFO.phone }}</a>
          </span>
          <span class="strip-sep" aria-hidden="true">•</span>
          <span class="strip-item">
            <Icon name="clock" :size="14" />
            <span>Sam - Jeu : 08h00 - 17h00</span>
          </span>
        </div>

        <div class="announcement-actions">
          <span class="pro-tag font-mono">Espace Grossiste B2B</span>
        </div>
      </div>
    </aside>

    <!-- Main Store Header -->
    <header class="store-header">
      <div class="header-container">
        <!-- Brand Link -->
        <router-link to="/" class="store-brand">
          <div class="store-brand-badge">
            <Icon name="boxes" :size="20" />
          </div>
          <div class="brand-titles">
            <span class="brand-main">{{ APP_BRAND_SHORT }}</span>
            <span class="brand-sub">{{ APP_BRAND_SUBTITLE }}</span>
          </div>
        </router-link>

        <!-- Search Slot / Input -->
        <div class="store-search-wrapper">
          <slot name="search" />
        </div>

        <!-- Header Actions: User, Orders, Cart -->
        <nav class="store-nav-actions" aria-label="Espace utilisateur">
          <template v-if="authStore.isAuthenticated">
            <router-link
              v-if="authStore.isStaff"
              to="/admin/orders"
              class="nav-action-btn staff-link"
            >
              <Icon name="layout-dashboard" :size="16" />
              <span>Back-Office</span>
            </router-link>

            <template v-if="authStore.isActiveClient">
              <router-link to="/portal/orders" class="nav-action-btn">
                <Icon name="package" :size="16" />
                <span>Commandes</span>
              </router-link>
              <router-link to="/portal/me/factures" class="nav-action-btn">
                <Icon name="file-text" :size="16" />
                <span>Factures</span>
              </router-link>
              <router-link to="/portal/cart" class="nav-action-btn cart-btn">
                <Icon name="shopping-cart" :size="16" />
                <span>Panier</span>
                <span v-if="cartCount > 0" class="cart-pill">{{ cartCount }}</span>
              </router-link>
            </template>

            <button type="button" class="nav-action-btn logout-btn" @click="handleLogout">
              <Icon name="log-out" :size="16" />
            </button>
          </template>

          <template v-else>
            <router-link to="/login" class="nav-action-btn">
              <Icon name="log-in" :size="16" />
              <span>Connexion</span>
            </router-link>
            <router-link to="/register" class="nav-action-btn register-link">
              <span>Compte Pro B2B</span>
            </router-link>
          </template>
        </nav>
      </div>
    </header>

    <!-- Category / Navigation Bar -->
    <div v-if="$slots.categories" class="store-categories-strip">
      <div class="categories-container">
        <slot name="categories" />
      </div>
    </div>

    <!-- Main Page Body -->
    <main class="store-main-content">
      <slot />
    </main>

    <!-- Unified Industrial Store Footer -->
    <footer class="store-footer">
      <div class="footer-container">
        <div class="footer-grid">
          <div class="footer-col brand-col">
            <h4 class="footer-col-title">{{ APP_BRAND_NAME }}</h4>
            <p class="footer-desc">
              Fournisseur et grossiste spécialisé en outillage électroportatif, quincaillerie industrielle, fixation et équipements d'atelier pour les professionnels et revendeurs du BTP en Algérie.
            </p>
            <div class="company-legal font-mono">
              <div>RC : {{ APP_COMPANY_INFO.rc }} • NIF : {{ APP_COMPANY_INFO.nif }}</div>
              <div>NIS : {{ APP_COMPANY_INFO.nis }} • ART : {{ APP_COMPANY_INFO.art }}</div>
              <div>Capital : {{ APP_COMPANY_INFO.capital }}</div>
            </div>
          </div>

          <div class="footer-col">
            <h4 class="footer-col-title">Espace Professionnel</h4>
            <ul class="footer-links">
              <li><router-link to="/register">Demande d'agrément compte pro</router-link></li>
              <li><router-link to="/login">Accès espace revendeur</router-link></li>
              <li><router-link to="/portal/me/statement">Extrait de compte & facturation</router-link></li>
            </ul>
          </div>

          <div class="footer-col">
            <h4 class="footer-col-title">Atelier & Logistique</h4>
            <div class="footer-contact-info">
              <p>Zone Industrielle Oued Smar, Alger</p>
              <p dir="ltr">Tél : {{ APP_COMPANY_INFO.phone }}</p>
              <p>Email : {{ APP_COMPANY_INFO.email }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Real Bottom Bar -->
      <div class="footer-bottom-bar">
        <div class="bottom-container">
          <p>© 2026 {{ APP_BRAND_NAME }}. Tous droits réservés.</p>
          <p class="footer-system-tag font-mono">Architecture Monochromatique Industrielle</p>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth.store';
import Icon from '../ui/Icon.vue';
import { APP_BRAND_NAME, APP_BRAND_SHORT, APP_BRAND_SUBTITLE, APP_COMPANY_INFO } from '../../lib/brand';

interface Props {
  cartCount?: number;
}

withDefaults(defineProps<Props>(), {
  cartCount: 0,
});

const authStore = useAuthStore();
const router = useRouter();

function handleLogout() {
  authStore.logout();
  router.push('/login');
}
</script>

<style scoped>
.ui-store-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: var(--color-surface);
}

/* Announcement Bar */
.announcement-bar {
  background-color: var(--color-brand);
  color: #cbd5e1;
  font-size: var(--font-size-xs);
  padding: var(--space-1) var(--space-4);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.announcement-container {
  max-width: 1440px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.contact-strip {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.strip-item {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
}

.strip-sep {
  color: rgba(255, 255, 255, 0.2);
}

.strip-phone {
  color: inherit;
  text-decoration: none;
}

.announcement-actions {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.pro-tag {
  background: rgba(255, 255, 255, 0.1);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  font-size: 11px;
}

/* Store Header */
.store-header {
  height: 68px;
  background-color: var(--color-surface);
  border-bottom: 1px solid var(--color-line);
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
  display: flex;
  align-items: center;
}

.header-container {
  max-width: 1440px;
  width: 100%;
  margin: 0 auto;
  padding: 0 var(--space-4);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
}

.store-brand {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  text-decoration: none;
  color: inherit;
  flex-shrink: 0;
}

.store-brand-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: var(--radius-md);
  background-color: var(--color-subtle);
  border: 1px solid var(--color-line);
  color: var(--color-accent);
  flex-shrink: 0;
}

.brand-titles {
  display: flex;
  flex-direction: column;
}

.brand-main {
  font-family: var(--font-sans);
  font-size: var(--font-size-md);
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--color-ink);
  line-height: 1.15;
}

.brand-sub {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.store-search-wrapper {
  flex: 1;
  max-width: 500px;
}

.store-nav-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-shrink: 0;
}

.nav-action-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  height: var(--height-control-dense);
  padding: 0 var(--space-3);
  border-radius: var(--radius-control);
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-ink);
  text-decoration: none;
  background-color: var(--color-subtle);
  border: 1px solid var(--color-line);
  transition: all 0.15s ease;
  cursor: pointer;
}

.nav-action-btn:hover {
  background-color: #e2e8f0;
  color: var(--color-ink);
}

.nav-action-btn.staff-link {
  background-color: var(--color-brand);
  color: var(--color-text-inverse);
  border-color: var(--color-brand);
}

.nav-action-btn.register-link {
  background-color: var(--color-accent-subtle);
  color: var(--color-accent);
  border-color: var(--color-accent-border);
}

.cart-pill {
  background-color: var(--color-accent);
  color: #ffffff;
  font-size: 11px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: var(--radius-pill);
  font-family: var(--font-mono);
}

/* Categories Strip */
.store-categories-strip {
  background-color: var(--color-subtle);
  border-bottom: 1px solid var(--color-line);
}

.categories-container {
  max-width: 1440px;
  margin: 0 auto;
  padding: var(--space-2) var(--space-4);
  display: flex;
  align-items: center;
  gap: var(--space-2);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

/* Content Area */
.store-main-content {
  flex: 1;
  max-width: 1440px;
  width: 100%;
  margin: 0 auto;
  padding: var(--space-5) var(--space-4);
}

/* Footer */
.store-footer {
  background-color: var(--color-brand);
  color: #94a3b8;
  margin-top: auto;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.footer-container {
  max-width: 1440px;
  margin: 0 auto;
  padding: var(--space-6) var(--space-4);
}

.footer-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: var(--space-6);
}

.footer-col-title {
  color: var(--color-text-inverse);
  font-size: var(--font-size-base);
  font-weight: 600;
  margin-bottom: var(--space-3);
}

.footer-desc {
  font-size: var(--font-size-sm);
  line-height: var(--line-height-relaxed);
  max-width: 60ch;
  margin-bottom: var(--space-3);
}

.company-legal {
  font-size: 11px;
  color: var(--color-text-tertiary);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.footer-links {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.footer-links a {
  color: inherit;
  text-decoration: none;
  font-size: var(--font-size-sm);
}
.footer-links a:hover {
  color: var(--color-text-inverse);
}

.footer-contact-info {
  font-size: var(--font-size-sm);
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.footer-bottom-bar {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding: var(--space-3) var(--space-4);
  background-color: #090c0e;
}

.bottom-container {
  max-width: 1440px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: var(--font-size-xs);
  color: #64748b;
}

@media (max-width: 768px) {
  .contact-strip {
    display: none;
  }
  .footer-grid {
    grid-template-columns: 1fr;
  }
  .bottom-container {
    flex-direction: column;
    gap: var(--space-1);
    text-align: center;
  }
}
</style>
