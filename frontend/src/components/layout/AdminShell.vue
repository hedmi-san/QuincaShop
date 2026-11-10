<template>
  <div class="ui-admin-shell" :class="{ 'drawer-open': isDrawerOpen }">
    <!-- Mobile Backdrop -->
    <div
      v-if="isDrawerOpen"
      class="drawer-backdrop"
      aria-hidden="true"
      @click="isDrawerOpen = false"
    />

    <!-- Admin Sidebar -->
    <aside class="admin-sidebar" role="navigation" aria-label="Menu principal">
      <div class="sidebar-brand">
        <router-link to="/admin/orders" class="brand-link" @click="isDrawerOpen = false">
          <img src="/src/assets/images/logo.png" alt="Logo" class="brand-logo" />
          <div class="brand-info">
            <span class="brand-title">{{ APP_BRAND_SHORT }}</span>
            <span class="brand-sub">Administration Centrale</span>
          </div>
        </router-link>
        <button
          type="button"
          class="drawer-close-btn"
          aria-label="Fermer le menu"
          @click="isDrawerOpen = false"
        >
          <Icon name="x" :size="18" />
        </button>
      </div>

      <nav class="sidebar-nav">
        <!-- Ventes & Encaissements -->
        <div class="nav-group">
          <span class="nav-group-title">Ventes & Encaissements</span>
          <router-link
            to="/admin/pos"
            class="nav-link"
            :class="{ 'is-active': $route.path === '/admin/pos' }"
            @click="isDrawerOpen = false"
          >
            <Icon name="shopping-cart" :size="18" class="nav-icon" />
            <span>Vente au Comptoir (POS)</span>
          </router-link>
          <router-link
            to="/admin/orders"
            class="nav-link"
            :class="{ 'is-active': $route.path.startsWith('/admin/orders') }"
            @click="isDrawerOpen = false"
          >
            <Icon name="package" :size="18" class="nav-icon" />
            <span>Commandes B2B</span>
          </router-link>
          <router-link
            to="/admin/factures"
            class="nav-link"
            :class="{ 'is-active': $route.path.startsWith('/admin/factures') }"
            @click="isDrawerOpen = false"
          >
            <Icon name="file-text" :size="18" class="nav-icon" />
            <span>Factures & Avoirs</span>
          </router-link>
          <router-link
            to="/admin/clients/pending"
            class="nav-link"
            :class="{ 'is-active': $route.path.startsWith('/admin/clients') }"
            @click="isDrawerOpen = false"
          >
            <Icon name="users" :size="18" class="nav-icon" />
            <span>Clients & Agréments</span>
          </router-link>
        </div>

        <!-- Catalogue & Stocks -->
        <div class="nav-group">
          <span class="nav-group-title">Catalogue & Inventaire</span>
          <router-link
            to="/admin/products"
            class="nav-link"
            :class="{ 'is-active': $route.path.startsWith('/admin/products') }"
            @click="isDrawerOpen = false"
          >
            <Icon name="layout-grid" :size="18" class="nav-icon" />
            <span>Catalogue Produits</span>
          </router-link>
          <router-link
            to="/admin/stock"
            class="nav-link"
            :class="{ 'is-active': $route.path.startsWith('/admin/stock') }"
            @click="isDrawerOpen = false"
          >
            <Icon name="boxes" :size="18" class="nav-icon" />
            <span>Gestion des Stocks</span>
          </router-link>
        </div>

        <!-- RH & Pilotage (Admin Only) -->
        <div v-if="authStore.isAdmin" class="nav-group">
          <span class="nav-group-title">Ressources & Gestion</span>
          <router-link
            to="/admin/hr/employees"
            class="nav-link"
            :class="{ 'is-active': $route.path.startsWith('/admin/hr/employees') }"
            @click="isDrawerOpen = false"
          >
            <Icon name="user-check" :size="18" class="nav-icon" />
            <span>Personnel & Salariés</span>
          </router-link>
          <router-link
            to="/admin/hr/payroll"
            class="nav-link"
            :class="{ 'is-active': $route.path.startsWith('/admin/hr/payroll') }"
            @click="isDrawerOpen = false"
          >
            <Icon name="coins" :size="18" class="nav-icon" />
            <span>Livre de Paie</span>
          </router-link>
          <router-link
            to="/admin/expenses"
            class="nav-link"
            :class="{ 'is-active': $route.path.startsWith('/admin/expenses') }"
            @click="isDrawerOpen = false"
          >
            <Icon name="trending-down" :size="18" class="nav-icon" />
            <span>Frais Généraux</span>
          </router-link>
          <router-link
            to="/admin/reports"
            class="nav-link"
            :class="{ 'is-active': $route.path.startsWith('/admin/reports') }"
            @click="isDrawerOpen = false"
          >
            <Icon name="bar-chart-3" :size="18" class="nav-icon" />
            <span>Analyses P&L & Risque</span>
          </router-link>
        </div>

        <!-- Vitrine Publique -->
        <div class="nav-group">
          <span class="nav-group-title">Magasin & Vitrine</span>
          <router-link to="/" class="nav-link" @click="isDrawerOpen = false">
            <Icon name="store" :size="18" class="nav-icon" />
            <span>Boutique Publique</span>
          </router-link>
        </div>
      </nav>

      <!-- Sidebar Footer -->
      <div class="sidebar-footer">
        <div class="user-profile-badge">
          <div class="user-avatar font-mono">
            {{ userInitials }}
          </div>
          <div class="user-meta">
            <span class="user-name">{{ authStore.user?.fullName || 'Utilisateur' }}</span>
            <span class="user-role">{{ authStore.user?.role || 'STAFF' }}</span>
          </div>
        </div>
        <button
          type="button"
          class="logout-button"
          title="Se déconnecter"
          @click="handleLogout"
        >
          <Icon name="log-out" :size="16" />
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>

    <!-- Main Content Shell -->
    <div class="admin-main">
      <!-- Top Bar -->
      <header class="admin-topbar">
        <div class="topbar-start">
          <button
            type="button"
            class="drawer-toggle-btn"
            aria-label="Ouvrir le menu de navigation"
            @click="isDrawerOpen = true"
          >
            <Icon name="menu" :size="20" />
          </button>
          <div class="topbar-title">
            <slot name="breadcrumb">
              <span class="brand-tag font-mono">{{ APP_BRAND_NAME }}</span>
            </slot>
          </div>
        </div>

        <div class="topbar-end">
          <!-- Notifications -->
          <div class="notif-menu-wrapper">
            <button
              type="button"
              class="topbar-icon-btn"
              :class="{ 'has-unread': authStore.unreadCount > 0 }"
              aria-label="Notifications"
              @click="showNotifs = !showNotifs"
            >
              <Icon name="bell" :size="18" />
              <span v-if="authStore.unreadCount > 0" class="notif-badge">
                {{ authStore.unreadCount }}
              </span>
            </button>

            <!-- Notifications Dropdown -->
            <div v-if="showNotifs" class="notif-panel">
              <div class="notif-panel-header">
                <span class="notif-title">Notifications ({{ authStore.unreadCount }})</span>
                <button
                  v-if="authStore.unreadCount > 0"
                  type="button"
                  class="mark-all-btn"
                  @click="authStore.markAllNotificationsRead()"
                >
                  Tout marquer lu
                </button>
              </div>
              <div v-if="!authStore.notifications?.length" class="notif-empty">
                Aucune nouvelle notification.
              </div>
              <div v-else class="notif-items">
                <div
                  v-for="n in authStore.notifications"
                  :key="n.id"
                  class="notif-row"
                  :class="{ 'is-unread': !n.is_read }"
                  @click="onNotifClick(n)"
                >
                  <div class="notif-row-title">{{ n.title }}</div>
                  <div v-if="n.body" class="notif-row-body">{{ n.body }}</div>
                  <div class="notif-row-time">{{ formatDateTime(n.created_at) }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <!-- Page Body Area -->
      <main class="admin-page-body">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore, type NotificationItem } from '../../stores/auth.store';
import Icon from '../ui/Icon.vue';
import { APP_BRAND_NAME, APP_BRAND_SHORT } from '../../lib/brand';
import { formatDateTime } from '../../lib/format';

const authStore = useAuthStore();
const router = useRouter();

const isDrawerOpen = ref(false);
const showNotifs = ref(false);

const userInitials = computed(() => {
  const name = authStore.user?.fullName || 'A';
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
});

function handleLogout() {
  authStore.logout();
  router.push('/login');
}

async function onNotifClick(n: NotificationItem) {
  if (!n.is_read) {
    await authStore.markNotificationRead(n.id);
  }
  showNotifs.value = false;
  if (n.link) {
    router.push(n.link);
  }
}
</script>

<style scoped>
.ui-admin-shell {
  display: flex;
  min-height: 100vh;
  background-color: var(--color-subtle);
}

/* Sidebar: 240px desktop */
.admin-sidebar {
  width: 250px;
  background-color: var(--color-brand);
  color: var(--color-text-inverse);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  transition: transform 0.2s ease;
  z-index: var(--z-drawer);
}

.sidebar-brand {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.brand-link {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  text-decoration: none;
  color: inherit;
}

.brand-logo {
  width: 32px;
  height: 32px;
  object-fit: contain;
}

.brand-info {
  display: flex;
  flex-direction: column;
}

.brand-title {
  font-family: var(--font-sans);
  font-size: var(--font-size-base);
  font-weight: 600;
  line-height: 1.2;
  color: var(--color-text-inverse);
}

.brand-sub {
  font-size: var(--font-size-xs, 12px);
  color: var(--color-text-tertiary);
}

.drawer-close-btn {
  display: none;
  background: transparent;
  border: none;
  color: var(--color-text-inverse);
  cursor: pointer;
  padding: 4px;
}

.sidebar-nav {
  flex: 1;
  padding: var(--space-4) var(--space-2);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  overflow-y: auto;
}

.nav-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nav-group-title {
  font-family: var(--font-sans);
  font-size: var(--font-size-xs, 12px);
  font-weight: 600;
  color: var(--color-text-tertiary);
  padding: var(--space-1) var(--space-3);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-control);
  font-family: var(--font-sans);
  font-size: var(--font-size-base);
  font-weight: 500;
  color: #cbd5e1;
  text-decoration: none;
  transition: all 0.15s ease;
}

.nav-link:hover {
  background-color: rgba(255, 255, 255, 0.08);
  color: var(--color-text-inverse);
}

.nav-link.is-active {
  background-color: var(--color-accent);
  color: var(--color-text-inverse);
}

.nav-icon {
  color: currentColor;
}

.sidebar-footer {
  padding: var(--space-4);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.user-profile-badge {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-pill);
  background-color: rgba(255, 255, 255, 0.15);
  color: var(--color-text-inverse);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
}

.user-meta {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.user-name {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-inverse);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-role {
  font-size: var(--font-size-xs, 12px);
  color: var(--color-text-tertiary);
}

.logout-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  width: 100%;
  height: var(--height-control-dense);
  background-color: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: var(--radius-control);
  color: #cbd5e1;
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all 0.15s ease;
}
.logout-button:hover {
  background-color: rgba(239, 68, 68, 0.2);
  border-color: #ef4444;
  color: #ffffff;
}

/* Main Area */
.admin-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.admin-topbar {
  height: 56px;
  background-color: var(--color-surface);
  border-bottom: 1px solid var(--color-line);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-5);
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
}

.topbar-start {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.drawer-toggle-btn {
  display: none;
  background: transparent;
  border: none;
  color: var(--color-ink);
  cursor: pointer;
  padding: var(--space-1);
}

.brand-tag {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.topbar-end {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.topbar-icon-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-control);
  background: transparent;
  border: 1px solid var(--color-line);
  color: var(--color-text-secondary);
  cursor: pointer;
}
.topbar-icon-btn:hover {
  background-color: var(--color-subtle);
  color: var(--color-ink);
}

.notif-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background-color: var(--color-danger);
  color: var(--color-text-inverse);
  font-size: var(--font-size-xs, 12px);
  font-weight: 600;
  padding: 1px 5px;
  border-radius: var(--radius-pill);
  font-family: var(--font-mono);
}

.notif-menu-wrapper {
  position: relative;
}

.notif-panel {
  position: absolute;
  right: 0;
  top: calc(100% + 8px);
  width: 320px;
  background-color: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-md);
  z-index: var(--z-dropdown);
  overflow: hidden;
}

.notif-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  background-color: var(--color-subtle);
  border-bottom: 1px solid var(--color-line);
  font-size: var(--font-size-xs);
  font-weight: 600;
}

.mark-all-btn {
  background: transparent;
  border: none;
  color: var(--color-accent);
  font-size: var(--font-size-xs, 12px);
  cursor: pointer;
}

.notif-empty {
  padding: var(--space-4);
  text-align: center;
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
}

.notif-items {
  max-height: 280px;
  overflow-y: auto;
}

.notif-row {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-line);
  cursor: pointer;
  transition: background-color 0.15s ease;
}
.notif-row:hover {
  background-color: var(--color-subtle);
}
.notif-row.is-unread {
  background-color: var(--color-accent-subtle);
}
.notif-row-title {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-ink);
}
.notif-row-body {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}
.notif-row-time {
  font-size: var(--font-size-xs, 12px);
  color: var(--color-text-tertiary);
  margin-top: 2px;
}

/* Page Body: Contract padding budget (24px desktop / 16px mobile) */
.admin-page-body {
  flex: 1;
  padding: var(--space-5);
  max-width: 1600px;
  width: 100%;
  margin: 0 auto;
}

/* Responsive Drawer Behavior */
@media (max-width: 768px) {
  .admin-sidebar {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    transform: translateX(-100%);
  }

  .ui-admin-shell.drawer-open .admin-sidebar {
    transform: translateX(0);
  }

  .drawer-backdrop {
    position: fixed;
    inset: 0;
    background-color: rgba(15, 23, 42, 0.5);
    z-index: calc(var(--z-drawer) - 1);
  }

  .drawer-toggle-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 44px;
    min-height: 44px;
  }

  .drawer-close-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 44px;
    min-height: 44px;
  }

  .topbar-icon-btn {
    min-width: 44px;
    min-height: 44px;
  }

  .admin-page-body {
    padding: var(--space-4);
  }
}
</style>

