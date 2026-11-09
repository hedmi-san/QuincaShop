<template>
  <div class="public-layout">
    <!-- Top Announcement Bar -->
    <aside class="announcement-bar" aria-label="Informations boutique">
      <div class="announcement-content">
        <span class="info-item">
          📍 Zone Industrielle Oued Smar, Alger
        </span>
        <span class="info-separator">•</span>
        <span class="info-item">
          📞 +213 (0) 23 92 11 22
        </span>
        <span class="info-separator">•</span>
        <span class="info-item">
          🕒 Sam - Jeu : 08h00 - 17h00
        </span>
      </div>
      <div class="announcement-right">
        <LanguageSwitcher />
        <span class="b2b-badge">Espace Grossiste B2B</span>
      </div>
    </aside>

    <!-- Sticky Pending Client Notice Banner (per 05-ui-design.md 2.2) -->
    <div v-if="authStore.isPendingClient" class="pending-sticky-banner">
      <div class="pending-banner-inner">
        <span>
          ⏳ <strong>Votre compte est en cours de validation par notre service commercial.</strong> Vous serez notifié dès activation de vos accès tarifaires.
        </span>
        <router-link to="/portal/pending" class="pending-banner-link">
          Suivre mon dossier & pièces RC/NIF →
        </router-link>
      </div>
    </div>

    <!-- Main Header -->
    <header class="main-header">
      <div class="header-inner">
        <!-- Brand Logo -->
        <router-link to="/" class="brand-link">
          <img src="/src/assets/images/logo.png" alt="SARL Outillage Industriel" class="brand-logo" />
          <div class="brand-text">
            <span class="brand-title">OUTILLAGE INDUSTRIEL</span>
            <span class="brand-subtitle">Quincaillerie & Fournitures B2B</span>
          </div>
        </router-link>

        <!-- Search Input -->
        <div class="header-search">
          <div class="search-input-wrapper">
            <span class="search-icon">🔍</span>
            <input
              v-model="searchInput"
              type="text"
              placeholder="Rechercher une référence, désignation, marque..."
              class="search-input"
              @input="onSearchInput"
              @keydown.enter="triggerSearch"
            />
            <button v-if="searchInput" class="clear-search-btn" @click="clearSearch">✕</button>
          </div>
        </div>

        <!-- Auth & Portal Controls -->
        <div class="header-actions">
          <template v-if="authStore.isAuthenticated">
            <!-- Staff Back-Office Link -->
            <router-link
              v-if="authStore.isStaff"
              to="/admin/clients/pending"
              class="btn-primary-sm"
            >
              Back-Office ERP
            </router-link>

            <!-- Active Client Links: Orders, Factures, Extrait & Cart -->
            <template v-if="authStore.isActiveClient">
              <router-link to="/portal/orders" class="btn-orders-link">
                📋 Commandes
              </router-link>

              <router-link to="/portal/me/factures" class="btn-orders-link">
                📑 Factures
              </router-link>

              <router-link to="/portal/me/statement" class="btn-orders-link">
                💳 Relevé
              </router-link>

              <router-link to="/portal/cart" class="btn-cart-link" title="Mon Panier Professionnel">
                🛒 Panier
                <span v-if="cartStore.summary.itemCount > 0" class="cart-badge">
                  {{ cartStore.summary.itemCount }}
                </span>
              </router-link>
            </template>

            <!-- Client Dossier Link -->
            <router-link
              v-else-if="authStore.isClient"
              to="/portal/pending"
              class="btn-dossier"
            >
              {{ authStore.client?.code || 'Mon Dossier B2B' }}
            </router-link>

            <!-- Notification Bell -->
            <div class="notif-wrapper">
              <button class="notif-btn" @click="showNotifs = !showNotifs" title="Notifications">
                🔔
                <span v-if="authStore.unreadCount > 0" class="notif-badge">
                  {{ authStore.unreadCount }}
                </span>
              </button>

              <div v-if="showNotifs" class="notif-dropdown">
                <div class="notif-header">
                  <strong>Notifications ({{ authStore.unreadCount }} non lues)</strong>
                  <button
                    v-if="authStore.unreadCount > 0"
                    class="btn-link-xs"
                    @click="authStore.markAllNotificationsRead()"
                  >
                    Tout marquer lu
                  </button>
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

            <div class="user-pill">
              <span class="user-role-tag">{{ roleLabel }}</span>
              <span class="user-name">{{ authStore.user?.fullName }}</span>
            </div>
            <button class="logout-btn" @click="logout" title="Déconnexion">
              Sortir
            </button>
          </template>
          <template v-else>
            <router-link to="/login" class="btn-text">Se Connecter</router-link>
            <router-link to="/register" class="btn-primary-sm">Ouvrir un Compte Pro</router-link>
          </template>
        </div>
      </div>

      <!-- Category Navigation Ribbon -->
      <nav class="category-ribbon">
        <div class="ribbon-inner">
          <button
            class="category-pill"
            :class="{ active: !catalogStore.activeCategory }"
            @click="catalogStore.setCategory('')"
          >
            Tous les Produits
          </button>
          <button
            v-for="cat in catalogStore.categories"
            :key="cat.id"
            class="category-pill"
            :class="{ active: catalogStore.activeCategory === cat.slug }"
            @click="catalogStore.setCategory(cat.slug)"
          >
            {{ cat.name }}
          </button>
        </div>
      </nav>
    </header>

    <!-- Page Content -->
    <main class="main-content">
      <router-view />
    </main>

    <!-- Footer -->
    <footer class="public-footer">
      <div class="footer-container">
        <div class="footer-col brand-col">
          <h4 class="footer-heading">SARL Outillage Industriel Algérie</h4>
          <p class="footer-desc">
            Fournisseur d'outillage électroportatif, outillage à main, quincaillerie industrielle et consommables B2B pour les professionnels du bâtiment et de l'industrie.
          </p>
          <div class="legal-mentions">
            <div>RC : 16/00-0123456B16</div>
            <div>NIF : 001616012345678 • NIS : 001616010012345</div>
            <div>ART : 16123456789 • Capital : 10 000 000 DZD</div>
          </div>
        </div>

        <div class="footer-col">
          <h4 class="footer-heading">Rayons Principaux</h4>
          <ul class="footer-links">
            <li v-for="cat in catalogStore.categories.slice(0, 5)" :key="cat.id">
              <a href="#" @click.prevent="catalogStore.setCategory(cat.slug)">{{ cat.name }}</a>
            </li>
          </ul>
        </div>

        <div class="footer-col">
          <h4 class="footer-heading">Espace Professionnel</h4>
          <ul class="footer-links">
            <li><router-link to="/login">Accès Grossiste & Tarifs</router-link></li>
            <li><router-link to="/register">Demande d'Agrément B2B</router-link></li>
            <li><a href="#">Conditions de Vente & Crédit</a></li>
            <li><a href="#">Support Technique & SAV</a></li>
          </ul>
        </div>
      </div>

      <div class="footer-bottom">
        <p>© 2026 SARL Outillage Industriel Algérie. Tous droits réservés.</p>
        <p class="monochromatic-tag">Architecture Monochromatique Industrielle</p>
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
import LanguageSwitcher from '../components/common/LanguageSwitcher.vue';

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

function onSearchInput() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    catalogStore.setSearch(searchInput.value);
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
  background-color: var(--color-bg);
  color: var(--color-text-primary);
}

/* Announcement */
.announcement-bar {
  background-color: #111111;
  color: #a3a3a3;
  font-size: 0.75rem;
  padding: 0.4rem 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #262626;
}

.announcement-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.info-separator {
  color: #404040;
}

.b2b-badge {
  background-color: #262626;
  color: #ffffff;
  padding: 0.15rem 0.5rem;
  border-radius: var(--radius-sm);
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

/* Pending Banner */
.pending-sticky-banner {
  background-color: var(--color-warning-bg);
  border-bottom: 1px solid rgba(171, 110, 5, 0.25);
  color: #784c00;
  font-size: 0.8rem;
}

.pending-banner-inner {
  max-width: 1300px;
  margin: 0 auto;
  padding: 0.55rem 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.pending-banner-link {
  font-weight: 700;
  color: #171717;
  text-decoration: underline;
}

/* Header */
.main-header {
  position: sticky;
  top: 0;
  z-index: 40;
  background-color: var(--color-bg);
  border-bottom: 1px solid var(--color-border);
}

.header-inner {
  max-width: 1300px;
  margin: 0 auto;
  padding: 0.85rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
}

.brand-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  text-decoration: none;
  color: inherit;
}

.brand-logo {
  height: 42px;
  width: auto;
  object-fit: contain;
}

.brand-text {
  display: flex;
  flex-direction: column;
}

.brand-title {
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: var(--color-primary);
}

.brand-subtitle {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.header-search {
  flex: 1;
  max-width: 540px;
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 0.85rem;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}

.search-input {
  width: 100%;
  padding: 0.6rem 2.2rem 0.6rem 2.4rem;
  font-size: 0.875rem;
  background-color: var(--color-bg-subtle);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  outline: none;
  transition: all 0.15s ease-in-out;
}

.search-input:focus {
  border-color: var(--color-primary);
  background-color: var(--color-bg);
  box-shadow: 0 0 0 2px rgba(23, 23, 23, 0.08);
}

.clear-search-btn {
  position: absolute;
  right: 0.75rem;
  background: none;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: 0.8rem;
  padding: 0.2rem;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.btn-text {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text-primary);
  text-decoration: none;
  padding: 0.5rem 0.8rem;
}

.btn-primary-sm {
  font-size: 0.8rem;
  font-weight: 600;
  background-color: var(--color-primary);
  color: #ffffff;
  padding: 0.45rem 0.9rem;
  border-radius: var(--radius-sm);
  text-decoration: none;
}

.btn-dossier {
  font-size: 0.78rem;
  font-weight: 700;
  font-family: var(--font-mono);
  background-color: var(--color-bg-subtle);
  border: 1px solid var(--color-border-dark);
  color: var(--color-primary);
  padding: 0.35rem 0.7rem;
  border-radius: var(--radius-sm);
  text-decoration: none;
}

.btn-orders-link {
  font-size: 0.8rem;
  font-weight: 600;
  background-color: var(--color-bg-subtle);
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
  padding: 0.45rem 0.8rem;
  border-radius: var(--radius-sm);
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  transition: all 0.2s ease;
}

.btn-orders-link:hover {
  background-color: #e2e8f0;
}

.btn-cart-link {
  position: relative;
  font-size: 0.85rem;
  font-weight: 600;
  background-color: var(--color-primary);
  color: #ffffff;
  padding: 0.45rem 0.9rem;
  border-radius: var(--radius-sm);
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.cart-badge {
  background-color: #ef4444;
  color: white;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
}

/* Notifications */
.notif-wrapper {
  position: relative;
}

.notif-btn {
  position: relative;
  background: var(--color-bg-subtle);
  border: 1px solid var(--color-border);
  padding: 0.35rem 0.55rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.notif-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  background-color: var(--color-danger);
  color: #fff;
  font-size: 0.65rem;
  font-weight: 800;
  padding: 0.08rem 0.32rem;
  border-radius: 999px;
}

.notif-dropdown {
  position: absolute;
  right: 0;
  top: calc(100% + 8px);
  width: 340px;
  background-color: var(--color-bg);
  border: 1px solid var(--color-border-dark);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-modal);
  z-index: 100;
  overflow: hidden;
}

.notif-header {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
}

.btn-link-xs {
  background: none;
  border: none;
  color: var(--color-info);
  font-size: 0.72rem;
  cursor: pointer;
}

.notif-empty {
  padding: 1.5rem;
  text-align: center;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.notif-list {
  max-height: 320px;
  overflow-y: auto;
}

.notif-item {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--color-border-subtle);
  cursor: pointer;
}

.notif-item.unread {
  background-color: var(--color-info-bg);
}

.notif-title {
  font-size: 0.8rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
}

.notif-body {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  line-height: 1.35;
}

.user-pill {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: var(--color-surface);
  padding: 0.35rem 0.75rem;
  border-radius: var(--radius-full);
  font-size: 0.8rem;
}

.user-role-tag {
  background-color: var(--color-primary);
  color: #fff;
  padding: 0.1rem 0.4rem;
  border-radius: var(--radius-sm);
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
}

.user-name {
  font-weight: 600;
}

.logout-btn {
  background: none;
  border: 1px solid var(--color-border);
  padding: 0.35rem 0.65rem;
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  cursor: pointer;
}

/* Category Ribbon */
.category-ribbon {
  border-top: 1px solid var(--color-border-subtle);
  background-color: var(--color-bg);
  overflow-x: auto;
}

.ribbon-inner {
  max-width: 1300px;
  margin: 0 auto;
  padding: 0.5rem 1.5rem;
  display: flex;
  gap: 0.5rem;
  white-space: nowrap;
}

.category-pill {
  background: none;
  border: 1px solid transparent;
  padding: 0.35rem 0.85rem;
  border-radius: var(--radius-full);
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.12s ease;
}

.category-pill:hover {
  background-color: var(--color-surface);
  color: var(--color-text-primary);
}

.category-pill.active {
  background-color: var(--color-primary);
  color: #ffffff;
  font-weight: 600;
}

/* Main Content */
.main-content {
  flex: 1;
  max-width: 1300px;
  width: 100%;
  margin: 0 auto;
  padding: 1.5rem;
}

/* Footer */
.public-footer {
  background-color: #171717;
  color: #ededed;
  margin-top: 4rem;
  padding-top: 3.5rem;
  border-top: 1px solid #262626;
}

.footer-container {
  max-width: 1300px;
  margin: 0 auto;
  padding: 0 1.5rem 2.5rem;
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 2.5rem;
}

.footer-heading {
  font-size: 0.95rem;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 1rem;
  letter-spacing: 0.02em;
}

.footer-desc {
  font-size: 0.85rem;
  line-height: 1.5;
  color: #a3a3a3;
  margin-bottom: 1.25rem;
}

.legal-mentions {
  font-size: 0.75rem;
  color: #737373;
  font-family: var(--font-mono);
  line-height: 1.6;
}

.footer-links {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.footer-links a {
  color: #a3a3a3;
  text-decoration: none;
  font-size: 0.85rem;
  transition: color 0.15s;
}

.footer-links a:hover {
  color: #ffffff;
}

.footer-bottom {
  max-width: 1300px;
  margin: 0 auto;
  padding: 1.25rem 1.5rem;
  border-top: 1px solid #262626;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
  color: #737373;
}

.monochromatic-tag {
  font-family: var(--font-mono);
  font-size: 0.7rem;
}

@media (max-width: 768px) {
  .header-inner {
    flex-wrap: wrap;
  }
  .header-search {
    order: 3;
    max-width: 100%;
    width: 100%;
  }
  .footer-container {
    grid-template-columns: 1fr;
  }
}
</style>
