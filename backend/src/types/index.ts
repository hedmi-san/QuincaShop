export type RoleName = 'ADMIN' | 'ACCOUNTANT' | 'CLIENT';
export type RoleType = RoleName | 'SUPER_MANAGER' | 'MANAGER';

export type ClientStatus = 'PENDING' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED';

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

export interface UserContext {
  id: number;
  email: string;
  fullName: string;
  role: RoleName;
  clientId?: number | null;
  clientStatus?: ClientStatus | null;
}
