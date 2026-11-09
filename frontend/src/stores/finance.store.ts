import { defineStore } from 'pinia';
import api from '../services/api';

export interface FactureItem {
  id: number;
  facture_id: number;
  reference: string;
  designation: string;
  unit: string;
  quantity: number;
  unit_price_ht: number;
  tva: number;
}

export interface Facture {
  id: number;
  facture_number: string;
  doc_type: 'FACTURE' | 'PROFORMA' | 'BON_LIVRAISON';
  order_id: number;
  client_id: number;
  payment_mode: string;
  total_ht: number;
  total_tva: number;
  timbre: number;
  total_ttc: number;
  amount_in_words: string | null;
  transport_mode: string | null;
  truck_number: string | null;
  driver_name: string | null;
  client_snapshot: {
    id: number;
    code: string;
    name: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    address?: string;
    wilaya?: string;
    rc?: string;
    nif?: string;
    nis?: string;
    art?: string;
    activite?: string;
  };
  company_snapshot: {
    name: string;
    address: string;
    phone: string;
    email: string;
    rc: string;
    nif: string;
    nis: string;
    art: string;
    capital: string;
    bank: string;
    logoUrl?: string;
  };
  status: 'ISSUED' | 'VOIDED';
  voided_at: string | null;
  void_reason: string | null;
  created_at: string;
  order_number?: string;
  client_code?: string;
  client_name?: string;
  items_count?: number;
  items?: FactureItem[];
}

export interface LedgerTransaction {
  id: number;
  clientId: number;
  type: 'INVOICE' | 'PAYMENT' | 'CREDIT_NOTE' | 'REFUND' | 'ADJUSTMENT';
  referenceType?: string | null;
  referenceId?: number | null;
  debit: number;
  credit: number;
  runningBalance: number;
  description: string;
  transactionDate: string;
  createdByName?: string | null;
}

export interface LedgerSummary {
  totalDebits: number;
  totalCredits: number;
  currentBalance: number;
  creditLimit: number;
  availableCredit: number;
}

export interface ClientBalance {
  id: number;
  code: string;
  name: string;
  creditLimit: number;
  currentBalance: number;
  availableCredit: number;
  status: string;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export const useFinanceStore = defineStore('finance', {
  state: () => ({
    factures: [] as Facture[],
    currentFacture: null as Facture | null,
    ledger: {
      client: null as ClientBalance | null,
      summary: {
        totalDebits: 0,
        totalCredits: 0,
        currentBalance: 0,
        creditLimit: 0,
        availableCredit: 0,
      } as LedgerSummary,
      transactions: [] as LedgerTransaction[],
      meta: { page: 1, pageSize: 30, total: 0, totalPages: 1 } as PaginationMeta,
    },
    meta: {
      page: 1,
      pageSize: 25,
      total: 0,
      totalPages: 1,
    } as PaginationMeta,
    balance: null as ClientBalance | null,
    loading: false,
    error: null as string | null,
  }),

  actions: {
    // Client Portal - Balance
    async fetchMyBalance() {
      try {
        const res = await api.get('/portal/me/balance');
        this.balance = res.data.data;
        return this.balance;
      } catch (err: any) {
        this.error = err.response?.data?.error?.message || err.message;
        throw err;
      }
    },

    // Client Portal - Statement of Account (Extrait de Compte)
    async fetchMyStatement(params?: { fromDate?: string; toDate?: string; type?: string; page?: number }) {
      this.loading = true;
      this.error = null;
      try {
        const res = await api.get('/portal/me/statement', { params });
        this.ledger = res.data.data;
        return this.ledger;
      } catch (err: any) {
        this.error = err.response?.data?.error?.message || err.message;
        throw err;
      } finally {
        this.loading = false;
      }
    },

    // Client Portal - Invoices List
    async fetchMyFactures(params?: { docType?: string; status?: string; search?: string; page?: number }) {
      this.loading = true;
      this.error = null;
      try {
        const res = await api.get('/portal/me/factures', { params });
        this.factures = res.data.data;
        this.meta = res.data.meta;
      } catch (err: any) {
        this.error = err.response?.data?.error?.message || err.message;
      } finally {
        this.loading = false;
      }
    },

    // Client Portal - Invoice Detail
    async fetchMyFactureById(id: number) {
      this.loading = true;
      this.error = null;
      try {
        const res = await api.get(`/portal/me/factures/${id}`);
        this.currentFacture = res.data.data;
        return this.currentFacture;
      } catch (err: any) {
        this.error = err.response?.data?.error?.message || err.message;
        throw err;
      } finally {
        this.loading = false;
      }
    },

    // Admin - Invoices List
    async fetchAdminFactures(params?: {
      clientId?: number;
      docType?: string;
      status?: string;
      search?: string;
      page?: number;
      pageSize?: number;
    }) {
      this.loading = true;
      this.error = null;
      try {
        const res = await api.get('/admin/factures', { params });
        this.factures = res.data.data;
        this.meta = res.data.meta;
      } catch (err: any) {
        this.error = err.response?.data?.error?.message || err.message;
      } finally {
        this.loading = false;
      }
    },

    // Admin - Invoice Detail
    async fetchAdminFactureById(id: number) {
      this.loading = true;
      this.error = null;
      try {
        const res = await api.get(`/admin/factures/${id}`);
        this.currentFacture = res.data.data;
        return this.currentFacture;
      } catch (err: any) {
        this.error = err.response?.data?.error?.message || err.message;
        throw err;
      } finally {
        this.loading = false;
      }
    },

    // Admin - Issue Facture from Order
    async createFactureFromOrder(orderId: number, payload?: {
      docType?: 'FACTURE' | 'PROFORMA' | 'BON_LIVRAISON';
      paymentMode?: string;
      transportMode?: string;
      truckNumber?: string;
      driverName?: string;
    }) {
      this.loading = true;
      this.error = null;
      try {
        const res = await api.post(`/admin/orders/${orderId}/facture`, payload || {});
        return res.data.data;
      } catch (err: any) {
        const msg = err.response?.data?.error?.message || err.message;
        this.error = msg;
        throw new Error(msg);
      } finally {
        this.loading = false;
      }
    },

    // Admin - Void Facture (Annulation)
    async voidFacture(factureId: number, voidReason: string) {
      this.loading = true;
      this.error = null;
      try {
        const res = await api.post(`/admin/factures/${factureId}/annuler`, { voidReason });
        const voided = res.data.data;
        if (this.currentFacture && this.currentFacture.id === factureId) {
          this.currentFacture = { ...this.currentFacture, ...voided };
        }
        return voided;
      } catch (err: any) {
        const msg = err.response?.data?.error?.message || err.message;
        this.error = msg;
        throw new Error(msg);
      } finally {
        this.loading = false;
      }
    },

    // Admin - Client Ledger (Extrait de Compte)
    async fetchClientLedger(clientId: number, params?: { fromDate?: string; toDate?: string; type?: string; page?: number }) {
      this.loading = true;
      this.error = null;
      try {
        const res = await api.get(`/admin/clients/${clientId}/ledger`, { params });
        this.ledger = res.data.data;
        return this.ledger;
      } catch (err: any) {
        this.error = err.response?.data?.error?.message || err.message;
        throw err;
      } finally {
        this.loading = false;
      }
    },

    // Admin - Record Versement / Payment
    async recordClientPayment(clientId: number, payload: {
      amount: number;
      method: 'CASH' | 'CHECK' | 'TRANSFER';
      reference?: string;
      paymentDate?: string;
      allocatedOrderIds?: number[];
    }) {
      this.loading = true;
      this.error = null;
      try {
        const res = await api.post(`/admin/clients/${clientId}/payments`, payload);
        const payment = res.data.data;
        // Refresh ledger
        await this.fetchClientLedger(clientId);
        return payment;
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

