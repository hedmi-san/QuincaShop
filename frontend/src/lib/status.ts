export type StatusTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

export interface StatusMeta {
  label: string;
  labelAr: string;
  tone: StatusTone;
}

export const statusMap: Record<string, StatusMeta> = {
  // Client Statuses
  PENDING: { label: 'En attente', labelAr: 'قيد الانتظار', tone: 'warning' },
  ACTIVE: { label: 'Actif', labelAr: 'نشط', tone: 'success' },
  SUSPENDED: { label: 'Suspendu', labelAr: 'معلق', tone: 'danger' },
  REJECTED: { label: 'Rejeté', labelAr: 'مرفوض', tone: 'danger' },

  // Order Statuses
  CONFIRMED: { label: 'Confirmée', labelAr: 'مؤكدة', tone: 'info' },
  PREPARING: { label: 'En préparation', labelAr: 'قيد التحضير', tone: 'warning' },
  READY: { label: 'Prête', labelAr: 'جاهزة', tone: 'success' },
  DELIVERED: { label: 'Livrée', labelAr: 'تم التسليم', tone: 'success' },
  COMPLETED: { label: 'Terminée', labelAr: 'مكتملة', tone: 'success' },
  CANCELLED: { label: 'Annulée', labelAr: 'ملغاة', tone: 'danger' },
  PARTIALLY_CANCELLED: { label: 'Partiellement annulée', labelAr: 'ملغاة جزئياً', tone: 'warning' },
  PENDING_PICKUP: { label: 'À retirer', labelAr: 'جاهز للاستلام', tone: 'info' },

  // Facture / Invoice Statuses
  DRAFT: { label: 'Brouillon', labelAr: 'مسودة', tone: 'neutral' },
  ISSUED: { label: 'Validée', labelAr: 'صادرة', tone: 'success' },
  PAID: { label: 'Payée', labelAr: 'مدفوعة', tone: 'success' },
  PARTIAL: { label: 'Partiellement payée', labelAr: 'مدفوعة جزئياً', tone: 'warning' },
  VOIDED: { label: 'Annulée', labelAr: 'ملغاة', tone: 'danger' },

  // Ledger / Transaction Types
  INVOICE: { label: 'Facture', labelAr: 'فاتورة', tone: 'info' },
  PAYMENT: { label: 'Règlement', labelAr: 'تسديد', tone: 'success' },
  CREDIT_NOTE: { label: 'Avoir', labelAr: 'إشعار دائن', tone: 'warning' },
  ADJUSTMENT: { label: 'Ajustement', labelAr: 'تسوية', tone: 'neutral' },

  // Stock / Catalog Availability
  IN_STOCK: { label: 'En stock', labelAr: 'متوفر في المستودع', tone: 'success' },
  LOW_STOCK: { label: 'Stock limité', labelAr: 'مخزون محدود', tone: 'warning' },
  OUT_OF_STOCK: { label: 'Rupture', labelAr: 'نفذ المخزون', tone: 'danger' },

  // Employee / Payroll Statuses
  INACTIVE: { label: 'Inactif', labelAr: 'غير نشط', tone: 'neutral' },
  ON_LEAVE: { label: 'En congé', labelAr: 'في عطلة', tone: 'warning' },
  TERMINATED: { label: 'Sorti', labelAr: 'مغادر', tone: 'danger' },
};

/**
 * Resolve status metadata safely, defaulting to neutral uppercase presentation if unknown
 */
export function getStatusMeta(rawStatus: string | null | undefined, locale: string = 'fr'): StatusMeta {
  if (!rawStatus) {
    return { label: 'Non renseigné', labelAr: 'غير محدد', tone: 'neutral' };
  }
  const key = rawStatus.toUpperCase().trim();
  const found = statusMap[key];
  if (found) {
    return {
      label: locale === 'ar' ? found.labelAr : found.label,
      labelAr: found.labelAr,
      tone: found.tone,
    };
  }
  return {
    label: rawStatus,
    labelAr: rawStatus,
    tone: 'neutral',
  };
}

