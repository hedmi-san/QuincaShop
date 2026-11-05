export type RoleType = 'ADMIN' | 'SUPER_MANAGER' | 'MANAGER' | 'ACCOUNTANT' | 'CLIENT';

export type SaleStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'PARTIALLY_CANCELLED'
  | 'PENDING_PICKUP'
  | 'REJECTED';

export type TransferStatus = 'PENDING' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';

export type ExpenseCategory =
  | 'RENT'
  | 'UTILITIES'
  | 'SALARIES'
  | 'MAINTENANCE'
  | 'SUPPLIES'
  | 'MARKETING'
  | 'TRANSPORT'
  | 'TAXES'
  | 'OTHER';

export type SalaryStatus = 'DRAFT' | 'PAID' | 'CANCELLED';

export type StockMovementType =
  | 'PURCHASE'
  | 'SALE'
  | 'RETURN'
  | 'RESERVATION'
  | 'RELEASE'
  | 'ADJUSTMENT_IN'
  | 'ADJUSTMENT_OUT';

export interface User {
  id: number;
  email: string;
  fullName: string;
  role: RoleType;
  clientId?: number | null;
  clientStatus?: 'PENDING' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED' | null;
}

