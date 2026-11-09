<template>
  <div class="dashboard-layout">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-brand">
        <router-link to="/admin/clients/pending" class="brand-link">
          <img src="/src/assets/images/logo.png" alt="Logo" class="brand-logo" />
          <div class="brand-text">
            <span class="brand-title">QUINCA ERP</span>
            <span class="brand-sub">Back-Office Central</span>
          </div>
        </router-link>
      </div>

      <nav class="sidebar-nav">
        <div class="nav-section">
          <span class="nav-section-label">VENTES & COMMANDES</span>
          <router-link
            to="/admin/orders"
            class="nav-item"
            :class="{ active: $route.path.startsWith('/admin/orders') }"
          >
            <span>📦 Commandes B2B</span>
          </router-link>
        </div>

        <div class="nav-section">
          <span class="nav-section-label">COMPTABILITÉ & FACTURATION</span>
          <router-link
            to="/admin/factures"
            class="nav-item"
            :class="{ active: $route.path.startsWith('/admin/factures') }"
          >
            <span>📑 Factures & Documents</span>
          </router-link>
        </div>

        <div class="nav-section">
          <span class="nav-section-label">COMMERCIAL & CLIENTS</span>
          <router-link
            to="/admin/clients/pending"
            class="nav-item"
            :class="{ active: $route.path.startsWith('/admin/clients') }"
          >
            <span>👥 Clients & Agréments</span>
          </router-link>
        </div>

        <div v-if="authStore.isAdmin" class="nav-section">
          <span class="nav-section-label">RESSOURCES HUMAINES & ERP</span>
          <router-link
            to="/admin/hr/employees"
            class="nav-item"
            :class="{ active: $route.path.startsWith('/admin/hr/employees') }"
          >
            <span>👥 Personnel & Salariés</span>
          </router-link>
          <router-link
            to="/admin/hr/payroll"
            class="nav-item"
            :class="{ active: $route.path.startsWith('/admin/hr/payroll') }"
          >
            <span>💰 Livre de Paie</span>
          </router-link>
          <router-link
            to="/admin/expenses"
            class="nav-item"
            :class="{ active: $route.path.startsWith('/admin/expenses') }"
          >
            <span>📉 Frais Généraux</span>
          </router-link>
          <router-link
            to="/admin/reports"
            class="nav-item"
            :class="{ active: $route.path.startsWith('/admin/reports') }"
          >
            <span>📊 Analyses & Pilotage P&L</span>
          </router-link>
        </div>

        <div class="nav-section">
          <span class="nav-section-label">VITRINE & CATALOGUE</span>
          <router-link to="/" class="nav-item">
            <span>🏪 Voir la Boutique B2B</span>
          </router-link>
        </div>
      </nav>

      <div class="sidebar-footer">
        <div class="staff-card">
          <span class="staff-role">{{ authStore.user?.role }}</span>
          <span class="staff-name">{{ authStore.user?.fullName }}</span>
          <span class="staff-email">{{ authStore.user?.email }}</span>
        </div>
        <button class="btn-logout-full" @click="logout">
          Se Déconnecter
        </button>
      </div>
    </aside>

    <!-- Main Area -->
    <div class="dashboard-main">
      <!-- Top Header -->
      <header class="dashboard-header">
        <div class="header-left">
          <h2 class="page-heading">Administration & Gestion Commerciale</h2>
        </div>

        <div class="header-right">
          <LanguageSwitcher />

          <!-- Notification Bell -->
          <div class="notif-wrapper">
            <button class="notif-btn" @click="showNotifs = !showNotifs">
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
                  <div class="notif-time">{{ formatDateTime(n.created_at, false) }}</div>
                </div>
              </div>
            </div>
          </div>

          <router-link to="/" class="btn-store-link">
            Boutique Publique ↗
          </router-link>
        </div>
      </header>

      <!-- Content -->
      <main class="dashboard-content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore, NotificationItem } from '../stores/auth.store';
import { formatDateTime } from '../utils/formatters';
import LanguageSwitcher from '../components/common/LanguageSwitcher.vue';

const router = useRouter();
const authStore = useAuthStore();
const showNotifs = ref(false);

onMounted(() => {
  authStore.fetchNotifications();
});

async function onNotifClick(n: NotificationItem) {
  if (!n.is_read) {
    await authStore.markNotificationRead(n.id);
  }
  showNotifs.value = false;
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
.dashboard-layout {
  display: flex;
  min-height: 100vh;
  background-color: var(--color-bg-subtle);
}

/* Sidebar */
.sidebar {
  width: 260px;
  background-color: #141414;
  color: #f5f5f5;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-brand {
  padding: 1.25rem 1.25rem;
  border-bottom: 1px solid #262626;
}

.brand-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  text-decoration: none;
  color: inherit;
}

.brand-logo {
  height: 36px;
  width: auto;
  background: #fff;
  padding: 3px;
  border-radius: 6px;
}

.brand-text {
  display: flex;
  flex-direction: column;
}

.brand-title {
  font-size: 0.95rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  color: #fff;
}

.brand-sub {
  font-size: 0.7rem;
  color: #a3a3a3;
}

.sidebar-nav {
  flex: 1;
  padding: 1.25rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.nav-section {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.nav-section-label {
  font-size: 0.65rem;
  font-weight: 700;
  color: #737373;
  letter-spacing: 0.08em;
  padding: 0 0.75rem;
  margin-bottom: 0.25rem;
}

.nav-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.65rem 0.75rem;
  border-radius: var(--radius-sm);
  color: #d4d4d4;
  text-decoration: none;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.15s;
}

.nav-item:hover {
  background-color: #262626;
  color: #fff;
}

.nav-item.active {
  background-color: #ffffff;
  color: #141414;
  font-weight: 700;
}

.sidebar-footer {
  padding: 1rem;
  border-top: 1px solid #262626;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.staff-card {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.staff-role {
  font-size: 0.65rem;
  font-weight: 800;
  color: #a3a3a3;
  text-transform: uppercase;
}

.staff-name {
  font-size: 0.85rem;
  font-weight: 700;
  color: #fff;
}

.staff-email {
  font-size: 0.75rem;
  color: #737373;
}

.btn-logout-full {
  background-color: #262626;
  color: #e5e5e5;
  border: 1px solid #404040;
  padding: 0.5rem;
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-logout-full:hover {
  background-color: #333;
}

/* Main Content */
.dashboard-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.dashboard-header {
  height: 64px;
  background-color: var(--color-bg);
  border-bottom: 1px solid var(--color-border);
  padding: 0 2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-heading {
  font-size: 1.05rem;
  font-weight: 700;
  margin: 0;
  color: var(--color-primary);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

/* Notifications */
.notif-wrapper {
  position: relative;
}

.notif-btn {
  position: relative;
  background: var(--color-bg-subtle);
  border: 1px solid var(--color-border);
  padding: 0.45rem 0.65rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 1rem;
}

.notif-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  background-color: var(--color-danger);
  color: #fff;
  font-size: 0.65rem;
  font-weight: 800;
  padding: 0.1rem 0.35rem;
  border-radius: 999px;
}

.notif-dropdown {
  position: absolute;
  right: 0;
  top: calc(100% + 8px);
  width: 360px;
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
  font-size: 0.75rem;
  cursor: pointer;
}

.notif-empty {
  padding: 1.5rem;
  text-align: center;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.notif-list {
  max-height: 360px;
  overflow-y: auto;
}

.notif-item {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--color-border-subtle);
  cursor: pointer;
}

.notif-item:hover {
  background-color: var(--color-bg-subtle);
}

.notif-item.unread {
  background-color: var(--color-info-bg);
}

.notif-title {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--color-primary);
  margin-bottom: 0.25rem;
}

.notif-body {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  line-height: 1.4;
}

.notif-time {
  font-size: 0.68rem;
  color: var(--color-text-tertiary);
  margin-top: 0.3rem;
}

.btn-store-link {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-primary);
  text-decoration: none;
  padding: 0.45rem 0.85rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.dashboard-content {
  flex: 1;
  padding: 2rem;
}
</style>

