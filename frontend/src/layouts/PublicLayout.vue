<template>
  <div class="public-layout">
    <!-- Top Announcement Bar (Height: 36px) -->
    <aside class="announcement-bar" aria-label="Informations boutique">
      <div class="announcement-inner">
        <div class="contact-strip">
          <span class="info-item">
            <Icon name="map-pin" :size="13" />
            <span>{{ APP_COMPANY_INFO.address }}</span>
          </span>
          <span class="info-separator" aria-hidden="true">•</span>
          <span class="info-item">
            <Icon name="phone" :size="13" />
            <a :href="`tel:${APP_COMPANY_INFO.phone}`" dir="ltr" class="phone-link">{{ APP_COMPANY_INFO.phone }}</a>
          </span>
          <span class="info-separator" aria-hidden="true">•</span>
          <span class="info-item">
            <Icon name="clock" :size="13" />
            <span>Sam - Jeu : 08h00 - 17h00</span>
          </span>
        </div>

        <div class="announcement-right">
          <span class="b2b-badge">Espace grossiste B2B</span>
        </div>
      </div>
    </aside>

    <!-- Sticky Pending Client Notice Banner -->
    <div v-if="authStore.isPendingClient" class="pending-sticky-banner">
      <div class="pending-banner-inner">
        <div class="pending-banner-message">
          <Icon name="clock" :size="16" />
          <span>
            <strong>Votre compte est en cours de validation par notre service commercial.</strong> Vous serez notifié dès activation de vos accès tarifaires.
          </span>
        </div>
        <router-link to="/portal/pending" class="pending-banner-link">
          Suivre mon dossier & pièces RC/NIF
        </router-link>
      </div>
    </div>

    <!-- Main Header (Height: 64px) -->
    <header class="main-header">
      <div class="header-inner">
        <!-- Brand Logo & Name -->
        <router-link to="/" class="brand-link" title="Accueil - SARL Outillage Industriel Algérie">
          <img
            src="/src/assets/images/logo.png"
            alt="Logo Outillage Industriel Algérie"
            class="brand-logo-img"
          />
          <div class="brand-text">
            <span class="brand-title">{{ APP_BRAND_SHORT }}</span>
            <span class="brand-subtitle">{{ APP_BRAND_SUBTITLE }}</span>
          </div>
        </router-link>

        <!-- Search Input with Search Icon -->
        <div class="header-search">
          <Input
            v-model="searchInput"
            prefix-icon="search"
            :clearable="true"
            placeholder="Rechercher une référence, désignation, marque..."
            size="dense"
            class="header-search-control"
            @update:model-value="onSearchInput"
            @keydown.enter="triggerSearch"
            @clear="clearSearch"
          />
        </div>

        <!-- Auth & Portal Controls -->
        <nav class="header-actions" aria-label="Espace utilisateur">
          <template v-if="authStore.isAuthenticated">
            <!-- Staff Back-Office Link -->
            <router-link
              v-if="authStore.isStaff"
              to="/admin/orders"
              class="nav-action-btn staff-link"
            >
              <Icon name="layout-dashboard" :size="16" />
              <span>Back-Office</span>
            </router-link>

            <!-- Active Client Links: Orders, Factures, Extrait & Cart -->
            <template v-if="authStore.isActiveClient">
              <router-link to="/portal/orders" class="nav-action-btn">
                <Icon name="package" :size="16" />
                <span>Commandes</span>
              </router-link>

              <router-link to="/portal/me/factures" class="nav-action-btn">
                <Icon name="file-text" :size="16" />
                <span>Factures</span>
              </router-link>

              <router-link to="/portal/me/statement" class="nav-action-btn">
                <Icon name="credit-card" :size="16" />
                <span>Relevé</span>
              </router-link>

              <router-link to="/portal/cart" class="nav-action-btn cart-link" title="Mon Panier Professionnel">
                <Icon name="shopping-cart" :size="16" />
                <span>Panier</span>
                <span v-if="cartStore.summary.itemCount > 0" class="cart-badge">
                  {{ cartStore.summary.itemCount }}
                </span>
              </router-link>
            </template>

            <!-- Client Dossier Link -->
            <router-link
              v-else-if="authStore.isClient"
              to="/portal/pending"
              class="nav-action-btn dossier-link"
            >
              <Icon name="file-check" :size="16" />
              <span>{{ authStore.client?.code || 'Mon Dossier B2B' }}</span>
            </router-link>

            <!-- Notification Bell -->
            <div class="notif-wrapper">
              <Button
                variant="ghost"
                size="dense"
                class="nav-action-btn notif-btn"
                :aria-label="'Notifications'"
                title="Notifications"
                @click="showNotifs = !showNotifs"
              >
                <Icon name="bell" :size="16" />
                <span v-if="authStore.unreadCount > 0" class="notif-badge">
                  {{ authStore.unreadCount }}
                </span>
              </Button>

              <div v-if="showNotifs" class="notif-dropdown">
                <div class="notif-header">
                  <strong>Notifications ({{ authStore.unreadCount }} non lues)</strong>
                  <Button
                    v-if="authStore.unreadCount > 0"
                    variant="ghost"
                    size="dense"
                    class="btn-link-xs"
                    @click="authStore.markAllNotificationsRead()"
                  >
                    Tout marquer lu
                  </Button>
                </div>

                <div v-if="authStore.notifications.length === 0" class="notif-empty">
                  Aucune notification.
                </div>
                <div v-else class="notif-list">
                  <div
                    v-for="n in authStore.notifications"
                    :key="n.id"
                    class="notif-item"
                    :class="{ unread: !n.is_read }"
                    @click="onNotifClick(n)"
                  >
                    <div class="notif-title">{{ n.title }}</div>
                    <div v-if="n.body" class="notif-body">{{ n.body }}</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- User Info Pill -->
            <div class="user-pill">
              <span class="user-role-tag">{{ roleLabel }}</span>
              <span class="user-name">{{ authStore.user?.fullName }}</span>
            </div>

            <Button
              variant="ghost"
              size="dense"
              icon-only
              icon="log-out"
              aria-label="Déconnexion"
              title="Déconnexion"
              class="nav-action-btn logout-btn"
              @click="logout"
            />
          </template>

          <template v-else>
            <!-- Ghost Login Button -->
            <router-link to="/login" class="nav-action-btn btn-ghost-login">
              <span>Se connecter</span>
            </router-link>
            <!-- Single Primary Pro Account CTA Button -->
            <router-link to="/register" class="nav-action-btn btn-primary-register">
              <span>Ouvrir un compte pro</span>
            </router-link>
          </template>
        </nav>
      </div>
    </header>

    <!-- Category Navigation Ribbon (Height: 44px, Underline tabs with fade on scroll) -->
    <div class="category-ribbon-wrapper">
      <div class="fade-edge-left" aria-hidden="true"></div>
      <nav class="category-ribbon" aria-label="Rayons du catalogue">
        <div class="ribbon-inner">
          <Button
            variant="ghost"
            size="dense"
            class="category-tab"
            :class="{ 'is-active': !catalogStore.activeCategory }"
            @click="catalogStore.setCategory('')"
          >
            Tous les produits
          </Button>
          <Button
            v-for="cat in catalogStore.categories"
            :key="cat.id"
            variant="ghost"
            size="dense"
            class="category-tab"
            :class="{ 'is-active': catalogStore.activeCategory === cat.slug }"
            @click="catalogStore.setCategory(cat.slug)"
          >
            {{ formatSentenceCase(cat.name) }}
          </Button>
        </div>
      </nav>
      <div class="fade-edge-right" aria-hidden="true"></div>
    </div>

    <!-- Page Content -->
    <main class="main-content">
      <router-view />
    </main>

    <!-- Unified Industrial Store Footer -->
    <footer class="public-footer">
      <div class="footer-container">
        <div class="footer-grid">
          <div class="footer-col brand-col">
            <h4 class="footer-heading">{{ APP_BRAND_NAME }}</h4>
            <p class="footer-desc">
              Fournisseur d'outillage électroportatif, outillage à main, quincaillerie industrielle et consommables B2B pour les professionnels du bâtiment et de l'industrie.
            </p>
            <div class="legal-mentions">
              <div>RC : {{ APP_COMPANY_INFO.rc }}</div>
              <div>NIF : {{ APP_COMPANY_INFO.nif }} • NIS : {{ APP_COMPANY_INFO.nis }}</div>
              <div>ART : {{ APP_COMPANY_INFO.art }} • Capital : {{ APP_COMPANY_INFO.capital }}</div>
            </div>
          </div>

          <div class="footer-col">
            <h4 class="footer-heading">Rayons principaux</h4>
            <ul class="footer-links">
              <li v-for="cat in catalogStore.categories.slice(0, 5)" :key="cat.id">
                <a href="#" @click.prevent="catalogStore.setCategory(cat.slug)">{{ formatSentenceCase(cat.name) }}</a>
              </li>
            </ul>
          </div>

          <div class="footer-col">
            <h4 class="footer-heading">Espace professionnel</h4>
            <ul class="footer-links">
              <li><router-link to="/login">Accès grossiste & tarifs</router-link></li>
              <li><router-link to="/register">Demande d'agrément B2B</router-link></li>
              <li><router-link to="/portal/me/statement">Conditions de vente & crédit</router-link></li>
              <li><a href="mailto:contact@outillage-algerie.dz">Support technique & SAV</a></li>
            </ul>
          </div>
        </div>
      </div>

      <div class="footer-bottom">
        <div class="bottom-inner">
          <p>© 2026 {{ APP_BRAND_NAME }}. Tous droits réservés.</p>
          <p class="monochromatic-tag">Architecture Monochromatique Industrielle</p>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore, NotificationItem } from '../stores/auth.store';
import { useCatalogStore } from '../stores/catalog.store';
import { useCartStore } from '../stores/cart.store';
import { Icon, Input, Button } from '../components/ui';
import { APP_BRAND_NAME, APP_BRAND_SHORT, APP_BRAND_SUBTITLE, APP_COMPANY_INFO } from '../lib/brand';

const router = useRouter();
const authStore = useAuthStore();
const catalogStore = useCatalogStore();
const cartStore = useCartStore();

const searchInput = ref('');
const showNotifs = ref(false);
let debounceTimer: any = null;

onMounted(async () => {
  catalogStore.fetchCategories();
  if (authStore.isAuthenticated) {
    await authStore.fetchMe();
    await authStore.fetchNotifications();
    if (authStore.isActiveClient) {
      await cartStore.fetchCart();
    }
  }
});

const roleLabel = computed(() => {
  if (authStore.isAdmin) return 'Admin';
  if (authStore.isAccountant) return 'Comptable';
  if (authStore.isActiveClient) return 'Client Pro';
  if (authStore.isPendingClient) return 'En Attente';
  return 'Utilisateur';
});

function formatSentenceCase(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function onSearchInput(val?: string | number | null) {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    catalogStore.setSearch(val != null ? String(val) : searchInput.value);
  }, 350);
}

function triggerSearch() {
  clearTimeout(debounceTimer);
  catalogStore.setSearch(searchInput.value);
}

function clearSearch() {
  searchInput.value = '';
  catalogStore.setSearch('');
}

async function onNotifClick(n: NotificationItem) {
  if (!n.is_read) {
    await authStore.markNotificationRead(n.id);
  }
  showNotifs.value = false;
  await authStore.fetchMe();
  catalogStore.fetchProducts();
  if (n.link) {
    router.push(n.link);
  }
}

function logout() {
  authStore.logout();
  router.push('/login');
}
</script>

<style scoped>
.public-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: var(--color-surface);
  color: var(--color-text-primary);
}

/* Announcement Bar (Height: 36px) */
.announcement-bar {
  height: 36px;
  background-color: var(--color-brand);
  color: var(--color-text-tertiary);
  font-size: var(--font-size-xs);
  padding: 0 var(--space-4);
  display: flex;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  box-sizing: border-box;
}

.announcement-inner {
  max-width: 1440px;
  width: 100%;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.contact-strip {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.info-item {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
}

.info-separator {
  color: rgba(255, 255, 255, 0.2);
}

.phone-link {
  color: inherit;
  text-decoration: none;
}
.phone-link:hover {
  color: var(--color-text-inverse);
}

.announcement-right {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.b2b-badge {
  background-color: rgba(255, 255, 255, 0.1);
  color: var(--color-text-inverse);
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  font-family: var(--font-sans);
  font-size: var(--font-size-xs);
  font-weight: 500;
  border: 1px solid rgba(255, 255, 255, 0.15);
}

/* Sticky Pending Client Banner */
.pending-sticky-banner {
  background-color: var(--color-warning-tint);
  border-bottom: 1px solid var(--color-warning-border);
  color: var(--color-warning-text);
  font-size: var(--font-size-sm);
}

.pending-banner-inner {
  max-width: 1440px;
  margin: 0 auto;
  padding: var(--space-2) var(--space-4);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.pending-banner-message {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.pending-banner-link {
  font-weight: 600;
  color: var(--color-ink);
  text-decoration: underline;
  display: inline-flex;
  align-items: center;
}

/* Main Header (Height: 64px) */
.main-header {
  position: sticky;
  top: 0;
  height: 64px;
  z-index: var(--z-sticky, 40);
  background-color: var(--color-surface);
  border-bottom: 1px solid var(--color-line);
  box-sizing: border-box;
  display: flex;
  align-items: center;
}

.header-inner {
  max-width: 1440px;
  width: 100%;
  margin: 0 auto;
  padding: 0 var(--space-4);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
}

.brand-link {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  text-decoration: none;
  color: inherit;
  flex-shrink: 0;
}

.brand-logo-img {
  height: 38px;
  width: auto;
  object-fit: contain;
  flex-shrink: 0;
}

.brand-text {
  display: flex;
  flex-direction: column;
}

.brand-title {
  font-family: var(--font-sans);
  font-size: var(--font-size-md);
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--color-ink);
  line-height: 1.15;
}

.brand-subtitle {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.header-search {
  flex: 1;
  max-width: 480px;
  min-width: 200px;
}

.header-search-control {
  width: 100%;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-shrink: 0;
}

.nav-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
  height: var(--height-control-dense);
  padding: 0 var(--space-3);
  border-radius: var(--radius-control);
  font-family: var(--font-sans);
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-ink);
  text-decoration: none;
  background-color: var(--color-subtle);
  border: 1px solid var(--color-line);
  transition: all 0.15s ease;
  cursor: pointer;
  white-space: nowrap;
}

.nav-action-btn:hover {
  background-color: var(--color-line);
  color: var(--color-ink);
}

/* Unauthenticated Guest CTAs */
.btn-ghost-login {
  background-color: transparent;
  border-color: transparent;
  color: var(--color-text-secondary);
}
.btn-ghost-login:hover {
  background-color: var(--color-subtle);
  border-color: var(--color-line);
  color: var(--color-ink);
}

.btn-primary-register {
  background-color: var(--color-accent);
  color: var(--color-text-inverse);
  border-color: var(--color-accent-border, var(--color-accent));
  font-weight: 600;
}
.btn-primary-register:hover {
  background-color: var(--color-accent-hover, var(--color-brand));
  border-color: var(--color-accent-hover, var(--color-brand));
  color: var(--color-text-inverse);
}

.nav-action-btn.staff-link {
  background-color: var(--color-brand);
  color: var(--color-text-inverse);
  border-color: var(--color-brand);
  font-weight: 600;
}

.nav-action-btn.cart-link {
  background-color: var(--color-subtle);
  color: var(--color-ink);
}

.cart-badge {
  background-color: var(--color-accent);
  color: var(--color-text-inverse);
  font-size: var(--font-size-xs);
  font-weight: 700;
  padding: 1px 6px;
  border-radius: var(--radius-pill);
  font-family: var(--font-mono);
  min-width: 18px;
  text-align: center;
  line-height: 1;
}

/* Notifications */
.notif-wrapper {
  position: relative;
}

.notif-btn {
  position: relative;
}

.notif-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background-color: var(--color-danger);
  color: var(--color-text-inverse);
  font-size: 11px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: var(--radius-pill);
  line-height: 1;
}

[dir="rtl"] .notif-badge {
  right: auto;
  left: -4px;
}

.notif-dropdown {
  position: absolute;
  right: 0;
  top: calc(100% + var(--space-2));
  width: 340px;
  background-color: var(--color-surface);
  border: 1px solid var(--color-line-strong);
  border-radius: var(--radius-card);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  z-index: var(--z-modal, 100);
  overflow: hidden;
}

[dir="rtl"] .notif-dropdown {
  right: auto;
  left: 0;
}

.notif-header {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-line);
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--font-size-sm);
  background-color: var(--color-subtle);
}

.btn-link-xs {
  background: none;
  border: none;
  color: var(--color-info);
  font-size: var(--font-size-xs);
  cursor: pointer;
  padding: 0;
  height: auto;
  min-height: 0;
}

.notif-empty {
  padding: var(--space-5);
  text-align: center;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.notif-list {
  max-height: 320px;
  overflow-y: auto;
}

.notif-item {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-line);
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.notif-item:hover {
  background-color: var(--color-subtle);
}

.notif-item.unread {
  background-color: var(--color-info-tint);
}

.notif-title {
  font-size: var(--font-size-sm);
  font-weight: 600;
  margin-bottom: var(--space-1);
}

.notif-body {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  line-height: 1.4;
}

.user-pill {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  background-color: var(--color-subtle);
  border: 1px solid var(--color-line);
  padding: 0 var(--space-3);
  height: var(--height-control-dense);
  border-radius: var(--radius-pill);
  font-size: var(--font-size-sm);
}

.user-role-tag {
  background-color: var(--color-brand);
  color: var(--color-text-inverse);
  padding: 2px 6px;
  border-radius: var(--radius-control);
  font-size: var(--font-size-xs);
  font-weight: 600;
  text-transform: uppercase;
}

.user-name {
  font-weight: 600;
  color: var(--color-ink);
}

.logout-btn {
  padding: 0 var(--space-2);
}

/* Category Navigation Ribbon (Height: 44px, Underline tabs with fade) */
.category-ribbon-wrapper {
  position: relative;
  background-color: var(--color-surface);
  border-bottom: 1px solid var(--color-line);
  height: 44px;
}

.category-ribbon {
  height: 44px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.category-ribbon::-webkit-scrollbar {
  display: none;
}

.ribbon-inner {
  max-width: 1440px;
  height: 44px;
  margin: 0 auto;
  padding: 0 var(--space-4);
  display: flex;
  gap: var(--space-3);
  white-space: nowrap;
}

.category-tab {
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 var(--space-3);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  border-radius: 0;
  font-family: var(--font-sans);
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.category-tab:hover {
  color: var(--color-ink);
  border-bottom-color: var(--color-line-strong);
}

.category-tab.is-active {
  color: var(--color-ink);
  border-bottom-color: var(--color-brand);
  font-weight: 600;
}

.fade-edge-left {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: 32px;
  background: linear-gradient(to right, var(--color-surface), transparent);
  pointer-events: none;
  z-index: 2;
}

.fade-edge-right {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 32px;
  background: linear-gradient(to left, var(--color-surface), transparent);
  pointer-events: none;
  z-index: 2;
}

[dir="rtl"] .fade-edge-left {
  left: auto;
  right: 0;
  background: linear-gradient(to left, var(--color-surface), transparent);
}

[dir="rtl"] .fade-edge-right {
  right: auto;
  left: 0;
  background: linear-gradient(to right, var(--color-surface), transparent);
}

/* Main Content */
.main-content {
  flex: 1;
  max-width: 1440px;
  width: 100%;
  margin: 0 auto;
  padding: var(--space-5) var(--space-4);
}

/* Footer */
.public-footer {
  background-color: var(--color-brand);
  color: var(--color-text-tertiary);
  margin-top: auto;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.footer-container {
  max-width: 1440px;
  margin: 0 auto;
  padding: var(--space-6) var(--space-4) var(--space-5);
}

.footer-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: var(--space-6);
}

.footer-heading {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text-inverse);
  margin-bottom: var(--space-3);
}

.footer-desc {
  font-size: var(--font-size-sm);
  line-height: var(--line-height-relaxed, 1.5);
  color: var(--color-text-tertiary);
  margin-bottom: var(--space-3);
  max-width: 60ch;
}

.legal-mentions {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  font-family: var(--font-mono);
  line-height: 1.6;
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
  color: var(--color-text-tertiary);
  text-decoration: none;
  font-size: var(--font-size-sm);
  transition: color 0.15s ease;
}

.footer-links a:hover {
  color: var(--color-text-inverse);
}

.footer-bottom {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding: var(--space-3) var(--space-4);
  background-color: rgba(0, 0, 0, 0.2);
}

.bottom-inner {
  max-width: 1440px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.monochromatic-tag {
  font-family: var(--font-mono);
  font-size: var(--font-size-xs);
}

/* Responsive Adjustments */
@media (max-width: 768px) {
  .announcement-bar {
    height: auto;
    padding: var(--space-2) var(--space-3);
  }

  .announcement-inner {
    flex-direction: column;
    gap: var(--space-2);
    align-items: flex-start;
  }

  .contact-strip .info-item:last-child,
  .contact-strip .info-separator:last-of-type {
    display: none;
  }

  .phone-link {
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    padding: 0 var(--space-1);
  }

  .brand-link {
    min-height: 44px;
  }

  .main-header {
    height: auto;
    padding: var(--space-2) 0;
  }

  .header-inner {
    flex-wrap: wrap;
    gap: var(--space-3);
    padding: 0 var(--space-3);
  }

  .header-search {
    order: 3;
    max-width: 100%;
    width: 100%;
    margin-top: var(--space-1);
  }

  .nav-action-btn {
    height: var(--height-control-touch, 44px);
    min-width: 44px;
    padding: 0 var(--space-3);
  }

  .category-tab {
    height: var(--height-control-touch, 44px);
    padding: 0 var(--space-3);
  }

  .header-search-control :deep(.ui-input-wrapper),
  .header-search-control :deep(.ui-input-field) {
    height: var(--height-control-touch, 44px);
    min-height: 44px;
  }

  .pending-banner-link {
    min-height: 44px;
    display: inline-flex;
    align-items: center;
  }

  .footer-grid {
    grid-template-columns: 1fr;
    gap: var(--space-5);
  }

  .bottom-inner {
    flex-direction: column;
    gap: var(--space-2);
    text-align: center;
  }
}
</style>
