import { defineStore } from 'pinia';
import api from '../services/api';

export interface ExpenseItem {
  id: number;
  category: string;
  amount: number;
  description: string | null;
  expense_date: string;
  created_by: number | null;
  created_by_name?: string | null;
  created_at: string;
}

export interface ExpenseSummary {
  totalAmount: number;
  totalCount: number;
  categories: Array<{ category: string; amount: number; count: number }>;
}

export interface Employee {
  id: number;
  full_name: string;
  nin: string | null;
  phone: string | null;
  position: string;
  hire_date: string | null;
  base_salary: number;
  status: 'ACTIVE' | 'TERMINATED';
  created_at: string;
}

export interface SalaryItem {
  id: number;
  employee_id: number;
  employee_name: string;
  employee_position: string;
  employee_phone: string | null;
  employee_nin: string | null;
  period: string;
  base_salary: number;
  bonus1: number;
  bonus2: number;
  deductions: number;
  total: number;
  paid: boolean;
  payment_date: string | null;
}

export interface PayrollSummary {
  totalBase: number;
  totalBonus1: number;
  totalBonus2: number;
  totalDeductions: number;
  totalNet: number;
  paidCount: number;
  unpaidCount: number;
  employeeCount: number;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export const useErpStore = defineStore('erp', {
  state: () => ({
    // Expenses
    expenses: [] as ExpenseItem[],
    expenseSummary: {
      totalAmount: 0,
      totalCount: 0,
      categories: [],
    } as ExpenseSummary,
    expenseMeta: { page: 1, pageSize: 30, total: 0, totalPages: 1 } as PaginationMeta,

    // Employees
    employees: [] as Employee[],
    currentEmployee: null as Employee | null,
    employeeSummary: { totalEmployees: 0, monthlyBasePayrollMass: 0 },
    employeeMeta: { page: 1, pageSize: 30, total: 0, totalPages: 1 } as PaginationMeta,

    // Salaries / Payroll
    salaries: [] as SalaryItem[],
    payrollSummary: {
      totalBase: 0,
      totalBonus1: 0,
      totalBonus2: 0,
      totalDeductions: 0,
      totalNet: 0,
      paidCount: 0,
      unpaidCount: 0,
      employeeCount: 0,
    } as PayrollSummary,
    activePeriod: new Date().toISOString().substring(0, 7) + '-01', // 'YYYY-MM-01'

    loading: false,
    error: null as string | null,
  }),

  actions: {
    // ==================== Expenses ====================

    async fetchExpenses(params?: { category?: string; fromDate?: string; toDate?: string; search?: string; page?: number }) {
      this.loading = true;
      this.error = null;
      try {
        const res = await api.get('/admin/expenses', { params });
        this.expenses = res.data.data;
        this.expenseSummary = res.data.summary;
        this.expenseMeta = res.data.meta;
      } catch (err: any) {
        this.error = err.response?.data?.error?.message || err.message;
      } finally {
        this.loading = false;
      }
    },

    async createExpense(payload: { category: string; amount: number; description?: string; expenseDate: string }) {
      this.loading = true;
      this.error = null;
      try {
        const res = await api.post('/admin/expenses', payload);
        return res.data.data;
      } catch (err: any) {
        const msg = err.response?.data?.error?.message || err.message;
        this.error = msg;
        throw new Error(msg);
      } finally {
        this.loading = false;
      }
    },

    async updateExpense(id: number, payload: Partial<{ category: string; amount: number; description?: string; expenseDate: string }>) {
      this.loading = true;
      this.error = null;
      try {
        const res = await api.put(`/admin/expenses/${id}`, payload);
        return res.data.data;
      } catch (err: any) {
        const msg = err.response?.data?.error?.message || err.message;
        this.error = msg;
        throw new Error(msg);
      } finally {
        this.loading = false;
      }
    },

    async deleteExpense(id: number) {
      this.loading = true;
      this.error = null;
      try {
        const res = await api.delete(`/admin/expenses/${id}`);
        return res.data.data;
      } catch (err: any) {
        const msg = err.response?.data?.error?.message || err.message;
        this.error = msg;
        throw new Error(msg);
      } finally {
        this.loading = false;
      }
    },

    // ==================== Employees ====================

    async fetchEmployees(params?: { status?: string; search?: string; page?: number }) {
      this.loading = true;
      this.error = null;
      try {
        const res = await api.get('/admin/hr/employees', { params });
        this.employees = res.data.data;
        this.employeeSummary = res.data.summary;
        this.employeeMeta = res.data.meta;
      } catch (err: any) {
        this.error = err.response?.data?.error?.message || err.message;
      } finally {
        this.loading = false;
      }
    },

    async fetchEmployeeById(id: number) {
      this.loading = true;
      this.error = null;
      try {
        const res = await api.get(`/admin/hr/employees/${id}`);
        this.currentEmployee = res.data.data;
        return this.currentEmployee;
      } catch (err: any) {
        this.error = err.response?.data?.error?.message || err.message;
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async createEmployee(payload: {
      fullName: string;
      nin?: string;
      phone?: string;
      position?: string;
      hireDate?: string;
      baseSalary: number;
      status?: 'ACTIVE' | 'TERMINATED';
    }) {
      this.loading = true;
      this.error = null;
      try {
        const res = await api.post('/admin/hr/employees', payload);
        return res.data.data;
      } catch (err: any) {
        const msg = err.response?.data?.error?.message || err.message;
        this.error = msg;
        throw new Error(msg);
      } finally {
        this.loading = false;
      }
    },

    async updateEmployee(id: number, payload: Partial<Employee>) {
      this.loading = true;
      this.error = null;
      try {
        const res = await api.put(`/admin/hr/employees/${id}`, payload);
        return res.data.data;
      } catch (err: any) {
        const msg = err.response?.data?.error?.message || err.message;
        this.error = msg;
        throw new Error(msg);
      } finally {
        this.loading = false;
      }
    },

    async deleteEmployee(id: number) {
      this.loading = true;
      this.error = null;
      try {
        const res = await api.delete(`/admin/hr/employees/${id}`);
        return res.data.data;
      } catch (err: any) {
        const msg = err.response?.data?.error?.message || err.message;
        this.error = msg;
        throw new Error(msg);
      } finally {
        this.loading = false;
      }
    },

    // ==================== Salaries / Payroll ====================

    async fetchSalaries(period?: string) {
      this.loading = true;
      this.error = null;
      const targetPeriod = period || this.activePeriod;
      this.activePeriod = targetPeriod;
      try {
        const res = await api.get('/admin/hr/salaries', { params: { period: targetPeriod } });
        const data = res.data.data;
        this.salaries = data.salaries;
        this.payrollSummary = data.summary;
        this.activePeriod = data.period;
      } catch (err: any) {
        this.error = err.response?.data?.error?.message || err.message;
      } finally {
        this.loading = false;
      }
    },

    async generatePayroll(period: string) {
      this.loading = true;
      this.error = null;
      try {
        const res = await api.post('/admin/hr/salaries/generate', { period });
        const data = res.data.data;
        this.salaries = data.salaries;
        this.payrollSummary = data.summary;
        this.activePeriod = data.period;
        return data;
      } catch (err: any) {
        const msg = err.response?.data?.error?.message || err.message;
        this.error = msg;
        throw new Error(msg);
      } finally {
        this.loading = false;
      }
    },

    async updateSalary(salaryId: number, payload: {
      bonus1?: number;
      bonus2?: number;
      deductions?: number;
      paid?: boolean;
      paymentDate?: string;
    }) {
      this.loading = true;
      this.error = null;
      try {
        const res = await api.patch(`/admin/hr/salaries/${salaryId}`, payload);
        const updated = res.data.data;
        const idx = this.salaries.findIndex((s) => s.id === salaryId);
        if (idx !== -1) {
          this.salaries[idx] = { ...this.salaries[idx], ...updated };
        }
        // Recalculate summary totals
        await this.fetchSalaries(this.activePeriod);
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

