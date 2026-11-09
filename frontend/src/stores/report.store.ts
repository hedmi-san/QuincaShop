import { defineStore } from 'pinia';
import api from '../services/api';

export interface DashboardKpis {
  today: {
    revenueTtc: number;
    revenueHt: number;
    ordersCount: number;
  };
  monthToDate: {
    revenueTtc: number;
    revenueHt: number;
    ordersCount: number;
    paymentsReceived: number;
  };
  alerts: {
    pendingClientsCount: number;
    lowStockCount: number;
    debtorClientsCount: number;
  };
  balances: {
    totalReceivables: number;
    totalInventoryCost: number;
  };
  recentOrders: Array<{
    id: number;
    order_number: string;
    total_ttc: number;
    status: string;
    created_at: string;
    client_name: string;
    client_code: string;
  }>;
}

export interface IncomeStatement {
  period: { from: string; to: string };
  revenue: {
    grossRevenueHT: number;
    creditNotes: number;
    netRevenueHT: number;
    tvaCollected: number;
    timbreFiscal: number;
    revenueTTC: number;
    ordersCount: number;
  };
  cogs: { total: number };
  grossMargin: { amount: number; percentage: number };
  overheadExpenses: {
    total: number;
    categories: Array<{ category: string; amount: number; count: number }>;
  };
  payroll: {
    total: number;
    baseSalaries: number;
    bonuses: number;
    bonus1Eid: number;
    bonus2Performance: number;
    deductions: number;
    payslipsCount: number;
  };
  netProfit: {
    amount: number;
    percentage: number;
    status: 'PROFIT' | 'LOSS';
  };
}

export interface StockValuationItem {
  id: number;
  reference: string;
  name: string;
  barcode: string | null;
  unit: string;
  category: string;
  purchasePrice: number;
  salePrice: number;
  physicalQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  minStockAlert: number;
  costValue: number;
  retailValue: number;
  unrealizedMargin: number;
  isLowStock: boolean;
}

export interface StockValuation {
  summary: {
    totalSkus: number;
    totalPhysicalUnits: number;
    totalCostValue: number;
    totalRetailValue: number;
    totalPotentialMargin: number;
    potentialMarginRate: number;
    lowStockCount: number;
  };
  categories: Array<{
    name: string;
    skus: number;
    units: number;
    costValue: number;
    retailValue: number;
  }>;
  items: StockValuationItem[];
}

export interface ClientAgingItem {
  id: number;
  code: string | null;
  name: string;
  phone: string | null;
  wilaya: string | null;
  creditLimit: number;
  currentBalance: number;
  availableCredit: number;
  utilizationRate: number;
  riskLevel: 'NORMAL' | 'MEDIUM' | 'HIGH';
  aging: {
    current0to30: number;
    days31to60: number;
    days61to90: number;
    over90Days: number;
  };
}

export interface AgingReceivables {
  summary: {
    totalDebt: number;
    totalCreditLimit: number;
    globalUtilizationRate: number;
    debtorCount: number;
    buckets: {
      current0to30: number;
      days31to60: number;
      days61to90: number;
      over90Days: number;
    };
  };
  clients: ClientAgingItem[];
}

export const useReportStore = defineStore('report', {
  state: () => ({
    dashboardKpis: null as DashboardKpis | null,
    incomeStatement: null as IncomeStatement | null,
    stockValuation: null as StockValuation | null,
    receivables: null as AgingReceivables | null,
    loading: false,
    downloading: false,
    error: null as string | null,
  }),

  actions: {
    async fetchDashboardKpis() {
      this.loading = true;
      this.error = null;
      try {
        const res = await api.get('/admin/reports/dashboard');
        this.dashboardKpis = res.data.data;
        return this.dashboardKpis;
      } catch (err: any) {
        this.error = err.response?.data?.error?.message || err.message;
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async fetchIncomeStatement(from?: string, to?: string) {
      this.loading = true;
      this.error = null;
      try {
        const res = await api.get('/admin/reports/income-statement', {
          params: { from, to },
        });
        this.incomeStatement = res.data.data;
        return this.incomeStatement;
      } catch (err: any) {
        this.error = err.response?.data?.error?.message || err.message;
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async fetchStockValuation() {
      this.loading = true;
      this.error = null;
      try {
        const res = await api.get('/admin/reports/stock-valuation');
        this.stockValuation = res.data.data;
        return this.stockValuation;
      } catch (err: any) {
        this.error = err.response?.data?.error?.message || err.message;
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async fetchAgingReceivables() {
      this.loading = true;
      this.error = null;
      try {
        const res = await api.get('/admin/reports/receivables');
        this.receivables = res.data.data;
        return this.receivables;
      } catch (err: any) {
        this.error = err.response?.data?.error?.message || err.message;
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async downloadExcelReport(
      reportType: 'income-statement' | 'stock-valuation' | 'receivables',
      params?: { from?: string; to?: string }
    ) {
      this.downloading = true;
      try {
        const res = await api.get('/admin/reports/export', {
          params: { report: reportType, ...params },
          responseType: 'blob',
        });

        // Trigger browser file download
        const disposition = res.headers['content-disposition'];
        let filename = `rapport-${reportType}.xlsx`;
        if (disposition && disposition.includes('filename=')) {
          const match = disposition.match(/filename="?([^";]+)"?/);
          if (match && match[1]) filename = match[1];
        }

        const blob = new Blob([res.data], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } catch (err: any) {
        this.error = err.response?.data?.error?.message || err.message;
        throw err;
      } finally {
        this.downloading = false;
      }
    },
  },
});

