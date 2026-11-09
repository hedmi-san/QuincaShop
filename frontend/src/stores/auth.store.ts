import { defineStore } from 'pinia';
import api from '../services/api';

export interface User {
  id: number;
  email: string;
  fullName: string;
  phone?: string;
  role: 'ADMIN' | 'ACCOUNTANT' | 'CLIENT';
  emailVerified: boolean;
  mustChangePassword: boolean;
}

export interface ClientDocument {
  id: number;
  doc_type: string;
  file_url: string;
  uploaded_at: string;
}

export interface ClientProfile {
  id: number;
  code: string | null;
  name: string;
  contactPerson?: string;
  phone?: string;
  address?: string;
  wilaya?: string;
  rc?: string;
  nif?: string;
  art?: string;
  nis?: string;
  activite?: string;
  status: 'PENDING' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED';
  statusReason?: string | null;
  approvedAt?: string | null;
  creditLimit: number;
  currentBalance: number;
  documents?: ClientDocument[];
}

export interface NotificationItem {
  id: number;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || null,
    user: JSON.parse(localStorage.getItem('user') || 'null') as User | null,
    client: JSON.parse(localStorage.getItem('client') || 'null') as ClientProfile | null,
    notifications: [] as NotificationItem[],
    unreadCount: 0,
    loading: false,
    error: null as string | null,
  }),

  getters: {
    isAuthenticated: (state) => !!state.token,
    isAdmin: (state) => state.user?.role === 'ADMIN',
    isAccountant: (state) => state.user?.role === 'ACCOUNTANT',
    isStaff: (state) => state.user?.role === 'ADMIN' || state.user?.role === 'ACCOUNTANT',
    isClient: (state) => state.user?.role === 'CLIENT',
    isActiveClient: (state) => state.user?.role === 'CLIENT' && state.client?.status === 'ACTIVE',
    isPendingClient: (state) => state.user?.role === 'CLIENT' && state.client?.status === 'PENDING',
  },

  actions: {
    async login(credentials: { email: string; password: string }) {
      this.loading = true;
      this.error = null;
      try {
        const res = await api.post('/auth/login', credentials);
        const data = res.data.data;

        this.token = data.token;
        this.user = data.user;
        this.client = data.client;

        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        if (data.client) {
          localStorage.setItem('client', JSON.stringify(data.client));
        } else {
          localStorage.removeItem('client');
        }

        await this.fetchNotifications();
        return data;
      } catch (err: any) {
        this.error = err.response?.data?.error?.message || err.response?.data?.message || 'Échec de connexion';
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async register(payload: FormData | Record<string, any>) {
      this.loading = true;
      this.error = null;
      try {
        const isFormData = payload instanceof FormData;
        const res = await api.post('/auth/register', payload, {
          headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
        });
        return res.data;
      } catch (err: any) {
        this.error = err.response?.data?.error?.message || err.response?.data?.message || 'Échec de l’inscription';
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async fetchMe() {
      if (!this.token) return null;
      try {
        const res = await api.get('/auth/me');
        const data = res.data.data;
        if (data.token) {
          this.token = data.token;
          localStorage.setItem('token', data.token);
        }
        this.user = data.user;
        this.client = data.client;
        localStorage.setItem('user', JSON.stringify(data.user));
        if (data.client) {
          localStorage.setItem('client', JSON.stringify(data.client));
        }
        return data;
      } catch (err) {
        this.logout();
        return null;
      }
    },

    async uploadDocument(file: File, docType: string) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('docType', docType);
      const res = await api.post('/auth/me/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await this.fetchMe();
      return res.data.data;
    },

    async fetchNotifications() {
      if (!this.token) return;
      try {
        const res = await api.get('/notifications');
        this.notifications = res.data.data.notifications || [];
        this.unreadCount = res.data.data.unreadCount || 0;
      } catch {
        // Ignore notification fetch error
      }
    },

    async markNotificationRead(id: number) {
      try {
        await api.patch(`/notifications/${id}/read`);
        const item = this.notifications.find((n) => n.id === id);
        if (item && !item.is_read) {
          item.is_read = true;
          this.unreadCount = Math.max(0, this.unreadCount - 1);
        }
      } catch {
        // Ignore
      }
    },

    async markAllNotificationsRead() {
      try {
        await api.post('/notifications/read-all');
        this.notifications.forEach((n) => (n.is_read = true));
        this.unreadCount = 0;
      } catch {
        // Ignore
      }
    },

    logout() {
      this.token = null;
      this.user = null;
      this.client = null;
      this.notifications = [];
      this.unreadCount = 0;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('client');
    },
  },
});
