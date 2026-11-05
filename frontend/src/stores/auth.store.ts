import { defineStore } from 'pinia';
import api from '../services/api';

export interface User {
  id: number;
  email: string;
  fullName: string;
  role: 'ADMIN' | 'ACCOUNTANT' | 'CLIENT';
  emailVerified: boolean;
  mustChangePassword: boolean;
}

export interface ClientProfile {
  id: number;
  code: string | null;
  name: string;
  status: 'PENDING' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED';
  creditLimit: number;
  currentBalance: number;
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || null,
    user: JSON.parse(localStorage.getItem('user') || 'null') as User | null,
    client: JSON.parse(localStorage.getItem('client') || 'null') as ClientProfile | null,
    loading: false,
    error: null as string | null,
  }),

  getters: {
    isAuthenticated: (state) => !!state.token,
    isAdmin: (state) => state.user?.role === 'ADMIN',
    isAccountant: (state) => state.user?.role === 'ACCOUNTANT',
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

        return data;
      } catch (err: any) {
        this.error = err.response?.data?.error?.message || err.response?.data?.message || 'Échec de connexion';
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async register(payload: any) {
      this.loading = true;
      this.error = null;
      try {
        const res = await api.post('/auth/register', payload);
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

    logout() {
      this.token = null;
      this.user = null;
      this.client = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('client');
    },
  },
});

