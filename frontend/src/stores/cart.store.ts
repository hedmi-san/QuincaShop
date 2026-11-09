import { defineStore } from 'pinia';
import api from '../services/api';

export interface CartItem {
  cartItemId: number;
  productId: number;
  reference: string;
  name: string;
  slug: string;
  brand?: string;
  unit: string;
  boxSize?: number;
  thumbUrl: string | null;
  quantity: number;
  minOrderQty: number;
  unitPrice: number;
  tvaRate: number;
  lineHt: number;
  lineTva: number;
  lineTtc: number;
  availableQuantity: number;
  isAvailable: boolean;
  active: boolean;
  published: boolean;
}

export interface CartSummary {
  subtotalHt: number;
  totalTva: number;
  totalTtc: number;
  itemCount: number;
  totalQuantity: number;
  hasStockIssue: boolean;
}

export const useCartStore = defineStore('cart', {
  state: () => ({
    items: [] as CartItem[],
    summary: {
      subtotalHt: 0,
      totalTva: 0,
      totalTtc: 0,
      itemCount: 0,
      totalQuantity: 0,
      hasStockIssue: false,
    } as CartSummary,
    loading: false,
    error: null as string | null,
  }),

  getters: {
    count: (state) => state.summary.itemCount,
    totalQuantity: (state) => state.summary.totalQuantity,
    totalTtc: (state) => state.summary.totalTtc,
    isEmpty: (state) => state.items.length === 0,
  },

  actions: {
    async fetchCart() {
      this.loading = true;
      this.error = null;
      try {
        const res = await api.get('/portal/cart');
        const data = res.data.data;
        this.items = data.items || [];
        this.summary = data.summary || {
          subtotalHt: 0,
          totalTva: 0,
          totalTtc: 0,
          itemCount: 0,
          totalQuantity: 0,
          hasStockIssue: false,
        };
      } catch (err: any) {
        this.error = err.response?.data?.error?.message || err.message;
      } finally {
        this.loading = false;
      }
    },

    async addItem(productId: number, quantity = 1) {
      this.loading = true;
      this.error = null;
      try {
        // If product already in cart, increment quantity
        const existing = this.items.find((i) => i.productId === productId);
        const targetQty = existing ? existing.quantity + quantity : quantity;

        const res = await api.put(`/portal/cart/items/${productId}`, { quantity: targetQty });
        const data = res.data.data;
        this.items = data.items || [];
        this.summary = data.summary;
        return data;
      } catch (err: any) {
        const msg = err.response?.data?.error?.message || err.message;
        this.error = msg;
        throw new Error(msg);
      } finally {
        this.loading = false;
      }
    },

    async updateQuantity(productId: number, quantity: number) {
      this.loading = true;
      this.error = null;
      try {
        const res = await api.put(`/portal/cart/items/${productId}`, { quantity });
        const data = res.data.data;
        this.items = data.items || [];
        this.summary = data.summary;
        return data;
      } catch (err: any) {
        const msg = err.response?.data?.error?.message || err.message;
        this.error = msg;
        throw new Error(msg);
      } finally {
        this.loading = false;
      }
    },

    async removeItem(productId: number) {
      this.loading = true;
      this.error = null;
      try {
        const res = await api.delete(`/portal/cart/items/${productId}`);
        const data = res.data.data;
        this.items = data.items || [];
        this.summary = data.summary;
        return data;
      } catch (err: any) {
        const msg = err.response?.data?.error?.message || err.message;
        this.error = msg;
        throw new Error(msg);
      } finally {
        this.loading = false;
      }
    },

    async clearCart() {
      this.loading = true;
      this.error = null;
      try {
        await api.delete('/portal/cart');
        this.items = [];
        this.summary = {
          subtotalHt: 0,
          totalTva: 0,
          totalTtc: 0,
          itemCount: 0,
          totalQuantity: 0,
          hasStockIssue: false,
        };
      } catch (err: any) {
        const msg = err.response?.data?.error?.message || err.message;
        this.error = msg;
        throw new Error(msg);
      } finally {
        this.loading = false;
      }
    },
  },
});

