export type StatusTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

export interface StatusMeta {
  label: string;
  tone: StatusTone;
  labelAr?: string;
}

export const statusMap: Record<string, StatusMeta> = {
  // Client Statuses
  PENDING: { label: 'En attente', tone: 'warning' },
  ACTIVE: { label: 'Actif', tone: 'success' },
  SUSPENDED: { label: 'Suspendu', tone: 'danger' },
  REJECTED: { label: 'Rejeté', tone: 'danger' },

  // Order Statuses
  CONFIRMED: { label: 'Confirmée', tone: 'info' },
  PREPARING: { label: 'En préparation', tone: 'warning' },
  READY: { label: 'Prête', tone: 'success' },
  DELIVERED: { label: 'Livrée', tone: 'success' },
  COMPLETED: { label: 'Terminée', tone: 'success' },
  CANCELLED: { label: 'Annulée', tone: 'danger' },
  PARTIALLY_CANCELLED: { label: 'Partiellement annulée', tone: 'warning' },
  PENDING_PICKUP: { label: 'À retirer', tone: 'info' },

  // Facture / Invoice Statuses
  DRAFT: { label: 'Brouillon', tone: 'neutral' },
  ISSUED: { label: 'Validée', tone: 'success' },
  PAID: { label: 'Payée', tone: 'success' },
  PARTIAL: { label: 'Partiellement payée', tone: 'warning' },
  VOIDED: { label: 'Annulée', tone: 'danger' },

  // Ledger / Transaction Types
  INVOICE: { label: 'Facture', tone: 'info' },
  PAYMENT: { label: 'Règlement', tone: 'success' },
  CREDIT_NOTE: { label: 'Avoir', tone: 'warning' },
  ADJUSTMENT: { label: 'Ajustement', tone: 'neutral' },

  // Stock / Catalog Availability
  IN_STOCK: { label: 'En stock', tone: 'success' },
  LOW_STOCK: { label: 'Stock limité', tone: 'warning' },
  OUT_OF_STOCK: { label: 'Rupture', tone: 'danger' },

  // Employee / Payroll Statuses
  INACTIVE: { label: 'Inactif', tone: 'neutral' },
  ON_LEAVE: { label: 'En congé', tone: 'warning' },
  TERMINATED: { label: 'Sorti', tone: 'danger' },
};

/**
 * Resolve status metadata safely in French, defaulting to neutral uppercase presentation if unknown
 */
export function getStatusMeta(rawStatus: string | null | undefined, _locale?: string): StatusMeta {
  if (!rawStatus) {
    return { label: 'Non renseigné', tone: 'neutral' };
  }
  const key = rawStatus.toUpperCase().trim();
  const found = statusMap[key];
  if (found) {
    return {
      label: found.label,
      tone: found.tone,
    };
  }
  return {
    label: rawStatus,
    tone: 'neutral',
  };
}
