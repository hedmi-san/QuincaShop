import { defineStore } from 'pinia';
import api from '../services/api';

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  product_name: string;
  reference: string;
  unit: string;
  quantity: number;
  unit_price: number;
  tva: number;
  thumb_url?: string | null;
}

export interface OrderStatusHistoryItem {
  id: number;
  order_id: number;
  status: string;
  note: string | null;
  visible_to_client: boolean;
  changed_by: number | null;
  changed_by_name?: string | null;
  created_at: string;
}

export interface Order {
  id: number;
  order_number: string;
  client_id: number;
  status:
    | 'PENDING'
    | 'CONFIRMED'
    | 'PREPARING'
    | 'READY'
    | 'DELIVERED'
    | 'COMPLETED'
    | 'CANCELLED'
    | 'REJECTED';
  fulfillment_type: 'PICKUP' | 'DELIVERY';
  delivery_address: string | null;
  delivery_fee: number;
  payment_method: 'CASH' | 'CHECK' | 'TRANSFER' | 'ON_CREDIT';
  subtotal_ht: number;
  total_tva: number;
  total_ttc: number;
  client_note: string | null;
  staff_note: string | null;
  cancel_reason: string | null;
  channel: string;
  created_at: string;
  updated_at: string;
  client_code?: string;
  client_name?: string;
  client_phone?: string;
  client_wilaya?: string;
  client_address?: string;
  client_rc?: string;
  client_nif?: string;
  client_credit_limit?: number;
  client_current_balance?: number;
  items_count?: number;
  items?: OrderItem[];
  history?: OrderStatusHistoryItem[];
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export const useOrderStore = defineStore('order', {
  state: () => ({
    orders: [] as Order[],
    currentOrder: null as Order | null,
    meta: {
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 1,
    } as PaginationMeta,
    loading: false,
    error: null as string | null,
  }),

  actions: {
    // Client Checkout
    async placeOrder(payload: {
      fulfillmentType?: 'PICKUP' | 'DELIVERY';
      deliveryAddress?: string;
      paymentMethod?: 'CASH' | 'CHECK' | 'TRANSFER' | 'ON_CREDIT';
      clientNote?: string;
    }) {
      this.loading = true;
      this.error = null;
      try {
        const res = await api.post('/portal/orders', payload);
        const order = res.data.data;
        return order;
      } catch (err: any) {
        const errObj = err.response?.data?.error;
        const msg = errObj?.message || err.message || 'Impossible de valider la commande';
        this.error = msg;
        throw new Error(msg);
      } finally {
        this.loading = false;
      }
    },

    // Client Orders List
    async fetchPortalOrders(params?: { page?: number; status?: string; search?: string }) {
      this.loading = true;
      this.error = null;
      try {
        const res = await api.get('/portal/orders', { params });
        this.orders = res.data.data;
        this.meta = res.data.meta;
      } catch (err: any) {
        this.error = err.response?.data?.error?.message || err.message;
      } finally {
        this.loading = false;
      }
    },

    // Client Order Details (Visual tracking)
    async fetchPortalOrderById(id: number) {
      this.loading = true;
      this.error = null;
      try {
        const res = await api.get(`/portal/orders/${id}`);
        this.currentOrder = res.data.data;
        return this.currentOrder;
      } catch (err: any) {
        this.error = err.response?.data?.error?.message || err.message;
        throw err;
      } finally {
        this.loading = false;
      }
    },

    // Client Cancel Order
    async cancelPortalOrder(id: number, reason?: string) {
      this.loading = true;
      this.error = null;
      try {
        const res = await api.post(`/portal/orders/${id}/cancel`, { reason });
        const updated = res.data.data;
        if (this.currentOrder && this.currentOrder.id === id) {
          this.currentOrder = { ...this.currentOrder, ...updated };
        }
        return updated;
      } catch (err: any) {
        const msg = err.response?.data?.error?.message || err.message;
        this.error = msg;
        throw new Error(msg);
      } finally {
        this.loading = false;
      }
    },

    // Admin Orders List
    async fetchAdminOrders(params?: { page?: number; pageSize?: number; status?: string; search?: string }) {
      this.loading = true;
      this.error = null;
      try {
        const res = await api.get('/admin/orders', { params });
        this.orders = res.data.data;
        this.meta = res.data.meta;
      } catch (err: any) {
        this.error = err.response?.data?.error?.message || err.message;
      } finally {
        this.loading = false;
      }
    },

    // Admin Order Details
    async fetchAdminOrderById(id: number) {
      this.loading = true;
      this.error = null;
      try {
        const res = await api.get(`/admin/orders/${id}`);
        this.currentOrder = res.data.data;
        return this.currentOrder;
      } catch (err: any) {
        this.error = err.response?.data?.error?.message || err.message;
        throw err;
      } finally {
        this.loading = false;
      }
    },

    // Admin Update Order Status
    async updateAdminOrderStatus(
      id: number,
      status: string,
      options?: { note?: string; visibleToClient?: boolean; cancelReason?: string }
    ) {
      this.loading = true;
      this.error = null;
      try {
        const res = await api.patch(`/admin/orders/${id}/status`, {
          status,
          ...options,
        });
        const updated = res.data.data;
        if (this.currentOrder && this.currentOrder.id === id) {
          await this.fetchAdminOrderById(id);
        }
        return updated;
      } catch (err: any) {
        const msg = err.response?.data?.error?.message || err.message;
        this.error = msg;
        throw new Error(msg);
      } finally {
        this.loading = false;
      }
    },

    // Admin Cancel Order
    async cancelAdminOrder(id: number, cancelReason: string) {
      this.loading = true;
      this.error = null;
      try {
        const res = await api.post(`/admin/orders/${id}/cancel`, { cancelReason });
        const updated = res.data.data;
        if (this.currentOrder && this.currentOrder.id === id) {
          await this.fetchAdminOrderById(id);
        }
        return updated;
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

