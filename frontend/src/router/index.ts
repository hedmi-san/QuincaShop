import { createRouter, createWebHistory } from 'vue-router';
import PublicLayout from '../layouts/PublicLayout.vue';
import DashboardLayout from '../layouts/DashboardLayout.vue';
import { useAuthStore } from '../stores/auth.store';

const routes = [
  {
    path: '/',
    component: PublicLayout,
    children: [
      {
        path: '',
        name: 'PublicCatalog',
        component: () => import('../views/public/PublicCatalogView.vue'),
      },
      {
        path: 'catalog',
        redirect: '/',
      },
      {
        path: 'products/:slug',
        name: 'ProductDetail',
        component: () => import('../views/public/ProductDetailView.vue'),
      },
      {
        path: 'catalog/:slug',
        redirect: (to: any) => `/products/${to.params.slug}`,
      },
      {
        path: 'portal/pending',
        name: 'PendingApprovalNotice',
        component: () => import('../views/portal/PendingApprovalNoticeView.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: 'portal/cart',
        name: 'PortalCart',
        component: () => import('../views/portal/CartView.vue'),
        meta: { requiresAuth: true, requiresActiveClient: true },
      },
      {
        path: 'cart',
        redirect: '/portal/cart',
      },
      {
        path: 'portal/orders',
        name: 'PortalOrdersList',
        component: () => import('../views/portal/OrdersListView.vue'),
        meta: { requiresAuth: true, requiresActiveClient: true },
      },
      {
        path: 'portal/orders/:id',
        name: 'PortalOrderTracking',
        component: () => import('../views/portal/OrderTrackingView.vue'),
        meta: { requiresAuth: true, requiresActiveClient: true },
      },
      {
        path: 'portal/me/statement',
        name: 'PortalStatement',
        component: () => import('../views/portal/StatementView.vue'),
        meta: { requiresAuth: true, requiresActiveClient: true },
      },
      {
        path: 'portal/me/factures',
        name: 'PortalFactures',
        component: () => import('../views/portal/FacturesListView.vue'),
        meta: { requiresAuth: true, requiresActiveClient: true },
      },
      {
        path: 'portal/me/factures/:id',
        name: 'PortalFactureDetail',
        component: () => import('../views/portal/FactureDetailView.vue'),
        meta: { requiresAuth: true, requiresActiveClient: true },
      },
    ],
  },
  {
    path: '/admin',
    component: DashboardLayout,
    meta: { requiresAuth: true, requiresStaff: true },
    children: [
      {
        path: '',
        redirect: '/admin/orders',
      },
      {
        path: 'orders',
        name: 'AdminOrdersList',
        component: () => import('../views/admin/OrdersListView.vue'),
      },
      {
        path: 'factures',
        name: 'AdminFactures',
        component: () => import('../views/admin/FacturesListView.vue'),
      },
      {
        path: 'clients/pending',
        name: 'PendingClients',
        component: () => import('../views/admin/PendingClientsView.vue'),
      },
      {
        path: 'clients/:id',
        name: 'ClientDetail',
        component: () => import('../views/admin/ClientDetailView.vue'),
      },
      {
        path: 'clients/:id/ledger',
        name: 'AdminClientLedger',
        component: () => import('../views/admin/ClientLedgerView.vue'),
      },
      {
        path: 'expenses',
        name: 'AdminExpenses',
        component: () => import('../views/admin/ExpensesView.vue'),
        meta: { requiresAuth: true, requiresAdmin: true },
      },
      {
        path: 'hr/employees',
        name: 'AdminEmployees',
        component: () => import('../views/admin/EmployeesView.vue'),
        meta: { requiresAuth: true, requiresAdmin: true },
      },
      {
        path: 'hr/payroll',
        name: 'AdminPayroll',
        component: () => import('../views/admin/PayrollView.vue'),
        meta: { requiresAuth: true, requiresAdmin: true },
      },
      {
        path: 'reports',
        name: 'AdminReports',
        component: () => import('../views/admin/ReportsDashboardView.vue'),
        meta: { requiresAuth: true, requiresAdmin: true },
      },
    ],
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/auth/LoginView.vue'),
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../views/auth/RegisterView.vue'),
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  },
});

router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore();

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return next({ path: '/login', query: { redirect: to.fullPath } });
  }

  if (to.meta.requiresStaff && !authStore.isStaff) {
    return next('/');
  }

  if (to.meta.requiresAdmin && !authStore.isAdmin) {
    return next('/admin/orders');
  }

  if (to.meta.requiresActiveClient) {
    if (authStore.isPendingClient) {
      return next('/portal/pending');
    }
    if (!authStore.isActiveClient) {
      return next('/login');
    }
  }

  return next();
});

export default router;
